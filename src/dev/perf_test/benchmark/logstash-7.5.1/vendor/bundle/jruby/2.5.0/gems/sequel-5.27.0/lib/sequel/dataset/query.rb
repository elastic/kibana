# frozen-string-literal: true

module Sequel
  class Dataset
    # ---------------------
    # :section: 1 - Methods that return modified datasets
    # These methods all return modified copies of the receiver.
    # ---------------------

    # Hash of extension name symbols to callable objects to load the extension
    # into the Dataset object (usually by extending it with a module defined
    # in the extension).
    EXTENSIONS = {}

    EMPTY_ARRAY = [].freeze

    # The dataset options that require the removal of cached columns if changed.
    COLUMN_CHANGE_OPTS = [:select, :sql, :from, :join].freeze

    # Which options don't affect the SQL generation.  Used by simple_select_all?
    # to determine if this is a simple SELECT * FROM table.
    NON_SQL_OPTIONS = [:server, :graph, :row_proc, :quote_identifiers, :skip_symbol_cache].freeze
    
    # These symbols have _join methods created (e.g. inner_join) that
    # call join_table with the symbol, passing along the arguments and
    # block from the method call.
    CONDITIONED_JOIN_TYPES = [:inner, :full_outer, :right_outer, :left_outer, :full, :right, :left].freeze

    # These symbols have _join methods created (e.g. natural_join).
    # They accept a table argument and options hash which is passed to join_table,
    # and they raise an error if called with a block.
    UNCONDITIONED_JOIN_TYPES = [:natural, :natural_left, :natural_right, :natural_full, :cross].freeze
    
    # All methods that return modified datasets with a joined table added.
    JOIN_METHODS = ((CONDITIONED_JOIN_TYPES + UNCONDITIONED_JOIN_TYPES).map{|x| "#{x}_join".to_sym} + [:join, :join_table]).freeze
    
    # Methods that return modified datasets
    QUERY_METHODS = ((<<-METHS).split.map(&:to_sym) + JOIN_METHODS).freeze
      add_graph_aliases distinct except exclude exclude_having
      filter for_update from from_self graph grep group group_and_count group_append group_by having intersect invert
      limit lock_style naked offset or order order_append order_by order_more order_prepend qualify
      reverse reverse_order select select_all select_append select_group select_more server
      set_graph_aliases unfiltered ungraphed ungrouped union
      unlimited unordered where with with_recursive with_sql
    METHS

    # Register an extension callback for Dataset objects.  ext should be the
    # extension name symbol, and mod should either be a Module that the
    # dataset is extended with, or a callable object called with the database
    # object.  If mod is not provided, a block can be provided and is treated
    # as the mod object.
    #
    # If mod is a module, this also registers a Database extension that will
    # extend all of the database's datasets.
    def self.register_extension(ext, mod=nil, &block)
      if mod
        raise(Error, "cannot provide both mod and block to Dataset.register_extension") if block
        if mod.is_a?(Module)
          block = proc{|ds| ds.extend(mod)}
          Sequel::Database.register_extension(ext){|db| db.extend_datasets(mod)}
        else
          block = mod
        end
      end
      Sequel.synchronize{EXTENSIONS[ext] = block}
    end

    # On Ruby 2.4+, use clone(:freeze=>false) to create clones, because
    # we use true freezing in that case, and we need to modify the opts
    # in the frozen copy.
    #
    # On Ruby <2.4, just use Object#clone directly, since we don't
    # use true freezing as it isn't possible.
    if TRUE_FREEZE
      # Save original clone implementation, as some other methods need
      # to call it internally.
      alias _clone clone
      private :_clone

      # Returns a new clone of the dataset with the given options merged.
      # If the options changed include options in COLUMN_CHANGE_OPTS, the cached
      # columns are deleted.  This method should generally not be called
      # directly by user code.
      def clone(opts = (return self; nil))
        # return self used above because clone is called by almost all
        # other query methods, and it is the fastest approach
        c = super(:freeze=>false)
        c.opts.merge!(opts)
        unless opts.each_key{|o| break if COLUMN_CHANGE_OPTS.include?(o)}
          c.clear_columns_cache
        end
        c.freeze
      end
    else
      # :nocov:
      def clone(opts = OPTS) # :nodoc:
        c = super()
        c.opts.merge!(opts)
        unless opts.each_key{|o| break if COLUMN_CHANGE_OPTS.include?(o)}
          c.clear_columns_cache
        end
        c.opts.freeze
        c
      end
      # :nocov:
    end

    # Returns a copy of the dataset with the SQL DISTINCT clause. The DISTINCT
    # clause is used to remove duplicate rows from the output.  If arguments
    # are provided, uses a DISTINCT ON clause, in which case it will only be
    # distinct on those columns, instead of all returned columns. If a block
    # is given, it is treated as a virtual row block, similar to +where+.
    # Raises an error if arguments are given and DISTINCT ON is not supported.
    #
    #  DB[:items].distinct # SQL: SELECT DISTINCT * FROM items
    #  DB[:items].order(:id).distinct(:id) # SQL: SELECT DISTINCT ON (id) * FROM items ORDER BY id
    #  DB[:items].order(:id).distinct{func(:id)} # SQL: SELECT DISTINCT ON (func(id)) * FROM items ORDER BY id
    #
    # There is support for emualting the DISTINCT ON support in MySQL, but it
    # does not support the ORDER of the dataset, and also doesn't work in many
    # cases if the ONLY_FULL_GROUP_BY sql_mode is used, which is the default on
    # MySQL 5.7.5+.
    def distinct(*args, &block)
      virtual_row_columns(args, block)
      if args.empty?
        cached_dataset(:_distinct_ds){clone(:distinct => EMPTY_ARRAY)}
      else
        raise(InvalidOperation, "DISTINCT ON not supported") unless supports_distinct_on?
        clone(:distinct => args.freeze)
      end
    end

    # Adds an EXCEPT clause using a second dataset object.
    # An EXCEPT compound dataset returns all rows in the current dataset
    # that are not in the given dataset.
    # Raises an +InvalidOperation+ if the operation is not supported.
    # Options:
    # :alias :: Use the given value as the from_self alias
    # :all :: Set to true to use EXCEPT ALL instead of EXCEPT, so duplicate rows can occur
    # :from_self :: Set to false to not wrap the returned dataset in a from_self, use with care.
    #
    #   DB[:items].except(DB[:other_items])
    #   # SELECT * FROM (SELECT * FROM items EXCEPT SELECT * FROM other_items) AS t1
    #
    #   DB[:items].except(DB[:other_items], all: true, from_self: false)
    #   # SELECT * FROM items EXCEPT ALL SELECT * FROM other_items
    #
    #   DB[:items].except(DB[:other_items], alias: :i)
    #   # SELECT * FROM (SELECT * FROM items EXCEPT SELECT * FROM other_items) AS i
    def except(dataset, opts=OPTS)
      raise(InvalidOperation, "EXCEPT not supported") unless supports_intersect_except?
      raise(InvalidOperation, "EXCEPT ALL not supported") if opts[:all] && !supports_intersect_except_all?
      compound_clone(:except, dataset, opts)
    end

    # Performs the inverse of Dataset#where.  Note that if you have multiple filter
    # conditions, this is not the same as a negation of all conditions.
    #
    #   DB[:items].exclude(category: 'software')
    #   # SELECT * FROM items WHERE (category != 'software')
    #   
    #   DB[:items].exclude(category: 'software', id: 3)
    #   # SELECT * FROM items WHERE ((category != 'software') OR (id != 3))
    #
    # Also note that SQL uses 3-valued boolean logic (+true+, +false+, +NULL+), so
    # the inverse of a true condition is a false condition, and will still
    # not match rows that were NULL originally.  If you take the earlier
    # example:
    #
    #   DB[:items].exclude(category: 'software')
    #   # SELECT * FROM items WHERE (category != 'software')
    #
    # Note that this does not match rows where +category+ is +NULL+.  This
    # is because +NULL+ is an unknown value, and you do not know whether
    # or not the +NULL+ category is +software+.  You can explicitly
    # specify how to handle +NULL+ values if you want:
    #
    #   DB[:items].exclude(Sequel.~(category: nil) & {category: 'software'})
    #   # SELECT * FROM items WHERE ((category IS NULL) OR (category != 'software'))
    def exclude(*cond, &block)
      add_filter(:where, cond, true, &block)
    end

    # Inverts the given conditions and adds them to the HAVING clause.
    #
    #   DB[:items].select_group(:name).exclude_having{count(name) < 2}
    #   # SELECT name FROM items GROUP BY name HAVING (count(name) >= 2)
    #
    # See documentation for exclude for how inversion is handled in regards
    # to SQL 3-valued boolean logic.
    def exclude_having(*cond, &block)
      add_filter(:having, cond, true, &block)
    end

    if TRUE_FREEZE
      # Return a clone of the dataset loaded with the given dataset extensions.
      # If no related extension file exists or the extension does not have
      # specific support for Dataset objects, an Error will be raised.
      def extension(*a)
        c = _clone(:freeze=>false)
        c.send(:_extension!, a)
        c.freeze
      end
    else
      # :nocov:
      def extension(*exts) # :nodoc:
        c = clone
        c.send(:_extension!, exts)
        c
      end
      # :nocov:
    end

    # Alias for where.
    def filter(*cond, &block)
      where(*cond, &block)
    end
    
    # Returns a cloned dataset with a :update lock style.
    #
    #   DB[:table].for_update # SELECT * FROM table FOR UPDATE
    def for_update
      cached_dataset(:_for_update_ds){lock_style(:update)}
    end

    # Returns a copy of the dataset with the source changed. If no
    # source is given, removes all tables.  If multiple sources
    # are given, it is the same as using a CROSS JOIN (cartesian product) between all tables.
    # If a block is given, it is treated as a virtual row block, similar to +where+.
    #
    #   DB[:items].from # SQL: SELECT *
    #   DB[:items].from(:blah) # SQL: SELECT * FROM blah
    #   DB[:items].from(:blah, :foo) # SQL: SELECT * FROM blah, foo
    #   DB[:items].from{fun(arg)} # SQL: SELECT * FROM fun(arg)
    def from(*source, &block)
      virtual_row_columns(source, block)
      table_alias_num = 0
      ctes = nil
      source.map! do |s|
        case s
        when Dataset
          if hoist_cte?(s)
            ctes ||= []
            ctes += s.opts[:with]
            s = s.clone(:with=>nil)
          end
          SQL::AliasedExpression.new(s, dataset_alias(table_alias_num+=1))
        when Symbol
          sch, table, aliaz = split_symbol(s)
          if aliaz
            s = sch ? SQL::QualifiedIdentifier.new(sch, table) : SQL::Identifier.new(table)
            SQL::AliasedExpression.new(s, aliaz.to_sym)
          else
            s
          end
        else
          s
        end
      end
      o = {:from=>source.empty? ? nil : source.freeze}
      o[:with] = ((opts[:with] || EMPTY_ARRAY) + ctes).freeze if ctes
      o[:num_dataset_sources] = table_alias_num if table_alias_num > 0
      clone(o)
    end

    # Returns a dataset selecting from the current dataset.
    # Options:
    # :alias :: Controls the alias of the table
    # :column_aliases :: Also aliases columns, using derived column lists.
    #                    Only used in conjunction with :alias.
    #
    #   ds = DB[:items].order(:name).select(:id, :name)
    #   # SELECT id,name FROM items ORDER BY name
    #
    #   ds.from_self
    #   # SELECT * FROM (SELECT id, name FROM items ORDER BY name) AS t1
    #
    #   ds.from_self(alias: :foo)
    #   # SELECT * FROM (SELECT id, name FROM items ORDER BY name) AS foo
    #
    #   ds.from_self(alias: :foo, column_aliases: [:c1, :c2])
    #   # SELECT * FROM (SELECT id, name FROM items ORDER BY name) AS foo(c1, c2)
    def from_self(opts=OPTS)
      fs = {}
      @opts.keys.each{|k| fs[k] = nil unless non_sql_option?(k)}
      pr = proc do
        c = clone(fs).from(opts[:alias] ? as(opts[:alias], opts[:column_aliases]) : self)
        if cols = _columns
          c.send(:columns=, cols)
        end
        c
      end

      opts.empty? ? cached_dataset(:_from_self_ds, &pr) : pr.call
    end

    # Match any of the columns to any of the patterns. The terms can be
    # strings (which use LIKE) or regular expressions if the database supports that.
    # Note that the total number of pattern matches will be
    # Array(columns).length * Array(terms).length,
    # which could cause performance issues.
    #
    # Options (all are boolean):
    #
    # :all_columns :: All columns must be matched to any of the given patterns.
    # :all_patterns :: All patterns must match at least one of the columns.
    # :case_insensitive :: Use a case insensitive pattern match (the default is
    #                      case sensitive if the database supports it).
    #
    # If both :all_columns and :all_patterns are true, all columns must match all patterns.
    #
    # Examples:
    #
    #   dataset.grep(:a, '%test%')
    #   # SELECT * FROM items WHERE (a LIKE '%test%' ESCAPE '\')
    #
    #   dataset.grep([:a, :b], %w'%test% foo')
    #   # SELECT * FROM items WHERE ((a LIKE '%test%' ESCAPE '\') OR (a LIKE 'foo' ESCAPE '\')
    #   #   OR (b LIKE '%test%' ESCAPE '\') OR (b LIKE 'foo' ESCAPE '\'))
    #
    #   dataset.grep([:a, :b], %w'%foo% %bar%', all_patterns: true)
    #   # SELECT * FROM a WHERE (((a LIKE '%foo%' ESCAPE '\') OR (b LIKE '%foo%' ESCAPE '\'))
    #   #   AND ((a LIKE '%bar%' ESCAPE '\') OR (b LIKE '%bar%' ESCAPE '\')))
    #
    #   dataset.grep([:a, :b], %w'%foo% %bar%', all_columns: true)
    #   # SELECT * FROM a WHERE (((a LIKE '%foo%' ESCAPE '\') OR (a LIKE '%bar%' ESCAPE '\'))
    #   #   AND ((b LIKE '%foo%' ESCAPE '\') OR (b LIKE '%bar%' ESCAPE '\')))
    #
    #   dataset.grep([:a, :b], %w'%foo% %bar%', all_patterns: true, all_columns: true)
    #   # SELECT * FROM a WHERE ((a LIKE '%foo%' ESCAPE '\') AND (b LIKE '%foo%' ESCAPE '\')
    #   #   AND (a LIKE '%bar%' ESCAPE '\') AND (b LIKE '%bar%' ESCAPE '\'))
    def grep(columns, patterns, opts=OPTS)
      if opts[:all_patterns]
        conds = Array(patterns).map do |pat|
          SQL::BooleanExpression.new(opts[:all_columns] ? :AND : :OR, *Array(columns).map{|c| SQL::StringExpression.like(c, pat, opts)})
        end
        where(SQL::BooleanExpression.new(opts[:all_patterns] ? :AND : :OR, *conds))
      else
        conds = Array(columns).map do |c|
          SQL::BooleanExpression.new(:OR, *Array(patterns).map{|pat| SQL::StringExpression.like(c, pat, opts)})
        end
        where(SQL::BooleanExpression.new(opts[:all_columns] ? :AND : :OR, *conds))
      end
    end

    # Returns a copy of the dataset with the results grouped by the value of 
    # the given columns.  If a block is given, it is treated
    # as a virtual row block, similar to +where+.
    #
    #   DB[:items].group(:id) # SELECT * FROM items GROUP BY id
    #   DB[:items].group(:id, :name) # SELECT * FROM items GROUP BY id, name
    #   DB[:items].group{[a, sum(b)]} # SELECT * FROM items GROUP BY a, sum(b)
    def group(*columns, &block)
      virtual_row_columns(columns, block)
      clone(:group => (columns.compact.empty? ? nil : columns.freeze))
    end

    # Alias of group
    def group_by(*columns, &block)
      group(*columns, &block)
    end
    
    # Returns a dataset grouped by the given column with count by group.
    # Column aliases may be supplied, and will be included in the select clause.
    # If a block is given, it is treated as a virtual row block, similar to +where+.
    #
    # Examples:
    #
    #   DB[:items].group_and_count(:name).all
    #   # SELECT name, count(*) AS count FROM items GROUP BY name 
    #   # => [{:name=>'a', :count=>1}, ...]
    #
    #   DB[:items].group_and_count(:first_name, :last_name).all
    #   # SELECT first_name, last_name, count(*) AS count FROM items GROUP BY first_name, last_name
    #   # => [{:first_name=>'a', :last_name=>'b', :count=>1}, ...]
    #
    #   DB[:items].group_and_count(Sequel[:first_name].as(:name)).all
    #   # SELECT first_name AS name, count(*) AS count FROM items GROUP BY first_name
    #   # => [{:name=>'a', :count=>1}, ...]
    #
    #   DB[:items].group_and_count{substr(:first_name, 1, 1).as(:initial)}.all
    #   # SELECT substr(first_name, 1, 1) AS initial, count(*) AS count FROM items GROUP BY substr(first_name, 1, 1)
    #   # => [{:initial=>'a', :count=>1}, ...]
    def group_and_count(*columns, &block)
      select_group(*columns, &block).select_append(COUNT_OF_ALL_AS_COUNT)
    end

    # Returns a copy of the dataset with the given columns added to the list of
    # existing columns to group on. If no existing columns are present this
    # method simply sets the columns as the initial ones to group on.
    #
    #   DB[:items].group_append(:b) # SELECT * FROM items GROUP BY b
    #   DB[:items].group(:a).group_append(:b) # SELECT * FROM items GROUP BY a, b
    def group_append(*columns, &block)
      columns = @opts[:group] + columns if @opts[:group]
      group(*columns, &block)
    end

    # Adds the appropriate CUBE syntax to GROUP BY.
    def group_cube
      raise Error, "GROUP BY CUBE not supported on #{db.database_type}" unless supports_group_cube?
      clone(:group_options=>:cube)
    end

    # Adds the appropriate ROLLUP syntax to GROUP BY.
    def group_rollup
      raise Error, "GROUP BY ROLLUP not supported on #{db.database_type}" unless supports_group_rollup?
      clone(:group_options=>:rollup)
    end

    # Adds the appropriate GROUPING SETS syntax to GROUP BY.
    def grouping_sets
      raise Error, "GROUP BY GROUPING SETS not supported on #{db.database_type}" unless supports_grouping_sets?
      clone(:group_options=>:"grouping sets")
    end

    # Returns a copy of the dataset with the HAVING conditions changed. See #where for argument types.
    #
    #   DB[:items].group(:sum).having(sum: 10)
    #   # SELECT * FROM items GROUP BY sum HAVING (sum = 10)
    def having(*cond, &block)
      add_filter(:having, cond, &block)
    end
    
    # Adds an INTERSECT clause using a second dataset object.
    # An INTERSECT compound dataset returns all rows in both the current dataset
    # and the given dataset.
    # Raises an +InvalidOperation+ if the operation is not supported.
    # Options:
    # :alias :: Use the given value as the from_self alias
    # :all :: Set to true to use INTERSECT ALL instead of INTERSECT, so duplicate rows can occur
    # :from_self :: Set to false to not wrap the returned dataset in a from_self, use with care.
    #
    #   DB[:items].intersect(DB[:other_items])
    #   # SELECT * FROM (SELECT * FROM items INTERSECT SELECT * FROM other_items) AS t1
    #
    #   DB[:items].intersect(DB[:other_items], all: true, from_self: false)
    #   # SELECT * FROM items INTERSECT ALL SELECT * FROM other_items
    #
    #   DB[:items].intersect(DB[:other_items], alias: :i)
    #   # SELECT * FROM (SELECT * FROM items INTERSECT SELECT * FROM other_items) AS i
    def intersect(dataset, opts=OPTS)
      raise(InvalidOperation, "INTERSECT not supported") unless supports_intersect_except?
      raise(InvalidOperation, "INTERSECT ALL not supported") if opts[:all] && !supports_intersect_except_all?
      compound_clone(:intersect, dataset, opts)
    end

    # Inverts the current WHERE and HAVING clauses.  If there is neither a
    # WHERE or HAVING clause, adds a WHERE clause that is always false.
    #
    #   DB[:items].where(category: 'software').invert
    #   # SELECT * FROM items WHERE (category != 'software')
    #
    #   DB[:items].where(category: 'software', id: 3).invert
    #   # SELECT * FROM items WHERE ((category != 'software') OR (id != 3))
    #
    # See documentation for exclude for how inversion is handled in regards
    # to SQL 3-valued boolean logic.
    def invert
      cached_dataset(:_invert_ds) do
        having, where = @opts.values_at(:having, :where)
        if having.nil? && where.nil?
          where(false)
        else
          o = {}
          o[:having] = SQL::BooleanExpression.invert(having) if having
          o[:where] = SQL::BooleanExpression.invert(where) if where
          clone(o)
        end
      end
    end

    # Alias of +inner_join+
    def join(*args, &block)
      inner_join(*args, &block)
    end

    # Returns a joined dataset.  Not usually called directly, users should use the
    # appropriate join method (e.g. join, left_join, natural_join, cross_join) which fills
    # in the +type+ argument.
    #
    # Takes the following arguments:
    #
    # type :: The type of join to do (e.g. :inner)
    # table :: table to join into the current dataset.  Generally one of the following types:
    #          String, Symbol :: identifier used as table or view name
    #          Dataset :: a subselect is performed with an alias of tN for some value of N
    #          SQL::Function :: set returning function
    #          SQL::AliasedExpression :: already aliased expression.  Uses given alias unless
    #                                    overridden by the :table_alias option.
    # expr :: conditions used when joining, depends on type:
    #         Hash, Array of pairs :: Assumes key (1st arg) is column of joined table (unless already
    #                                 qualified), and value (2nd arg) is column of the last joined or
    #                                 primary table (or the :implicit_qualifier option).
    #                                 To specify multiple conditions on a single joined table column,
    #                                 you must use an array.  Uses a JOIN with an ON clause.
    #         Array :: If all members of the array are symbols, considers them as columns and 
    #                  uses a JOIN with a USING clause.  Most databases will remove duplicate columns from
    #                  the result set if this is used.
    #         nil :: If a block is not given, doesn't use ON or USING, so the JOIN should be a NATURAL
    #                or CROSS join. If a block is given, uses an ON clause based on the block, see below.
    #         otherwise :: Treats the argument as a filter expression, so strings are considered literal, symbols
    #                      specify boolean columns, and Sequel expressions can be used. Uses a JOIN with an ON clause.
    # options :: a hash of options, with the following keys supported:
    #            :table_alias :: Override the table alias used when joining.  In general you shouldn't use this
    #                            option, you should provide the appropriate SQL::AliasedExpression as the table
    #                            argument.
    #            :implicit_qualifier :: The name to use for qualifying implicit conditions.  By default,
    #                                   the last joined or primary table is used.
    #            :reset_implicit_qualifier :: Can set to false to ignore this join when future joins determine qualifier
    #                                         for implicit conditions.
    #            :qualify :: Can be set to false to not do any implicit qualification.  Can be set
    #                        to :deep to use the Qualifier AST Transformer, which will attempt to qualify
    #                        subexpressions of the expression tree.  Can be set to :symbol to only qualify
    #                        symbols. Defaults to the value of default_join_table_qualification.
    # block :: The block argument should only be given if a JOIN with an ON clause is used,
    #          in which case it yields the table alias/name for the table currently being joined,
    #          the table alias/name for the last joined (or first table), and an array of previous
    #          SQL::JoinClause. Unlike +where+, this block is not treated as a virtual row block.
    #
    # Examples:
    #
    #   DB[:a].join_table(:cross, :b)
    #   # SELECT * FROM a CROSS JOIN b
    #
    #   DB[:a].join_table(:inner, DB[:b], c: d)
    #   # SELECT * FROM a INNER JOIN (SELECT * FROM b) AS t1 ON (t1.c = a.d)
    #
    #   DB[:a].join_table(:left, Sequel[:b].as(:c), [:d])
    #   # SELECT * FROM a LEFT JOIN b AS c USING (d)
    #
    #   DB[:a].natural_join(:b).join_table(:inner, :c) do |ta, jta, js|
    #     (Sequel.qualify(ta, :d) > Sequel.qualify(jta, :e)) & {Sequel.qualify(ta, :f)=>DB.from(js.first.table).select(:g)}
    #   end
    #   # SELECT * FROM a NATURAL JOIN b INNER JOIN c
    #   #   ON ((c.d > b.e) AND (c.f IN (SELECT g FROM b)))
    def join_table(type, table, expr=nil, options=OPTS, &block)
      if hoist_cte?(table)
        s, ds = hoist_cte(table)
        return s.join_table(type, ds, expr, options, &block)
      end

      using_join = expr.is_a?(Array) && !expr.empty? && expr.all?{|x| x.is_a?(Symbol)}
      if using_join && !supports_join_using?
        h = {}
        expr.each{|e| h[e] = e}
        return join_table(type, table, h, options)
      end

      table_alias = options[:table_alias]

      if table.is_a?(SQL::AliasedExpression)
        table_expr = if table_alias
          SQL::AliasedExpression.new(table.expression, table_alias, table.columns)
        else
          table
        end
        table = table_expr.expression
        table_name = table_alias = table_expr.alias
      elsif table.is_a?(Dataset)
        if table_alias.nil?
          table_alias_num = (@opts[:num_dataset_sources] || 0) + 1
          table_alias = dataset_alias(table_alias_num)
        end
        table_name = table_alias
        table_expr = SQL::AliasedExpression.new(table, table_alias)
      else
        table, implicit_table_alias = split_alias(table)
        table_alias ||= implicit_table_alias
        table_name = table_alias || table
        table_expr = table_alias ? SQL::AliasedExpression.new(table, table_alias) : table
      end

      join = if expr.nil? and !block
        SQL::JoinClause.new(type, table_expr)
      elsif using_join
        raise(Sequel::Error, "can't use a block if providing an array of symbols as expr") if block
        SQL::JoinUsingClause.new(expr, type, table_expr)
      else
        last_alias = options[:implicit_qualifier] || @opts[:last_joined_table] || first_source_alias
        qualify_type = options[:qualify]
        if Sequel.condition_specifier?(expr)
          expr = expr.map do |k, v|
            qualify_type = default_join_table_qualification if qualify_type.nil?
            case qualify_type
            when false
              nil # Do no qualification
            when :deep
              k = Sequel::Qualifier.new(table_name).transform(k)
              v = Sequel::Qualifier.new(last_alias).transform(v)
            else
              k = qualified_column_name(k, table_name) if k.is_a?(Symbol)
              v = qualified_column_name(v, last_alias) if v.is_a?(Symbol)
            end
            [k,v]
          end
          expr = SQL::BooleanExpression.from_value_pairs(expr)
        end
        if block
          expr2 = yield(table_name, last_alias, @opts[:join] || EMPTY_ARRAY)
          expr = expr ? SQL::BooleanExpression.new(:AND, expr, expr2) : expr2
        end
        SQL::JoinOnClause.new(expr, type, table_expr)
      end

      opts = {:join => ((@opts[:join] || EMPTY_ARRAY) + [join]).freeze}
      opts[:last_joined_table] = table_name unless options[:reset_implicit_qualifier] == false
      opts[:num_dataset_sources] = table_alias_num if table_alias_num
      clone(opts)
    end
    
    CONDITIONED_JOIN_TYPES.each do |jtype|
      class_eval("def #{jtype}_join(*args, &block); join_table(:#{jtype}, *args, &block) end", __FILE__, __LINE__)
    end
    UNCONDITIONED_JOIN_TYPES.each do |jtype|
      class_eval(<<-END, __FILE__, __LINE__+1)
        def #{jtype}_join(table, opts=Sequel::OPTS)
          raise(Sequel::Error, '#{jtype}_join does not accept join table blocks') if block_given?
          raise(Sequel::Error, '#{jtype}_join 2nd argument should be an options hash, not conditions') unless opts.is_a?(Hash)
          join_table(:#{jtype}, table, nil, opts)
        end
      END
    end

    # Marks this dataset as a lateral dataset.  If used in another dataset's FROM
    # or JOIN clauses, it will surround the subquery with LATERAL to enable it
    # to deal with previous tables in the query:
    #
    #   DB.from(:a, DB[:b].where(Sequel[:a][:c]=>Sequel[:b][:d]).lateral)
    #   # SELECT * FROM a, LATERAL (SELECT * FROM b WHERE (a.c = b.d))
    def lateral
      cached_dataset(:_lateral_ds){clone(:lateral=>true)}
    end

    # If given an integer, the dataset will contain only the first l results.
    # If given a range, it will contain only those at offsets within that
    # range. If a second argument is given, it is used as an offset. To use
    # an offset without a limit, pass nil as the first argument.
    #
    #   DB[:items].limit(10) # SELECT * FROM items LIMIT 10
    #   DB[:items].limit(10, 20) # SELECT * FROM items LIMIT 10 OFFSET 20
    #   DB[:items].limit(10...20) # SELECT * FROM items LIMIT 10 OFFSET 10
    #   DB[:items].limit(10..20) # SELECT * FROM items LIMIT 11 OFFSET 10
    #   DB[:items].limit(nil, 20) # SELECT * FROM items OFFSET 20
    def limit(l, o = (no_offset = true; nil))
      return from_self.limit(l, o) if @opts[:sql]

      if l.is_a?(Range)
        no_offset = false
        o = l.first
        l = l.last - l.first + (l.exclude_end? ? 0 : 1)
      end
      l = l.to_i if l.is_a?(String) && !l.is_a?(LiteralString)
      if l.is_a?(Integer)
        raise(Error, 'Limits must be greater than or equal to 1') unless l >= 1
      end

      ds = clone(:limit=>l)
      ds = ds.offset(o) unless no_offset
      ds
    end
    
    # Returns a cloned dataset with the given lock style.  If style is a
    # string, it will be used directly. You should never pass a string
    # to this method that is derived from user input, as that can lead to
    # SQL injection.
    #
    # A symbol may be used for database independent locking behavior, but
    # all supported symbols have separate methods (e.g. for_update).
    #
    #   DB[:items].lock_style('FOR SHARE NOWAIT')
    #   # SELECT * FROM items FOR SHARE NOWAIT
    #   DB[:items].lock_style('FOR UPDATE OF table1 SKIP LOCKED')
    #   # SELECT * FROM items FOR UPDATE OF table1 SKIP LOCKED
    def lock_style(style)
      clone(:lock => style)
    end
    
    # Returns a cloned dataset without a row_proc.
    #
    #   ds = DB[:items].with_row_proc(:invert.to_proc)
    #   ds.all # => [{2=>:id}]
    #   ds.naked.all # => [{:id=>2}]
    def naked
      cached_dataset(:_naked_ds){with_row_proc(nil)}
    end

    # Returns a copy of the dataset that will raise a DatabaseLockTimeout instead
    # of waiting for rows that are locked by another transaction
    #
    #   DB[:items].for_update.nowait
    #   # SELECT * FROM items FOR UPDATE NOWAIT
    def nowait
      cached_dataset(:_nowait_ds) do
        raise(Error, 'This dataset does not support raises errors instead of waiting for locked rows') unless supports_nowait?
        clone(:nowait=>true)
      end
    end

    # Returns a copy of the dataset with a specified order. Can be safely combined with limit.
    # If you call limit with an offset, it will override override the offset if you've called
    # offset first.
    #
    #   DB[:items].offset(10) # SELECT * FROM items OFFSET 10
    def offset(o)
      o = o.to_i if o.is_a?(String) && !o.is_a?(LiteralString)
      if o.is_a?(Integer)
        raise(Error, 'Offsets must be greater than or equal to 0') unless o >= 0
      end
      clone(:offset => o)
    end
    
    # Adds an alternate filter to an existing WHERE clause using OR.  If there 
    # is no WHERE clause, then the default is WHERE true, and OR would be redundant,
    # so return the dataset in that case.
    #
    #   DB[:items].where(:a).or(:b) # SELECT * FROM items WHERE a OR b
    #   DB[:items].or(:b) # SELECT * FROM items
    def or(*cond, &block)
      if @opts[:where].nil?
        self
      else
        add_filter(:where, cond, false, :OR, &block)
      end
    end

    # Returns a copy of the dataset with the order changed. If the dataset has an
    # existing order, it is ignored and overwritten with this order. If a nil is given
    # the returned dataset has no order. This can accept multiple arguments
    # of varying kinds, such as SQL functions.  If a block is given, it is treated
    # as a virtual row block, similar to +where+.
    #
    #   DB[:items].order(:name) # SELECT * FROM items ORDER BY name
    #   DB[:items].order(:a, :b) # SELECT * FROM items ORDER BY a, b
    #   DB[:items].order(Sequel.lit('a + b')) # SELECT * FROM items ORDER BY a + b
    #   DB[:items].order(Sequel[:a] + :b) # SELECT * FROM items ORDER BY (a + b)
    #   DB[:items].order(Sequel.desc(:name)) # SELECT * FROM items ORDER BY name DESC
    #   DB[:items].order(Sequel.asc(:name, :nulls=>:last)) # SELECT * FROM items ORDER BY name ASC NULLS LAST
    #   DB[:items].order{sum(name).desc} # SELECT * FROM items ORDER BY sum(name) DESC
    #   DB[:items].order(nil) # SELECT * FROM items
    def order(*columns, &block)
      virtual_row_columns(columns, block)
      clone(:order => (columns.compact.empty?) ? nil : columns.freeze)
    end
    
    # Returns a copy of the dataset with the order columns added
    # to the end of the existing order.
    #
    #   DB[:items].order(:a).order(:b) # SELECT * FROM items ORDER BY b
    #   DB[:items].order(:a).order_append(:b) # SELECT * FROM items ORDER BY a, b
    def order_append(*columns, &block)
      columns = @opts[:order] + columns if @opts[:order]
      order(*columns, &block)
    end

    # Alias of order
    def order_by(*columns, &block)
      order(*columns, &block)
    end

    # Alias of order_append.
    def order_more(*columns, &block)
      order_append(*columns, &block)
    end
    
    # Returns a copy of the dataset with the order columns added
    # to the beginning of the existing order.
    #
    #   DB[:items].order(:a).order(:b) # SELECT * FROM items ORDER BY b
    #   DB[:items].order(:a).order_prepend(:b) # SELECT * FROM items ORDER BY b, a
    def order_prepend(*columns, &block)
      ds = order(*columns, &block)
      @opts[:order] ? ds.order_append(*@opts[:order]) : ds
    end
    
    # Qualify to the given table, or first source if no table is given.
    #
    #   DB[:items].where(id: 1).qualify
    #   # SELECT items.* FROM items WHERE (items.id = 1)
    #
    #   DB[:items].where(id: 1).qualify(:i)
    #   # SELECT i.* FROM items WHERE (i.id = 1)
    def qualify(table=(cache=true; first_source))
      o = @opts
      return self if o[:sql]

      pr = proc do
        h = {}
        (o.keys & QUALIFY_KEYS).each do |k|
          h[k] = qualified_expression(o[k], table)
        end
        h[:select] = [SQL::ColumnAll.new(table)].freeze if !o[:select] || o[:select].empty?
        clone(h)
      end

      cache ? cached_dataset(:_qualify_ds, &pr) : pr.call
    end

    # Modify the RETURNING clause, only supported on a few databases.  If returning
    # is used, instead of insert returning the autogenerated primary key or
    # update/delete returning the number of modified rows, results are
    # returned using +fetch_rows+.
    #
    #   DB[:items].returning # RETURNING *
    #   DB[:items].returning(nil) # RETURNING NULL
    #   DB[:items].returning(:id, :name) # RETURNING id, name
    #
    #   DB[:items].returning.insert(:a=>1) do |hash|
    #     # hash for each row inserted, with values for all columns
    #   end
    #   DB[:items].returning.update(:a=>1) do |hash|
    #     # hash for each row updated, with values for all columns
    #   end
    #   DB[:items].returning.delete(:a=>1) do |hash|
    #     # hash for each row deleted, with values for all columns
    #   end
    def returning(*values)
      if values.empty?
        cached_dataset(:_returning_ds) do
          raise Error, "RETURNING is not supported on #{db.database_type}" unless supports_returning?(:insert)
          clone(:returning=>EMPTY_ARRAY)
        end
      else
        raise Error, "RETURNING is not supported on #{db.database_type}" unless supports_returning?(:insert)
        clone(:returning=>values.freeze)
      end
    end

    # Returns a copy of the dataset with the order reversed. If no order is
    # given, the existing order is inverted.
    #
    #   DB[:items].reverse(:id) # SELECT * FROM items ORDER BY id DESC
    #   DB[:items].reverse{foo(bar)} # SELECT * FROM items ORDER BY foo(bar) DESC
    #   DB[:items].order(:id).reverse # SELECT * FROM items ORDER BY id DESC
    #   DB[:items].order(:id).reverse(Sequel.desc(:name)) # SELECT * FROM items ORDER BY name ASC
    def reverse(*order, &block)
      if order.empty? && !block
        cached_dataset(:_reverse_ds){order(*invert_order(@opts[:order]))}
      else
        virtual_row_columns(order, block)
        order(*invert_order(order.empty? ? @opts[:order] : order.freeze))
      end
    end

    # Alias of +reverse+
    def reverse_order(*order, &block)
      reverse(*order, &block)
    end

    # Returns a copy of the dataset with the columns selected changed
    # to the given columns. This also takes a virtual row block,
    # similar to +where+.
    #
    #   DB[:items].select(:a) # SELECT a FROM items
    #   DB[:items].select(:a, :b) # SELECT a, b FROM items
    #   DB[:items].select{[a, sum(b)]} # SELECT a, sum(b) FROM items
    def select(*columns, &block)
      virtual_row_columns(columns, block)
      clone(:select => columns.freeze)
    end
    
    # Returns a copy of the dataset selecting the wildcard if no arguments
    # are given.  If arguments are given, treat them as tables and select
    # all columns (using the wildcard) from each table.
    #
    #   DB[:items].select(:a).select_all # SELECT * FROM items
    #   DB[:items].select_all(:items) # SELECT items.* FROM items
    #   DB[:items].select_all(:items, :foo) # SELECT items.*, foo.* FROM items
    def select_all(*tables)
      if tables.empty?
        cached_dataset(:_select_all_ds){clone(:select => nil)}
      else
        select(*tables.map{|t| i, a = split_alias(t); a || i}.map!{|t| SQL::ColumnAll.new(t)}.freeze)
      end
    end
    
    # Returns a copy of the dataset with the given columns added
    # to the existing selected columns.  If no columns are currently selected,
    # it will select the columns given in addition to *.
    #
    #   DB[:items].select(:a).select(:b) # SELECT b FROM items
    #   DB[:items].select(:a).select_append(:b) # SELECT a, b FROM items
    #   DB[:items].select_append(:b) # SELECT *, b FROM items
    def select_append(*columns, &block)
      cur_sel = @opts[:select]
      if !cur_sel || cur_sel.empty?
        unless supports_select_all_and_column?
          return select_all(*(Array(@opts[:from]) + Array(@opts[:join]))).select_append(*columns, &block)
        end
        cur_sel = [WILDCARD]
      end
      select(*(cur_sel + columns), &block)
    end

    # Set both the select and group clauses with the given +columns+.
    # Column aliases may be supplied, and will be included in the select clause.
    # This also takes a virtual row block similar to +where+.
    #
    #   DB[:items].select_group(:a, :b)
    #   # SELECT a, b FROM items GROUP BY a, b
    #
    #   DB[:items].select_group(Sequel[:c].as(:a)){f(c2)}
    #   # SELECT c AS a, f(c2) FROM items GROUP BY c, f(c2)
    def select_group(*columns, &block)
      virtual_row_columns(columns, block)
      select(*columns).group(*columns.map{|c| unaliased_identifier(c)})
    end

    # Alias for select_append. 
    def select_more(*columns, &block)
      select_append(*columns, &block)
    end
    
    # Set the server for this dataset to use.  Used to pick a specific database
    # shard to run a query against, or to override the default (where SELECT uses
    # :read_only database and all other queries use the :default database).  This
    # method is always available but is only useful when database sharding is being
    # used.
    #
    #   DB[:items].all # Uses the :read_only or :default server 
    #   DB[:items].delete # Uses the :default server
    #   DB[:items].server(:blah).delete # Uses the :blah server
    def server(servr)
      clone(:server=>servr)
    end

    # If the database uses sharding and the current dataset has not had a
    # server set, return a cloned dataset that uses the given server.
    # Otherwise, return the receiver directly instead of returning a clone.
    def server?(server)
      if db.sharded? && !opts[:server]
        server(server)
      else
        self
      end
    end

    # Specify that the check for limits/offsets when updating/deleting be skipped for the dataset.
    def skip_limit_check
      cached_dataset(:_skip_limit_check_ds) do
        clone(:skip_limit_check=>true)
      end
    end

    # Skip locked rows when returning results from this dataset.
    def skip_locked
      cached_dataset(:_skip_locked_ds) do
        raise(Error, 'This dataset does not support skipping locked rows') unless supports_skip_locked?
        clone(:skip_locked=>true)
      end
    end

    # Returns a copy of the dataset with no filters (HAVING or WHERE clause) applied.
    # 
    #   DB[:items].group(:a).having(a: 1).where(:b).unfiltered
    #   # SELECT * FROM items GROUP BY a
    def unfiltered
      cached_dataset(:_unfiltered_ds){clone(:where => nil, :having => nil)}
    end

    # Returns a copy of the dataset with no grouping (GROUP or HAVING clause) applied.
    # 
    #   DB[:items].group(:a).having(a: 1).where(:b).ungrouped
    #   # SELECT * FROM items WHERE b
    def ungrouped
      cached_dataset(:_ungrouped_ds){clone(:group => nil, :having => nil)}
    end

    # Adds a UNION clause using a second dataset object.
    # A UNION compound dataset returns all rows in either the current dataset
    # or the given dataset.
    # Options:
    # :alias :: Use the given value as the from_self alias
    # :all :: Set to true to use UNION ALL instead of UNION, so duplicate rows can occur
    # :from_self :: Set to false to not wrap the returned dataset in a from_self, use with care.
    #
    #   DB[:items].union(DB[:other_items])
    #   # SELECT * FROM (SELECT * FROM items UNION SELECT * FROM other_items) AS t1
    #
    #   DB[:items].union(DB[:other_items], all: true, from_self: false)
    #   # SELECT * FROM items UNION ALL SELECT * FROM other_items
    #
    #   DB[:items].union(DB[:other_items], alias: :i)
    #   # SELECT * FROM (SELECT * FROM items UNION SELECT * FROM other_items) AS i
    def union(dataset, opts=OPTS)
      compound_clone(:union, dataset, opts)
    end
    
    # Returns a copy of the dataset with no limit or offset.
    # 
    #   DB[:items].limit(10, 20).unlimited # SELECT * FROM items
    def unlimited
      cached_dataset(:_unlimited_ds){clone(:limit=>nil, :offset=>nil)}
    end

    # Returns a copy of the dataset with no order.
    # 
    #   DB[:items].order(:a).unordered # SELECT * FROM items
    def unordered
      cached_dataset(:_unordered_ds){clone(:order=>nil)}
    end
    
    # Returns a copy of the dataset with the given WHERE conditions imposed upon it.  
    # 
    # Accepts the following argument types:
    #
    # Hash, Array of pairs :: list of equality/inclusion expressions
    # Symbol :: taken as a boolean column argument (e.g. WHERE active)
    # Sequel::SQL::BooleanExpression, Sequel::LiteralString :: an existing condition expression, probably created
    #                                                          using the Sequel expression filter DSL.
    #
    # where also accepts a block, which should return one of the above argument
    # types, and is treated the same way.  This block yields a virtual row object,
    # which is easy to use to create identifiers and functions.  For more details
    # on the virtual row support, see the {"Virtual Rows" guide}[rdoc-ref:doc/virtual_rows.rdoc]
    #
    # If both a block and regular argument are provided, they get ANDed together.
    #
    # Examples:
    #
    #   DB[:items].where(id: 3)
    #   # SELECT * FROM items WHERE (id = 3)
    #
    #   DB[:items].where(Sequel.lit('price < ?', 100))
    #   # SELECT * FROM items WHERE price < 100
    #
    #   DB[:items].where([[:id, [1,2,3]], [:id, 0..10]])
    #   # SELECT * FROM items WHERE ((id IN (1, 2, 3)) AND ((id >= 0) AND (id <= 10)))
    #
    #   DB[:items].where(Sequel.lit('price < 100'))
    #   # SELECT * FROM items WHERE price < 100
    #
    #   DB[:items].where(:active)
    #   # SELECT * FROM items WHERE :active
    #
    #   DB[:items].where{price < 100}
    #   # SELECT * FROM items WHERE (price < 100)
    # 
    # Multiple where calls can be chained for scoping:
    #
    #   software = dataset.where(category: 'software').where{price < 100}
    #   # SELECT * FROM items WHERE ((category = 'software') AND (price < 100))
    #
    # See the {"Dataset Filtering" guide}[rdoc-ref:doc/dataset_filtering.rdoc] for more examples and details.
    def where(*cond, &block)
      add_filter(:where, cond, &block)
    end
    
    # Return a clone of the dataset with an addition named window that can be
    # referenced in window functions. See Sequel::SQL::Window for a list of
    # options that can be passed in. Example:
    #
    #   DB[:items].window(:w, :partition=>:c1, :order=>:c2)
    #   # SELECT * FROM items WINDOW w AS (PARTITION BY c1 ORDER BY c2)
    def window(name, opts)
      clone(:window=>((@opts[:window]||EMPTY_ARRAY) + [[name, SQL::Window.new(opts)].freeze]).freeze)
    end

    # Add a common table expression (CTE) with the given name and a dataset that defines the CTE.
    # A common table expression acts as an inline view for the query.
    # Options:
    # :args :: Specify the arguments/columns for the CTE, should be an array of symbols.
    # :recursive :: Specify that this is a recursive CTE
    #
    # PostgreSQL Specific Options:
    # :materialized :: Set to false to force inlining of the CTE, or true to force not inlining
    #                  the CTE (PostgreSQL 12+).
    #
    #   DB[:items].with(:items, DB[:syx].where(Sequel[:name].like('A%')))
    #   # WITH items AS (SELECT * FROM syx WHERE (name LIKE 'A%' ESCAPE '\')) SELECT * FROM items
    def with(name, dataset, opts=OPTS)
      raise(Error, 'This dataset does not support common table expressions') unless supports_cte?
      if hoist_cte?(dataset)
        s, ds = hoist_cte(dataset)
        s.with(name, ds, opts)
      else
        clone(:with=>((@opts[:with]||EMPTY_ARRAY) + [Hash[opts].merge!(:name=>name, :dataset=>dataset)]).freeze)
      end
    end

    # Add a recursive common table expression (CTE) with the given name, a dataset that
    # defines the nonrecursive part of the CTE, and a dataset that defines the recursive part
    # of the CTE.  Options:
    # :args :: Specify the arguments/columns for the CTE, should be an array of symbols.
    # :union_all :: Set to false to use UNION instead of UNION ALL combining the nonrecursive and recursive parts.
    #
    #   DB[:t].with_recursive(:t,
    #     DB[:i1].select(:id, :parent_id).where(parent_id: nil),
    #     DB[:i1].join(:t, id: :parent_id).select(Sequel[:i1][:id], Sequel[:i1][:parent_id]),
    #     :args=>[:id, :parent_id])
    #   
    #   # WITH RECURSIVE t(id, parent_id) AS (
    #   #   SELECT id, parent_id FROM i1 WHERE (parent_id IS NULL)
    #   #   UNION ALL
    #   #   SELECT i1.id, i1.parent_id FROM i1 INNER JOIN t ON (t.id = i1.parent_id)
    #   # ) SELECT * FROM t
    def with_recursive(name, nonrecursive, recursive, opts=OPTS)
      raise(Error, 'This dataset does not support common table expressions') unless supports_cte?
      if hoist_cte?(nonrecursive)
        s, ds = hoist_cte(nonrecursive)
        s.with_recursive(name, ds, recursive, opts)
      elsif hoist_cte?(recursive)
        s, ds = hoist_cte(recursive)
        s.with_recursive(name, nonrecursive, ds, opts)
      else
        clone(:with=>((@opts[:with]||EMPTY_ARRAY) + [Hash[opts].merge!(:recursive=>true, :name=>name, :dataset=>nonrecursive.union(recursive, {:all=>opts[:union_all] != false, :from_self=>false}))]).freeze)
      end
    end
    
    if TRUE_FREEZE
      # Return a clone of the dataset extended with the given modules.
      # Note that like Object#extend, when multiple modules are provided
      # as arguments the cloned dataset is extended with the modules in reverse
      # order.  If a block is provided, a DatasetModule is created using the block and
      # the clone is extended with that module after any modules given as arguments.
      def with_extend(*mods, &block)
        c = _clone(:freeze=>false)
        c.extend(*mods) unless mods.empty?
        c.extend(DatasetModule.new(&block)) if block
        c.freeze
      end
    else
      # :nocov:
      def with_extend(*mods, &block) # :nodoc:
        c = clone
        c.extend(*mods) unless mods.empty?
        c.extend(DatasetModule.new(&block)) if block
        c
      end
      # :nocov:
    end

    # Returns a cloned dataset with the given row_proc.
    #
    #   ds = DB[:items]
    #   ds.all # => [{:id=>2}]
    #   ds.with_row_proc(:invert.to_proc).all # => [{2=>:id}]
    def with_row_proc(callable)
      clone(:row_proc=>callable)
    end

    # Returns a copy of the dataset with the static SQL used.  This is useful if you want
    # to keep the same row_proc/graph, but change the SQL used to custom SQL.
    #
    #   DB[:items].with_sql('SELECT * FROM foo') # SELECT * FROM foo
    #
    # You can use placeholders in your SQL and provide arguments for those placeholders:
    #
    #   DB[:items].with_sql('SELECT ? FROM foo', 1) # SELECT 1 FROM foo
    #
    # You can also provide a method name and arguments to call to get the SQL:
    #
    #   DB[:items].with_sql(:insert_sql, :b=>1) # INSERT INTO items (b) VALUES (1)
    #
    # Note that datasets that specify custom SQL using this method will generally
    # ignore future dataset methods that modify the SQL used, as specifying custom SQL
    # overrides Sequel's SQL generator.  You should probably limit yourself to the following
    # dataset methods when using this method, or use the implicit_subquery extension:
    #
    # * each
    # * all
    # * single_record (if only one record could be returned)
    # * single_value (if only one record could be returned, and a single column is selected)
    # * map
    # * as_hash
    # * to_hash
    # * to_hash_groups
    # * delete (if a DELETE statement)
    # * update (if an UPDATE statement, with no arguments)
    # * insert (if an INSERT statement, with no arguments)
    # * truncate (if a TRUNCATE statement, with no arguments)
    def with_sql(sql, *args)
      if sql.is_a?(Symbol)
        sql = public_send(sql, *args)
      else
        sql = SQL::PlaceholderLiteralString.new(sql, args) unless args.empty?
      end
      clone(:sql=>sql)
    end
    
    protected

    # Add the dataset to the list of compounds
    def compound_clone(type, dataset, opts)
      if dataset.is_a?(Dataset) && dataset.opts[:with] && !supports_cte_in_compounds?
        s, ds = hoist_cte(dataset)
        return s.compound_clone(type, ds, opts)
      end
      ds = compound_from_self.clone(:compounds=>(Array(@opts[:compounds]).map(&:dup) + [[type, dataset.compound_from_self, opts[:all]].freeze]).freeze)
      opts[:from_self] == false ? ds : ds.from_self(opts)
    end

    # Return true if the dataset has a non-nil value for any key in opts.
    def options_overlap(opts)
      !(@opts.map{|k,v| k unless v.nil?}.compact & opts).empty?
    end

    # From types allowed to be considered a simple_select_all
    SIMPLE_SELECT_ALL_ALLOWED_FROM = [Symbol, SQL::Identifier, SQL::QualifiedIdentifier].freeze

    # Whether this dataset is a simple select from an underlying table, such as:
    #
    #   SELECT * FROM table
    #   SELECT table.* FROM table
    def simple_select_all?
      return false unless (f = @opts[:from]) && f.length == 1
      o = @opts.reject{|k,v| v.nil? || non_sql_option?(k)}
      from = f.first
      from = from.expression if from.is_a?(SQL::AliasedExpression)

      if SIMPLE_SELECT_ALL_ALLOWED_FROM.any?{|x| from.is_a?(x)}
        case o.length
        when 1
          true
        when 2
          (s = o[:select]) && s.length == 1 && s.first.is_a?(SQL::ColumnAll)
        else
          false
        end
      else
        false
      end
    end

    private

    # Load the extensions into the receiver, without checking if the receiver is frozen.
    def _extension!(exts)
      Sequel.extension(*exts)
      exts.each do |ext|
        if pr = Sequel.synchronize{EXTENSIONS[ext]}
          pr.call(self)
        else
          raise(Error, "Extension #{ext} does not have specific support handling individual datasets (try: Sequel.extension #{ext.inspect})")
        end
      end
      self
    end

    def add_filter(clause, cond, invert=false, combine=:AND, &block)
      if cond == EMPTY_ARRAY && !block
        raise Error, "must provide an argument to a filtering method if not passing a block"
      end
      
      cond = cond.first if cond.size == 1

      empty = cond == OPTS || cond == EMPTY_ARRAY

      if empty && !block
        self 
      else
        if cond == nil
          cond = Sequel::NULL
        end
        if empty && block
          cond = nil
        end

        cond = filter_expr(cond, &block)
        cond = SQL::BooleanExpression.invert(cond) if invert
        cond = SQL::BooleanExpression.new(combine, @opts[clause], cond) if @opts[clause]

        if cond.nil?
          cond = Sequel::NULL
        end

        clone(clause => cond)
      end
    end

    # The default :qualify option to use for join tables if one is not specified.
    def default_join_table_qualification
      :symbol
    end
    
    # SQL expression object based on the expr type.  See +where+.
    def filter_expr(expr = nil, &block)
      expr = nil if expr == EMPTY_ARRAY

      if block
        cond = filter_expr(Sequel.virtual_row(&block))
        cond = SQL::BooleanExpression.new(:AND, filter_expr(expr), cond) if expr
        return cond
      end

      case expr
      when Hash
        SQL::BooleanExpression.from_value_pairs(expr)
      when Array
        if Sequel.condition_specifier?(expr)
          SQL::BooleanExpression.from_value_pairs(expr)
        else
          raise Error, "Invalid filter expression: #{expr.inspect}"
        end
      when LiteralString
        LiteralString.new("(#{expr})")
      when Numeric, SQL::NumericExpression, SQL::StringExpression, Proc, String
        raise Error, "Invalid filter expression: #{expr.inspect}"
      when TrueClass, FalseClass
        if supports_where_true?
          SQL::BooleanExpression.new(:NOOP, expr)
        elsif expr
          SQL::Constants::SQLTRUE
        else
          SQL::Constants::SQLFALSE
        end
      when PlaceholderLiteralizer::Argument
        expr.transform{|v| filter_expr(v)}
      when SQL::PlaceholderLiteralString
        expr.with_parens
      else
        expr
      end
    end
    
    # Return two datasets, the first a clone of the receiver with the WITH
    # clause from the given dataset added to it, and the second a clone of
    # the given dataset with the WITH clause removed.
    def hoist_cte(ds)
      [clone(:with => ((opts[:with] || EMPTY_ARRAY) + ds.opts[:with]).freeze), ds.clone(:with => nil)]
    end

    # Whether CTEs need to be hoisted from the given ds into the current ds.
    def hoist_cte?(ds)
      ds.is_a?(Dataset) && ds.opts[:with] && !supports_cte_in_subqueries?
    end

    # Inverts the given order by breaking it into a list of column references
    # and inverting them.
    #
    #   DB[:items].invert_order([Sequel.desc(:id)]]) #=> [Sequel.asc(:id)]
    #   DB[:items].invert_order([:category, Sequel.desc(:price)]) #=> [Sequel.desc(:category), Sequel.asc(:price)]
    def invert_order(order)
      return unless order
      order.map do |f|
        case f
        when SQL::OrderedExpression
          f.invert
        else
          SQL::OrderedExpression.new(f)
        end
      end
    end

    # Return self if the dataset already has a server, or a cloned dataset with the
    # default server otherwise.
    def default_server
      server?(:default)
    end

    # Whether the given option key does not affect the generated SQL.
    def non_sql_option?(key)
      NON_SQL_OPTIONS.include?(key)
    end

    # Treat the +block+ as a virtual_row block if not +nil+ and
    # add the resulting columns to the +columns+ array (modifies +columns+).
    def virtual_row_columns(columns, block)
      if block
        v = Sequel.virtual_row(&block)
        if v.is_a?(Array)
          columns.concat(v)
        else
          columns << v
        end
      end
    end
  end
end
