# frozen-string-literal: true

module Sequel
  class Dataset
    # ---------------------
    # :section: 5 - Methods related to dataset graphing
    # Dataset graphing automatically creates unique aliases columns in join
    # tables that overlap with already selected column aliases. 
    # All of these methods return modified copies of the receiver.
    # ---------------------
    
    # Adds the given graph aliases to the list of graph aliases to use,
    # unlike +set_graph_aliases+, which replaces the list (the equivalent
    # of +select_append+ when graphing).  See +set_graph_aliases+.
    #
    #   DB[:table].add_graph_aliases(some_alias: [:table, :column])
    #   # SELECT ..., table.column AS some_alias
    def add_graph_aliases(graph_aliases)
      graph = opts[:graph]
      unless (graph && (ga = graph[:column_aliases]))
        raise Error, "cannot call add_graph_aliases on a dataset that has not been called with graph or set_graph_aliases"
      end
      columns, graph_aliases = graph_alias_columns(graph_aliases)
      select_append(*columns).clone(:graph => graph.merge(:column_aliases=>ga.merge(graph_aliases).freeze).freeze)
    end

    # Similar to Dataset#join_table, but uses unambiguous aliases for selected
    # columns and keeps metadata about the aliases for use in other methods.
    #
    # Arguments:
    # dataset :: Can be a symbol (specifying a table), another dataset,
    #            or an SQL::Identifier, SQL::QualifiedIdentifier, or SQL::AliasedExpression.
    # join_conditions :: Any condition(s) allowed by +join_table+.
    # block :: A block that is passed to +join_table+.
    #
    # Options:
    # :from_self_alias :: The alias to use when the receiver is not a graphed
    #                     dataset but it contains multiple FROM tables or a JOIN.  In this case,
    #                     the receiver is wrapped in a from_self before graphing, and this option
    #                     determines the alias to use.
    # :implicit_qualifier :: The qualifier of implicit conditions, see #join_table.
    # :join_only :: Only join the tables, do not change the selected columns.
    # :join_type :: The type of join to use (passed to +join_table+).  Defaults to :left_outer.
    # :qualify:: The type of qualification to do, see #join_table.
    # :select :: An array of columns to select.  When not used, selects
    #            all columns in the given dataset.  When set to false, selects no
    #            columns and is like simply joining the tables, though graph keeps
    #            some metadata about the join that makes it important to use +graph+ instead
    #            of +join_table+.
    # :table_alias :: The alias to use for the table.  If not specified, doesn't
    #                 alias the table.  You will get an error if the alias (or table) name is
    #                 used more than once.
    def graph(dataset, join_conditions = nil, options = OPTS, &block)
      # Allow the use of a dataset or symbol as the first argument
      # Find the table name/dataset based on the argument
      table_alias = options[:table_alias]
      table = dataset
      create_dataset = true

      case dataset
      when Symbol
        # let alias be the same as the table name (sans any optional schema)
        # unless alias explicitly given in the symbol using ___ notation and symbol splitting is enabled
        table_alias ||= split_symbol(table).compact.last
      when Dataset
        if dataset.simple_select_all?
          table = dataset.opts[:from].first
          table_alias ||= table
        else
          table_alias ||= dataset_alias((@opts[:num_dataset_sources] || 0)+1)
        end
        create_dataset = false
      when SQL::Identifier
        table_alias ||= table.value
      when SQL::QualifiedIdentifier
        table_alias ||= split_qualifiers(table).last
      when SQL::AliasedExpression
        return graph(table.expression, join_conditions, {:table_alias=>table.alias}.merge!(options), &block)
      else
        raise Error, "The dataset argument should be a symbol or dataset"
      end
      table_alias = table_alias.to_sym

      if create_dataset
        dataset = db.from(table)
      end

      # Raise Sequel::Error with explanation that the table alias has been used
      raise_alias_error = lambda do
        raise(Error, "this #{options[:table_alias] ? 'alias' : 'table'} has already been been used, please specify " \
          "#{options[:table_alias] ? 'a different alias' : 'an alias via the :table_alias option'}") 
      end

      # Only allow table aliases that haven't been used
      raise_alias_error.call if @opts[:graph] && @opts[:graph][:table_aliases] && @opts[:graph][:table_aliases].include?(table_alias)
      
      table_alias_qualifier = qualifier_from_alias_symbol(table_alias, table)
      implicit_qualifier = options[:implicit_qualifier]
      joined_dataset = joined_dataset?
      ds = self
      graph = opts[:graph]

      if !graph && (select = @opts[:select]) && !select.empty?
        select_columns = nil

        unless !joined_dataset && select.length == 1 && (select[0].is_a?(SQL::ColumnAll))
          force_from_self = false
          select_columns = select.map do |sel|
            unless col = _hash_key_symbol(sel)
              force_from_self = true
              break
            end

            [sel, col]
          end

          select_columns = nil if force_from_self
        end
      end

      # Use a from_self if this is already a joined table (or from_self specifically disabled for graphs)
      if (@opts[:graph_from_self] != false && !graph && (joined_dataset || force_from_self))
        from_selfed = true
        implicit_qualifier = options[:from_self_alias] || first_source
        ds = ds.from_self(:alias=>implicit_qualifier)
      end
      
      # Join the table early in order to avoid cloning the dataset twice
      ds = ds.join_table(options[:join_type] || :left_outer, table, join_conditions, :table_alias=>table_alias_qualifier, :implicit_qualifier=>implicit_qualifier, :qualify=>options[:qualify], &block)

      return ds if options[:join_only]

      opts = ds.opts

      # Whether to include the table in the result set
      add_table = options[:select] == false ? false : true

      if graph
        graph = graph.dup
        select = opts[:select].dup
        [:column_aliases, :table_aliases, :column_alias_num].each{|k| graph[k] = graph[k].dup}
      else
        # Setup the initial graph data structure if it doesn't exist
        qualifier = ds.first_source_alias
        master = alias_symbol(qualifier)
        raise_alias_error.call if master == table_alias

        # Master hash storing all .graph related information
        graph = {}

        # Associates column aliases back to tables and columns
        column_aliases = graph[:column_aliases] = {}

        # Associates table alias (the master is never aliased)
        table_aliases = graph[:table_aliases] = {master=>self}

        # Keep track of the alias numbers used
        ca_num = graph[:column_alias_num] = Hash.new(0)

        select = if select_columns
          select_columns.map do |sel, column|
            column_aliases[column] = [master, column]
            if from_selfed
              # Initial dataset was wrapped in subselect, selected all
              # columns in the subselect, qualified by the subselect alias.
              Sequel.qualify(qualifier, Sequel.identifier(column))
            else
              # Initial dataset not wrapped in subslect, just make
              # sure columns are qualified in some way.
              qualified_expression(sel, qualifier)
            end
          end
        else
          columns.map do |column|
            column_aliases[column] = [master, column]
            SQL::QualifiedIdentifier.new(qualifier, column)
          end
        end
      end

      # Add the table alias to the list of aliases
      # Even if it isn't been used in the result set,
      # we add a key for it with a nil value so we can check if it
      # is used more than once
      table_aliases = graph[:table_aliases]
      table_aliases[table_alias] = add_table ? dataset : nil

      # Add the columns to the selection unless we are ignoring them
      if add_table
        column_aliases = graph[:column_aliases]
        ca_num = graph[:column_alias_num]
        # Which columns to add to the result set
        cols = options[:select] || dataset.columns
        # If the column hasn't been used yet, don't alias it.
        # If it has been used, try table_column.
        # If that has been used, try table_column_N 
        # using the next value of N that we know hasn't been
        # used
        cols.each do |column|
          col_alias, identifier = if column_aliases[column]
            column_alias = :"#{table_alias}_#{column}"
            if column_aliases[column_alias]
              column_alias_num = ca_num[column_alias]
              column_alias = :"#{column_alias}_#{column_alias_num}" 
              ca_num[column_alias] += 1
            end
            [column_alias, SQL::AliasedExpression.new(SQL::QualifiedIdentifier.new(table_alias_qualifier, column), column_alias)]
          else
            ident = SQL::QualifiedIdentifier.new(table_alias_qualifier, column)
            [column, ident]
          end
          column_aliases[col_alias] = [table_alias, column].freeze
          select.push(identifier)
        end
      end
      [:column_aliases, :table_aliases, :column_alias_num].each{|k| graph[k].freeze}
      ds = ds.clone(:graph=>graph.freeze)
      ds.select(*select)
    end

    # This allows you to manually specify the graph aliases to use
    # when using graph.  You can use it to only select certain
    # columns, and have those columns mapped to specific aliases
    # in the result set.  This is the equivalent of +select+ for a
    # graphed dataset, and must be used instead of +select+ whenever
    # graphing is used.
    #
    # graph_aliases should be a hash with keys being symbols of
    # column aliases, and values being either symbols or arrays with one to three elements.
    # If the value is a symbol, it is assumed to be the same as a one element
    # array containing that symbol.
    # The first element of the array should be the table alias symbol.
    # The second should be the actual column name symbol.  If the array only
    # has a single element the column name symbol will be assumed to be the
    # same as the corresponding hash key. If the array
    # has a third element, it is used as the value returned, instead of
    # table_alias.column_name.
    #
    #   DB[:artists].graph(:albums, :artist_id: :id).
    #     set_graph_aliases(name: :artists,
    #                       album_name: [:albums, :name],
    #                       forty_two: [:albums, :fourtwo, 42]).first
    #   # SELECT artists.name, albums.name AS album_name, 42 AS forty_two ...
    def set_graph_aliases(graph_aliases)
      columns, graph_aliases = graph_alias_columns(graph_aliases)
      if graph = opts[:graph]
        select(*columns).clone(:graph => graph.merge(:column_aliases=>graph_aliases.freeze).freeze)
      else
        raise Error, "cannot call #set_graph_aliases on an ungraphed dataset"
      end
    end

    # Remove the splitting of results into subhashes, and all metadata
    # related to the current graph (if any).
    def ungraphed
      clone(:graph=>nil)
    end

    private

    # Wrap the alias symbol in an SQL::Identifier if the identifier on which is based
    # is an SQL::Identifier.  This works around cases where symbol splitting is enabled and the alias symbol contains
    # double embedded underscores which would be considered an implicit qualified identifier
    # if not wrapped in an SQL::Identifier.
    def qualifier_from_alias_symbol(aliaz, identifier)
      case identifier
      when SQL::QualifiedIdentifier
        if identifier.column.is_a?(String)
          Sequel.identifier(aliaz)
        else
          aliaz
        end
      when SQL::Identifier
        Sequel.identifier(aliaz)
      else
        aliaz
      end
    end

    # Transform the hash of graph aliases and return a two element array
    # where the first element is an array of identifiers suitable to pass to
    # a select method, and the second is a new hash of preprocessed graph aliases.
    def graph_alias_columns(graph_aliases)
      gas = {}
      identifiers = graph_aliases.map do |col_alias, tc| 
        table, column, value = Array(tc)
        column ||= col_alias
        gas[col_alias] = [table, column].freeze
        identifier = value || SQL::QualifiedIdentifier.new(table, column)
        identifier = SQL::AliasedExpression.new(identifier, col_alias) if value || column != col_alias
        identifier
      end
      [identifiers, gas]
    end
  end
end
