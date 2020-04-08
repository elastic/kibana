# frozen-string-literal: true

module Sequel
  class Dataset
    # ---------------------
    # :section: 2 - Methods that execute code on the database
    # These methods all execute the dataset's SQL on the database.
    # They don't return modified datasets, so if used in a method chain
    # they should be the last method called.
    # ---------------------
    
    # Action methods defined by Sequel that execute code on the database.
    ACTION_METHODS = (<<-METHS).split.map(&:to_sym).freeze
      << [] all as_hash avg count columns columns! delete each
      empty? fetch_rows first first! get import insert last
      map max min multi_insert paged_each select_hash select_hash_groups select_map select_order_map
      single_record single_record! single_value single_value! sum to_hash to_hash_groups truncate update
      where_all where_each where_single_value
    METHS

    # The clone options to use when retrieving columns for a dataset.
    COLUMNS_CLONE_OPTIONS = {:distinct => nil, :limit => 1, :offset=>nil, :where=>nil, :having=>nil, :order=>nil, :row_proc=>nil, :graph=>nil, :eager_graph=>nil}.freeze

    # Inserts the given argument into the database.  Returns self so it
    # can be used safely when chaining:
    # 
    #   DB[:items] << {id: 0, name: 'Zero'} << DB[:old_items].select(:id, name)
    def <<(arg)
      insert(arg)
      self
    end
    
    # Returns the first record matching the conditions. Examples:
    #
    #   DB[:table][id: 1] # SELECT * FROM table WHERE (id = 1) LIMIT 1
    #   # => {:id=>1}
    def [](*conditions)
      raise(Error, 'You cannot call Dataset#[] with an integer or with no arguments') if (conditions.length == 1 and conditions.first.is_a?(Integer)) or conditions.length == 0
      first(*conditions)
    end

    # Returns an array with all records in the dataset. If a block is given,
    # the array is iterated over after all items have been loaded.
    #
    #   DB[:table].all # SELECT * FROM table
    #   # => [{:id=>1, ...}, {:id=>2, ...}, ...]
    #
    #   # Iterate over all rows in the table
    #   DB[:table].all{|row| p row}
    def all(&block)
      _all(block){|a| each{|r| a << r}}
    end
    
    # Returns the average value for the given column/expression.
    # Uses a virtual row block if no argument is given.
    #
    #   DB[:table].avg(:number) # SELECT avg(number) FROM table LIMIT 1
    #   # => 3
    #   DB[:table].avg{function(column)} # SELECT avg(function(column)) FROM table LIMIT 1
    #   # => 1
    def avg(arg=(no_arg = true), &block)
      arg = Sequel.virtual_row(&block) if no_arg
      _aggregate(:avg, arg)
    end
  
    # Returns the columns in the result set in order as an array of symbols.
    # If the columns are currently cached, returns the cached value. Otherwise,
    # a SELECT query is performed to retrieve a single row in order to get the columns.
    #
    # If you are looking for all columns for a single table and maybe some information about
    # each column (e.g. database type), see <tt>Database#schema</tt>.
    #
    #   DB[:table].columns
    #   # => [:id, :name]
    def columns
      _columns || columns!
    end
        
    # Ignore any cached column information and perform a query to retrieve
    # a row in order to get the columns.
    #
    #   DB[:table].columns!
    #   # => [:id, :name]
    def columns!
      ds = clone(COLUMNS_CLONE_OPTIONS)
      ds.each{break}

      if cols = ds.cache[:_columns]
        self.columns = cols
      else
        []
      end
    end
    
    COUNT_SELECT = Sequel.function(:count).*.as(:count)

    # Returns the number of records in the dataset. If an argument is provided,
    # it is used as the argument to count.  If a block is provided, it is
    # treated as a virtual row, and the result is used as the argument to
    # count.
    #
    #   DB[:table].count # SELECT count(*) AS count FROM table LIMIT 1
    #   # => 3
    #   DB[:table].count(:column) # SELECT count(column) AS count FROM table LIMIT 1
    #   # => 2
    #   DB[:table].count{foo(column)} # SELECT count(foo(column)) AS count FROM table LIMIT 1
    #   # => 1
    def count(arg=(no_arg=true), &block)
      if no_arg && !block
        cached_dataset(:_count_ds) do
          aggregate_dataset.select(COUNT_SELECT).single_value_ds
        end.single_value!.to_i
      else
        if block
          if no_arg
            arg = Sequel.virtual_row(&block)
          else
            raise Error, 'cannot provide both argument and block to Dataset#count'
          end
        end

        _aggregate(:count, arg)
      end
    end

    # Deletes the records in the dataset, returning the number of records deleted.
    #
    #   DB[:table].delete # DELETE * FROM table
    #   # => 3
    def delete(&block)
      sql = delete_sql
      if uses_returning?(:delete)
        returning_fetch_rows(sql, &block)
      else
        execute_dui(sql)
      end
    end

    # Iterates over the records in the dataset as they are yielded from the
    # database adapter, and returns self.
    #
    #   DB[:table].each{|row| p row} # SELECT * FROM table
    #
    # Note that this method is not safe to use on many adapters if you are
    # running additional queries inside the provided block.  If you are
    # running queries inside the block, you should use +all+ instead of +each+
    # for the outer queries, or use a separate thread or shard inside +each+.
    def each
      if rp = row_proc
        fetch_rows(select_sql){|r| yield rp.call(r)}
      else
        fetch_rows(select_sql){|r| yield r}
      end
      self
    end
    
    EMPTY_SELECT = Sequel::SQL::AliasedExpression.new(1, :one)

    # Returns true if no records exist in the dataset, false otherwise
    #
    #   DB[:table].empty? # SELECT 1 AS one FROM table LIMIT 1
    #   # => false
    def empty?
      cached_dataset(:_empty_ds) do
        single_value_ds.unordered.select(EMPTY_SELECT)
      end.single_value!.nil?
    end

    # Returns the first matching record if no arguments are given.
    # If a integer argument is given, it is interpreted as a limit, and then returns all 
    # matching records up to that limit.  If any other type of
    # argument(s) is passed, it is treated as a filter and the
    # first matching record is returned.  If a block is given, it is used
    # to filter the dataset before returning anything.
    #
    # If there are no records in the dataset, returns nil (or an empty
    # array if an integer argument is given).
    #
    # Examples:
    # 
    #   DB[:table].first # SELECT * FROM table LIMIT 1
    #   # => {:id=>7}
    #
    #   DB[:table].first(2) # SELECT * FROM table LIMIT 2
    #   # => [{:id=>6}, {:id=>4}]
    #
    #   DB[:table].first(id: 2) # SELECT * FROM table WHERE (id = 2) LIMIT 1
    #   # => {:id=>2}
    #
    #   DB[:table].first(Sequel.lit("id = 3")) # SELECT * FROM table WHERE (id = 3) LIMIT 1
    #   # => {:id=>3}
    #
    #   DB[:table].first(Sequel.lit("id = ?", 4)) # SELECT * FROM table WHERE (id = 4) LIMIT 1
    #   # => {:id=>4}
    #
    #   DB[:table].first{id > 2} # SELECT * FROM table WHERE (id > 2) LIMIT 1
    #   # => {:id=>5}
    #
    #   DB[:table].first(Sequel.lit("id > ?", 4)){id < 6} # SELECT * FROM table WHERE ((id > 4) AND (id < 6)) LIMIT 1
    #   # => {:id=>5}
    #
    #   DB[:table].first(2){id < 2} # SELECT * FROM table WHERE (id < 2) LIMIT 2
    #   # => [{:id=>1}]
    def first(*args, &block)
      case args.length
      when 0
        unless block
          return single_record
        end
      when 1
        arg = args[0]
        if arg.is_a?(Integer)
          res = if block
            if loader = cached_placeholder_literalizer(:_first_integer_cond_loader) do |pl|
                where(pl.arg).limit(pl.arg)
              end

              loader.all(filter_expr(&block), arg)
            else
              where(&block).limit(arg).all
            end
          else
            if loader = cached_placeholder_literalizer(:_first_integer_loader) do |pl|
               limit(pl.arg)
              end

              loader.all(arg)
            else
              limit(arg).all
            end
          end

          return res
        end
        where_args = args
        args = arg
      end

      if loader = cached_where_placeholder_literalizer(where_args||args, block, :_first_cond_loader) do |pl|
          _single_record_ds.where(pl.arg)
        end

        loader.first(filter_expr(args, &block))
      else
        _single_record_ds.where(args, &block).single_record!
      end
    end

    # Calls first.  If first returns nil (signaling that no
    # row matches), raise a Sequel::NoMatchingRow exception.
    def first!(*args, &block)
      first(*args, &block) || raise(Sequel::NoMatchingRow.new(self))
    end

    # Return the column value for the first matching record in the dataset.
    # Raises an error if both an argument and block is given.
    #
    #   DB[:table].get(:id) # SELECT id FROM table LIMIT 1
    #   # => 3
    #
    #   ds.get{sum(id)} # SELECT sum(id) AS v FROM table LIMIT 1
    #   # => 6
    #
    # You can pass an array of arguments to return multiple arguments,
    # but you must make sure each element in the array has an alias that
    # Sequel can determine:
    #
    #   DB[:table].get([:id, :name]) # SELECT id, name FROM table LIMIT 1
    #   # => [3, 'foo']
    #
    #   DB[:table].get{[sum(id).as(sum), name]} # SELECT sum(id) AS sum, name FROM table LIMIT 1
    #   # => [6, 'foo']
    def get(column=(no_arg=true; nil), &block)
      ds = naked
      if block
        raise(Error, 'Must call Dataset#get with an argument or a block, not both') unless no_arg
        ds = ds.select(&block)
        column = ds.opts[:select]
        column = nil if column.is_a?(Array) && column.length < 2
      else
        case column
        when Array
          ds = ds.select(*column)
        when LiteralString, Symbol, SQL::Identifier, SQL::QualifiedIdentifier, SQL::AliasedExpression
          if loader = cached_placeholder_literalizer(:_get_loader) do |pl|
              ds.single_value_ds.select(pl.arg)
            end

            return loader.get(column)
          end

          ds = ds.select(column)
        else
          if loader = cached_placeholder_literalizer(:_get_alias_loader) do |pl|
              ds.single_value_ds.select(Sequel.as(pl.arg, :v))
            end

            return loader.get(column)
          end

          ds = ds.select(Sequel.as(column, :v))
        end
      end

      if column.is_a?(Array)
       if r = ds.single_record
         r.values_at(*hash_key_symbols(column))
       end
      else
        ds.single_value
      end
    end
    
    # Inserts multiple records into the associated table. This method can be
    # used to efficiently insert a large number of records into a table in a
    # single query if the database supports it. Inserts
    # are automatically wrapped in a transaction.
    # 
    # This method is called with a columns array and an array of value arrays:
    #
    #   DB[:table].import([:x, :y], [[1, 2], [3, 4]])
    #   # INSERT INTO table (x, y) VALUES (1, 2) 
    #   # INSERT INTO table (x, y) VALUES (3, 4) 
    #
    # This method also accepts a dataset instead of an array of value arrays:
    #
    #   DB[:table].import([:x, :y], DB[:table2].select(:a, :b))
    #   # INSERT INTO table (x, y) SELECT a, b FROM table2 
    #
    # Options:
    # :commit_every :: Open a new transaction for every given number of records.
    #                  For example, if you provide a value of 50, will commit
    #                  after every 50 records.
    # :return :: When this is set to :primary_key, returns an array of
    #            autoincremented primary key values for the rows inserted.
    #            This does not have an effect if +values+ is a Dataset.
    # :server :: Set the server/shard to use for the transaction and insert
    #            queries.
    # :slice :: Same as :commit_every, :commit_every takes precedence.
    def import(columns, values, opts=OPTS)
      return @db.transaction{insert(columns, values)} if values.is_a?(Dataset)

      return if values.empty?
      raise(Error, 'Using Sequel::Dataset#import with an empty column array is not allowed') if columns.empty?
      ds = opts[:server] ? server(opts[:server]) : self
      
      if slice_size = opts.fetch(:commit_every, opts.fetch(:slice, default_import_slice))
        offset = 0
        rows = []
        while offset < values.length
          rows << ds._import(columns, values[offset, slice_size], opts)
          offset += slice_size
        end
        rows.flatten
      else
        ds._import(columns, values, opts)
      end
    end

    # Inserts values into the associated table.  The returned value is generally
    # the value of the autoincremented primary key for the inserted row, assuming that
    # a single row is inserted and the table has an autoincrementing primary key.
    #
    # +insert+ handles a number of different argument formats:
    # no arguments or single empty hash :: Uses DEFAULT VALUES
    # single hash :: Most common format, treats keys as columns and values as values
    # single array :: Treats entries as values, with no columns
    # two arrays :: Treats first array as columns, second array as values
    # single Dataset :: Treats as an insert based on a selection from the dataset given,
    #                   with no columns
    # array and dataset :: Treats as an insert based on a selection from the dataset
    #                      given, with the columns given by the array.
    #
    # Examples:
    #
    #   DB[:items].insert
    #   # INSERT INTO items DEFAULT VALUES
    #
    #   DB[:items].insert({})
    #   # INSERT INTO items DEFAULT VALUES
    #
    #   DB[:items].insert([1,2,3])
    #   # INSERT INTO items VALUES (1, 2, 3)
    #
    #   DB[:items].insert([:a, :b], [1,2])
    #   # INSERT INTO items (a, b) VALUES (1, 2)
    #
    #   DB[:items].insert(a: 1, b: 2)
    #   # INSERT INTO items (a, b) VALUES (1, 2)
    #
    #   DB[:items].insert(DB[:old_items])
    #   # INSERT INTO items SELECT * FROM old_items
    #
    #   DB[:items].insert([:a, :b], DB[:old_items])
    #   # INSERT INTO items (a, b) SELECT * FROM old_items
    def insert(*values, &block)
      sql = insert_sql(*values)
      if uses_returning?(:insert)
        returning_fetch_rows(sql, &block)
      else
        execute_insert(sql)
      end
    end
    
    # Reverses the order and then runs #first with the given arguments and block.  Note that this
    # will not necessarily give you the last record in the dataset,
    # unless you have an unambiguous order.  If there is not
    # currently an order for this dataset, raises an +Error+.
    #
    #   DB[:table].order(:id).last # SELECT * FROM table ORDER BY id DESC LIMIT 1
    #   # => {:id=>10}
    #
    #   DB[:table].order(Sequel.desc(:id)).last(2) # SELECT * FROM table ORDER BY id ASC LIMIT 2
    #   # => [{:id=>1}, {:id=>2}]
    def last(*args, &block)
      raise(Error, 'No order specified') unless @opts[:order]
      reverse.first(*args, &block)
    end
    
    # Maps column values for each record in the dataset (if an argument is given)
    # or performs the stock mapping functionality of +Enumerable+ otherwise. 
    # Raises an +Error+ if both an argument and block are given.
    #
    #   DB[:table].map(:id) # SELECT * FROM table
    #   # => [1, 2, 3, ...]
    #
    #   DB[:table].map{|r| r[:id] * 2} # SELECT * FROM table
    #   # => [2, 4, 6, ...]
    #
    # You can also provide an array of column names:
    #
    #   DB[:table].map([:id, :name]) # SELECT * FROM table
    #   # => [[1, 'A'], [2, 'B'], [3, 'C'], ...]
    def map(column=nil, &block)
      if column
        raise(Error, 'Must call Dataset#map with either an argument or a block, not both') if block
        return naked.map(column) if row_proc
        if column.is_a?(Array)
          super(){|r| r.values_at(*column)}
        else
          super(){|r| r[column]}
        end
      else
        super(&block)
      end
    end

    # Returns the maximum value for the given column/expression.
    # Uses a virtual row block if no argument is given.
    #
    #   DB[:table].max(:id) # SELECT max(id) FROM table LIMIT 1
    #   # => 10
    #   DB[:table].max{function(column)} # SELECT max(function(column)) FROM table LIMIT 1
    #   # => 7
    def max(arg=(no_arg = true), &block)
      arg = Sequel.virtual_row(&block) if no_arg
      _aggregate(:max, arg)
    end

    # Returns the minimum value for the given column/expression.
    # Uses a virtual row block if no argument is given.
    #
    #   DB[:table].min(:id) # SELECT min(id) FROM table LIMIT 1
    #   # => 1
    #   DB[:table].min{function(column)} # SELECT min(function(column)) FROM table LIMIT 1
    #   # => 0
    def min(arg=(no_arg = true), &block)
      arg = Sequel.virtual_row(&block) if no_arg
      _aggregate(:min, arg)
    end

    # This is a front end for import that allows you to submit an array of
    # hashes instead of arrays of columns and values:
    # 
    #   DB[:table].multi_insert([{x: 1}, {x: 2}])
    #   # INSERT INTO table (x) VALUES (1)
    #   # INSERT INTO table (x) VALUES (2)
    #
    # Be aware that all hashes should have the same keys if you use this calling method,
    # otherwise some columns could be missed or set to null instead of to default
    # values.
    #
    # This respects the same options as #import.
    def multi_insert(hashes, opts=OPTS)
      return if hashes.empty?
      columns = hashes.first.keys
      import(columns, hashes.map{|h| columns.map{|c| h[c]}}, opts)
    end

    # Yields each row in the dataset, but internally uses multiple queries as needed to
    # process the entire result set without keeping all rows in the dataset in memory,
    # even if the underlying driver buffers all query results in memory.
    #
    # Because this uses multiple queries internally, in order to remain consistent,
    # it also uses a transaction internally.  Additionally, to work correctly, the dataset
    # must have unambiguous order.  Using an ambiguous order can result in an infinite loop,
    # as well as subtler bugs such as yielding duplicate rows or rows being skipped.
    #
    # Sequel checks that the datasets using this method have an order, but it cannot
    # ensure that the order is unambiguous.
    #
    # Note that this method is not safe to use on many adapters if you are
    # running additional queries inside the provided block.  If you are
    # running queries inside the block, use a separate thread or shard inside +paged_each+.
    #
    # Options:
    # :rows_per_fetch :: The number of rows to fetch per query.  Defaults to 1000.
    # :strategy :: The strategy to use for paging of results.  By default this is :offset,
    #              for using an approach with a limit and offset for every page.  This can
    #              be set to :filter, which uses a limit and a filter that excludes
    #              rows from previous pages.  In order for this strategy to work, you must be
    #              selecting the columns you are ordering by, and none of the columns can contain
    #              NULLs.  Note that some Sequel adapters have optimized implementations that will
    #              use cursors or streaming regardless of the :strategy option used.
    # :filter_values :: If the strategy: :filter option is used, this option should be a proc
    #                   that accepts the last retrieved row for the previous page and an array of
    #                   ORDER BY expressions, and returns an array of values relating to those
    #                   expressions for the last retrieved row.  You will need to use this option
    #                   if your ORDER BY expressions are not simple columns, if they contain
    #                   qualified identifiers that would be ambiguous unqualified, if they contain
    #                   any identifiers that are aliased in SELECT, and potentially other cases.
    #
    # Examples:
    #
    #   DB[:table].order(:id).paged_each{|row| }
    #   # SELECT * FROM table ORDER BY id LIMIT 1000
    #   # SELECT * FROM table ORDER BY id LIMIT 1000 OFFSET 1000
    #   # ...
    #
    #   DB[:table].order(:id).paged_each(:rows_per_fetch=>100){|row| }
    #   # SELECT * FROM table ORDER BY id LIMIT 100
    #   # SELECT * FROM table ORDER BY id LIMIT 100 OFFSET 100
    #   # ...
    #
    #   DB[:table].order(:id).paged_each(strategy: :filter){|row| }
    #   # SELECT * FROM table ORDER BY id LIMIT 1000
    #   # SELECT * FROM table WHERE id > 1001 ORDER BY id LIMIT 1000
    #   # ...
    #
    #   DB[:table].order(:id).paged_each(strategy: :filter,
    #     filter_values: lambda{|row, exprs| [row[:id]]}){|row| }
    #   # SELECT * FROM table ORDER BY id LIMIT 1000
    #   # SELECT * FROM table WHERE id > 1001 ORDER BY id LIMIT 1000
    #   # ...
    def paged_each(opts=OPTS)
      unless @opts[:order]
        raise Sequel::Error, "Dataset#paged_each requires the dataset be ordered"
      end
      unless block_given?
        return enum_for(:paged_each, opts)
      end

      total_limit = @opts[:limit]
      offset = @opts[:offset]
      if server = @opts[:server]
        opts = Hash[opts]
        opts[:server] = server
      end

      rows_per_fetch = opts[:rows_per_fetch] || 1000
      strategy = if offset || total_limit
        :offset
      else
        opts[:strategy] || :offset
      end

      db.transaction(opts) do
        case strategy
        when :filter
          filter_values = opts[:filter_values] || proc{|row, exprs| exprs.map{|e| row[hash_key_symbol(e)]}}
          base_ds = ds = limit(rows_per_fetch)
          while ds
            last_row = nil
            ds.each do |row|
              last_row = row
              yield row
            end
            ds = (base_ds.where(ignore_values_preceding(last_row, &filter_values)) if last_row)
          end
        else
          offset ||= 0
          num_rows_yielded = rows_per_fetch
          total_rows = 0

          while num_rows_yielded == rows_per_fetch && (total_limit.nil? || total_rows < total_limit)
            if total_limit && total_rows + rows_per_fetch > total_limit
              rows_per_fetch = total_limit - total_rows
            end

            num_rows_yielded = 0
            limit(rows_per_fetch, offset).each do |row|
              num_rows_yielded += 1
              total_rows += 1 if total_limit
              yield row
            end

            offset += rows_per_fetch
          end
        end
      end

      self
    end

    # Returns a hash with key_column values as keys and value_column values as
    # values.  Similar to as_hash, but only selects the columns given.  Like
    # as_hash, it accepts an optional :hash parameter, into which entries will
    # be merged. 
    #
    #   DB[:table].select_hash(:id, :name) # SELECT id, name FROM table
    #   # => {1=>'a', 2=>'b', ...}
    #
    # You can also provide an array of column names for either the key_column,
    # the value column, or both:
    #
    #   DB[:table].select_hash([:id, :foo], [:name, :bar]) # SELECT * FROM table
    #   # {[1, 3]=>['a', 'c'], [2, 4]=>['b', 'd'], ...}
    #
    # When using this method, you must be sure that each expression has an alias
    # that Sequel can determine.
    def select_hash(key_column, value_column, opts = OPTS)
      _select_hash(:as_hash, key_column, value_column, opts)
    end
    
    # Returns a hash with key_column values as keys and an array of value_column values.
    # Similar to to_hash_groups, but only selects the columns given.  Like to_hash_groups,
    # it accepts an optional :hash parameter, into which entries will be merged. 
    #
    #   DB[:table].select_hash_groups(:name, :id) # SELECT id, name FROM table
    #   # => {'a'=>[1, 4, ...], 'b'=>[2, ...], ...}
    #
    # You can also provide an array of column names for either the key_column,
    # the value column, or both:
    #
    #   DB[:table].select_hash_groups([:first, :middle], [:last, :id]) # SELECT * FROM table
    #   # {['a', 'b']=>[['c', 1], ['d', 2], ...], ...}
    #
    # When using this method, you must be sure that each expression has an alias
    # that Sequel can determine.
    def select_hash_groups(key_column, value_column, opts = OPTS)
      _select_hash(:to_hash_groups, key_column, value_column, opts)
    end

    # Selects the column given (either as an argument or as a block), and
    # returns an array of all values of that column in the dataset.  If you
    # give a block argument that returns an array with multiple entries,
    # the contents of the resulting array are undefined.  Raises an Error
    # if called with both an argument and a block.
    #
    #   DB[:table].select_map(:id) # SELECT id FROM table
    #   # => [3, 5, 8, 1, ...]
    #
    #   DB[:table].select_map{id * 2} # SELECT (id * 2) FROM table
    #   # => [6, 10, 16, 2, ...]
    #
    # You can also provide an array of column names:
    #
    #   DB[:table].select_map([:id, :name]) # SELECT id, name FROM table
    #   # => [[1, 'A'], [2, 'B'], [3, 'C'], ...]
    #
    # If you provide an array of expressions, you must be sure that each entry
    # in the array has an alias that Sequel can determine.
    def select_map(column=nil, &block)
      _select_map(column, false, &block)
    end
    
    # The same as select_map, but in addition orders the array by the column.
    #
    #   DB[:table].select_order_map(:id) # SELECT id FROM table ORDER BY id
    #   # => [1, 2, 3, 4, ...]
    #
    #   DB[:table].select_order_map{id * 2} # SELECT (id * 2) FROM table ORDER BY (id * 2)
    #   # => [2, 4, 6, 8, ...]
    #
    # You can also provide an array of column names:
    #
    #   DB[:table].select_order_map([:id, :name]) # SELECT id, name FROM table ORDER BY id, name
    #   # => [[1, 'A'], [2, 'B'], [3, 'C'], ...]
    #
    # If you provide an array of expressions, you must be sure that each entry
    # in the array has an alias that Sequel can determine.
    def select_order_map(column=nil, &block)
      _select_map(column, true, &block)
    end

    # Limits the dataset to one record, and returns the first record in the dataset,
    # or nil if the dataset has no records. Users should probably use +first+ instead of
    # this method. Example:
    #
    #   DB[:test].single_record # SELECT * FROM test LIMIT 1
    #   # => {:column_name=>'value'}
    def single_record
      _single_record_ds.single_record!
    end

    # Returns the first record in dataset, without limiting the dataset. Returns nil if
    # the dataset has no records. Users should probably use +first+ instead of this method.
    # This should only be used if you know the dataset is already limited to a single record.
    # This method may be desirable to use for performance reasons, as it does not clone the
    # receiver. Example:
    #
    #   DB[:test].single_record! # SELECT * FROM test
    #   # => {:column_name=>'value'}
    def single_record!
      with_sql_first(select_sql)
    end

    # Returns the first value of the first record in the dataset.
    # Returns nil if dataset is empty.  Users should generally use
    # +get+ instead of this method. Example:
    #
    #   DB[:test].single_value # SELECT * FROM test LIMIT 1
    #   # => 'value'
    def single_value
      single_value_ds.each do |r|
        r.each{|_, v| return v}
      end
      nil
    end

    # Returns the first value of the first record in the dataset, without limiting the dataset.
    # Returns nil if the dataset is empty. Users should generally use +get+ instead of this
    # method.  Should not be used on graphed datasets or datasets that have row_procs that
    # don't return hashes.  This method may be desirable to use for performance reasons, as
    # it does not clone the receiver.
    #
    #   DB[:test].single_value! # SELECT * FROM test
    #   # => 'value'
    def single_value!
      with_sql_single_value(select_sql)
    end
    
    # Returns the sum for the given column/expression.
    # Uses a virtual row block if no column is given.
    #
    #   DB[:table].sum(:id) # SELECT sum(id) FROM table LIMIT 1
    #   # => 55
    #   DB[:table].sum{function(column)} # SELECT sum(function(column)) FROM table LIMIT 1
    #   # => 10
    def sum(arg=(no_arg = true), &block)
      arg = Sequel.virtual_row(&block) if no_arg
      _aggregate(:sum, arg)
    end

    # Returns a hash with one column used as key and another used as value.
    # If rows have duplicate values for the key column, the latter row(s)
    # will overwrite the value of the previous row(s). If the value_column
    # is not given or nil, uses the entire hash as the value.
    #
    #   DB[:table].as_hash(:id, :name) # SELECT * FROM table
    #   # {1=>'Jim', 2=>'Bob', ...}
    #
    #   DB[:table].as_hash(:id) # SELECT * FROM table
    #   # {1=>{:id=>1, :name=>'Jim'}, 2=>{:id=>2, :name=>'Bob'}, ...}
    #
    # You can also provide an array of column names for either the key_column,
    # the value column, or both:
    #
    #   DB[:table].as_hash([:id, :foo], [:name, :bar]) # SELECT * FROM table
    #   # {[1, 3]=>['Jim', 'bo'], [2, 4]=>['Bob', 'be'], ...}
    #
    #   DB[:table].as_hash([:id, :name]) # SELECT * FROM table
    #   # {[1, 'Jim']=>{:id=>1, :name=>'Jim'}, [2, 'Bob']=>{:id=>2, :name=>'Bob'}, ...}
    #
    # Options:
    # :all :: Use all instead of each to retrieve the objects
    # :hash :: The object into which the values will be placed.  If this is not
    #          given, an empty hash is used.  This can be used to use a hash with
    #          a default value or default proc.
    def as_hash(key_column, value_column = nil, opts = OPTS)
      h = opts[:hash] || {}
      meth = opts[:all] ? :all : :each
      if value_column
        return naked.as_hash(key_column, value_column, opts) if row_proc
        if value_column.is_a?(Array)
          if key_column.is_a?(Array)
            public_send(meth){|r| h[r.values_at(*key_column)] = r.values_at(*value_column)}
          else
            public_send(meth){|r| h[r[key_column]] = r.values_at(*value_column)}
          end
        else
          if key_column.is_a?(Array)
            public_send(meth){|r| h[r.values_at(*key_column)] = r[value_column]}
          else
            public_send(meth){|r| h[r[key_column]] = r[value_column]}
          end
        end
      elsif key_column.is_a?(Array)
        public_send(meth){|r| h[key_column.map{|k| r[k]}] = r}
      else
        public_send(meth){|r| h[r[key_column]] = r}
      end
      h
    end

    # Alias of as_hash for backwards compatibility.
    def to_hash(*a)
      as_hash(*a)
    end

    # Returns a hash with one column used as key and the values being an
    # array of column values. If the value_column is not given or nil, uses
    # the entire hash as the value.
    #
    #   DB[:table].to_hash_groups(:name, :id) # SELECT * FROM table
    #   # {'Jim'=>[1, 4, 16, ...], 'Bob'=>[2], ...}
    #
    #   DB[:table].to_hash_groups(:name) # SELECT * FROM table
    #   # {'Jim'=>[{:id=>1, :name=>'Jim'}, {:id=>4, :name=>'Jim'}, ...], 'Bob'=>[{:id=>2, :name=>'Bob'}], ...}
    #
    # You can also provide an array of column names for either the key_column,
    # the value column, or both:
    #
    #   DB[:table].to_hash_groups([:first, :middle], [:last, :id]) # SELECT * FROM table
    #   # {['Jim', 'Bob']=>[['Smith', 1], ['Jackson', 4], ...], ...}
    #
    #   DB[:table].to_hash_groups([:first, :middle]) # SELECT * FROM table
    #   # {['Jim', 'Bob']=>[{:id=>1, :first=>'Jim', :middle=>'Bob', :last=>'Smith'}, ...], ...}
    #
    # Options:
    # :all :: Use all instead of each to retrieve the objects
    # :hash :: The object into which the values will be placed.  If this is not
    #          given, an empty hash is used.  This can be used to use a hash with
    #          a default value or default proc.
    def to_hash_groups(key_column, value_column = nil, opts = OPTS)
      h = opts[:hash] || {}
      meth = opts[:all] ? :all : :each
      if value_column
        return naked.to_hash_groups(key_column, value_column, opts) if row_proc
        if value_column.is_a?(Array)
          if key_column.is_a?(Array)
            public_send(meth){|r| (h[r.values_at(*key_column)] ||= []) << r.values_at(*value_column)}
          else
            public_send(meth){|r| (h[r[key_column]] ||= []) << r.values_at(*value_column)}
          end
        else
          if key_column.is_a?(Array)
            public_send(meth){|r| (h[r.values_at(*key_column)] ||= []) << r[value_column]}
          else
            public_send(meth){|r| (h[r[key_column]] ||= []) << r[value_column]}
          end
        end
      elsif key_column.is_a?(Array)
        public_send(meth){|r| (h[key_column.map{|k| r[k]}] ||= []) << r}
      else
        public_send(meth){|r| (h[r[key_column]] ||= []) << r}
      end
      h
    end

    # Truncates the dataset.  Returns nil.
    #
    #   DB[:table].truncate # TRUNCATE table
    #   # => nil
    def truncate
      execute_ddl(truncate_sql)
    end

    # Updates values for the dataset.  The returned value is the number of rows updated.
    # +values+ should be a hash where the keys are columns to set and values are the values to
    # which to set the columns.
    #
    #   DB[:table].update(x: nil) # UPDATE table SET x = NULL
    #   # => 10
    #
    #   DB[:table].update(x: Sequel[:x]+1, y: 0) # UPDATE table SET x = (x + 1), y = 0
    #   # => 10
    def update(values=OPTS, &block)
      sql = update_sql(values)
      if uses_returning?(:update)
        returning_fetch_rows(sql, &block)
      else
        execute_dui(sql)
      end
    end

    # Return an array of all rows matching the given filter condition, also
    # yielding each row to the given block.  Basically the same as where(cond).all(&block),
    # except it can be optimized to not create an intermediate dataset.
    #
    #   DB[:table].where_all(id: [1,2,3])
    #   # SELECT * FROM table WHERE (id IN (1, 2, 3))
    def where_all(cond, &block)
      if loader = _where_loader([cond], nil)
        loader.all(filter_expr(cond), &block)
      else
        where(cond).all(&block)
      end
    end

    # Iterate over all rows matching the given filter condition, 
    # yielding each row to the given block.  Basically the same as where(cond).each(&block),
    # except it can be optimized to not create an intermediate dataset.
    #
    #   DB[:table].where_each(id: [1,2,3]){|row| p row}
    #   # SELECT * FROM table WHERE (id IN (1, 2, 3))
    def where_each(cond, &block)
      if loader = _where_loader([cond], nil)
        loader.each(filter_expr(cond), &block)
      else
        where(cond).each(&block)
      end
    end

    # Filter the datasets using the given filter condition, then return a single value.
    # This assumes that the dataset has already been setup to limit the selection to
    # a single column.  Basically the same as where(cond).single_value,
    # except it can be optimized to not create an intermediate dataset.
    #
    #   DB[:table].select(:name).where_single_value(id: 1)
    #   # SELECT name FROM table WHERE (id = 1) LIMIT 1
    def where_single_value(cond)
      if loader = cached_where_placeholder_literalizer([cond], nil, :_where_single_value_loader) do |pl|
          single_value_ds.where(pl.arg)
        end

        loader.get(filter_expr(cond))
      else
        where(cond).single_value
      end
    end

    # Run the given SQL and return an array of all rows.  If a block is given,
    # each row is yielded to the block after all rows are loaded. See with_sql_each.
    def with_sql_all(sql, &block)
      _all(block){|a| with_sql_each(sql){|r| a << r}}
    end

    # Execute the given SQL and return the number of rows deleted.  This exists
    # solely as an optimization, replacing with_sql(sql).delete.  It's significantly
    # faster as it does not require cloning the current dataset.
    def with_sql_delete(sql)
      execute_dui(sql)
    end
    alias with_sql_update with_sql_delete

    # Run the given SQL and yield each returned row to the block.
    def with_sql_each(sql)
      if rp = row_proc
        _with_sql_dataset.fetch_rows(sql){|r| yield rp.call(r)}
      else
        _with_sql_dataset.fetch_rows(sql){|r| yield r}
      end
      self
    end
    
    # Run the given SQL and return the first row, or nil if no rows were returned.
    # See with_sql_each.
    def with_sql_first(sql)
      with_sql_each(sql){|r| return r}
      nil
    end

    # Run the given SQL and return the first value in the first row, or nil if no
    # rows were returned.  For this to make sense, the SQL given should select
    # only a single value.  See with_sql_each.
    def with_sql_single_value(sql)
      if r = with_sql_first(sql)
        r.each{|_, v| return v}
      end
    end

    # Execute the given SQL and (on most databases) return the primary key of the
    # inserted row.
    def with_sql_insert(sql)
      execute_insert(sql)
    end

    protected

    # Internals of #import.  If primary key values are requested, use
    # separate insert commands for each row.  Otherwise, call #multi_insert_sql
    # and execute each statement it gives separately.
    def _import(columns, values, opts)
      trans_opts = Hash[opts]
      trans_opts[:server] = @opts[:server]
      if opts[:return] == :primary_key
        @db.transaction(trans_opts){values.map{|v| insert(columns, v)}}
      else
        stmts = multi_insert_sql(columns, values)
        @db.transaction(trans_opts){stmts.each{|st| execute_dui(st)}}
      end
    end
  
    # Return an array of arrays of values given by the symbols in ret_cols.
    def _select_map_multiple(ret_cols)
      map{|r| r.values_at(*ret_cols)}
    end
  
    # Returns an array of the first value in each row.
    def _select_map_single
      k = nil
      map{|r| r[k||=r.keys.first]}
    end
  
    # A dataset for returning single values from the current dataset.
    def single_value_ds
      clone(:limit=>1).ungraphed.naked
    end
    
    private
    
    # Internals of all and with_sql_all
    def _all(block)
      a = []
      yield a
      post_load(a)
      a.each(&block) if block
      a
    end
    
    # Cached placeholder literalizer for methods that return values using aggregate functions.
    def _aggregate(function, arg)
      if loader = cached_placeholder_literalizer(:"_#{function}_loader") do |pl|
            aggregate_dataset.limit(1).select(SQL::Function.new(function, pl.arg).as(function))
          end
        loader.get(arg)
      else
        aggregate_dataset.get(SQL::Function.new(function, arg).as(function))
      end
    end
    
    # Internals of +select_hash+ and +select_hash_groups+
    def _select_hash(meth, key_column, value_column, opts=OPTS)
      select(*(key_column.is_a?(Array) ? key_column : [key_column]) + (value_column.is_a?(Array) ? value_column : [value_column])).
        public_send(meth, hash_key_symbols(key_column), hash_key_symbols(value_column), opts)
    end
    
    # Internals of +select_map+ and +select_order_map+
    def _select_map(column, order, &block)
      ds = ungraphed.naked
      columns = Array(column)
      virtual_row_columns(columns, block)
      select_cols = order ? columns.map{|c| c.is_a?(SQL::OrderedExpression) ? c.expression : c} : columns
      ds = ds.order(*columns.map{|c| unaliased_identifier(c)}) if order
      if column.is_a?(Array) || (columns.length > 1)
        ds.select(*select_cols)._select_map_multiple(hash_key_symbols(select_cols))
      else
        ds.select(auto_alias_expression(select_cols.first))._select_map_single
      end
    end

    # A cached dataset for a single record for this dataset.
    def _single_record_ds
      cached_dataset(:_single_record_ds){clone(:limit=>1)}
    end

    # Loader used for where_all and where_each.
    def _where_loader(where_args, where_block)
      cached_where_placeholder_literalizer(where_args, where_block, :_where_loader) do |pl|
        where(pl.arg)
      end
    end

    # Automatically alias the given expression if it does not have an identifiable alias.
    def auto_alias_expression(v)
      case v
      when LiteralString, Symbol, SQL::Identifier, SQL::QualifiedIdentifier, SQL::AliasedExpression
        v
      else
        SQL::AliasedExpression.new(v, :v)
      end
    end

    # The default number of rows that can be inserted in a single INSERT statement via import.
    # The default is for no limit.
    def default_import_slice
      nil
    end

    # Set the server to use to :default unless it is already set in the passed opts
    def default_server_opts(opts)
      if @db.sharded? && !opts.has_key?(:server)
        opts = Hash[opts]
        opts[:server] = @opts[:server] || :default
      end
      opts
    end

    # Execute the given select SQL on the database using execute. Use the
    # :read_only server unless a specific server is set.
    def execute(sql, opts=OPTS, &block)
      db = @db
      if db.sharded? && !opts.has_key?(:server)
        opts = Hash[opts]
        opts[:server] = @opts[:server] || (@opts[:lock] ? :default : :read_only)
        opts
      end
      db.execute(sql, opts, &block)
    end
    
    # Execute the given SQL on the database using execute_ddl.
    def execute_ddl(sql, opts=OPTS, &block)
      @db.execute_ddl(sql, default_server_opts(opts), &block)
      nil
    end
    
    # Execute the given SQL on the database using execute_dui.
    def execute_dui(sql, opts=OPTS, &block)
      @db.execute_dui(sql, default_server_opts(opts), &block)
    end
    
    # Execute the given SQL on the database using execute_insert.
    def execute_insert(sql, opts=OPTS, &block)
      @db.execute_insert(sql, default_server_opts(opts), &block)
    end
    
    # Return a plain symbol given a potentially qualified or aliased symbol,
    # specifying the symbol that is likely to be used as the hash key
    # for the column when records are returned.  Return nil if no hash key
    # can be determined
    def _hash_key_symbol(s, recursing=false)
      case s
      when Symbol
        _, c, a = split_symbol(s)
        (a || c).to_sym
      when SQL::Identifier, SQL::Wrapper
        _hash_key_symbol(s.value, true)
      when SQL::QualifiedIdentifier
        _hash_key_symbol(s.column, true)
      when SQL::AliasedExpression
        _hash_key_symbol(s.alias, true)
      when String
        s.to_sym if recursing
      end
    end

    # Return a plain symbol given a potentially qualified or aliased symbol,
    # specifying the symbol that is likely to be used as the hash key
    # for the column when records are returned.  Raise Error if the hash key
    # symbol cannot be returned.
    def hash_key_symbol(s)
      if v = _hash_key_symbol(s)
        v
      else
        raise(Error, "#{s.inspect} is not supported, should be a Symbol, SQL::Identifier, SQL::QualifiedIdentifier, or SQL::AliasedExpression")
      end
    end

    # If s is an array, return an array with the given hash key symbols.
    # Otherwise, return a hash key symbol for the given expression 
    # If a hash key symbol cannot be determined, raise an error.
    def hash_key_symbols(s)
      s.is_a?(Array) ? s.map{|c| hash_key_symbol(c)} : hash_key_symbol(s)
    end
    
    # Returns an expression that will ignore values preceding the given row, using the
    # receiver's current order. This yields the row and the array of order expressions
    # to the block, which should return an array of values to use.
    def ignore_values_preceding(row)
      @opts[:order].map{|v| v.is_a?(SQL::OrderedExpression) ? v.expression : v}

      order_exprs = @opts[:order].map do |v|
        if v.is_a?(SQL::OrderedExpression)
          descending = v.descending
          v = v.expression
        else
          descending = false
        end
        [v, descending]
      end

      row_values = yield(row, order_exprs.map(&:first))

      last_expr = []
      cond = order_exprs.zip(row_values).map do |(v, descending), value|
        expr =  last_expr + [SQL::BooleanExpression.new(descending ? :< : :>, v, value)]
        last_expr += [SQL::BooleanExpression.new(:'=', v, value)]
        Sequel.&(*expr)
      end
      Sequel.|(*cond)
    end

    # Downcase identifiers by default when outputing them from the database.
    def output_identifier(v)
      v = 'untitled' if v == ''
      v.to_s.downcase.to_sym
    end
    
    # This is run inside .all, after all of the records have been loaded
    # via .each, but before any block passed to all is called.  It is called with
    # a single argument, an array of all returned records.  Does nothing by
    # default, added to make the model eager loading code simpler.
    def post_load(all_records)
    end

    # Called by insert/update/delete when returning is used.
    # Yields each row as a plain hash to the block if one is given, or returns
    # an array of plain hashes for all rows if a block is not given
    def returning_fetch_rows(sql, &block)
      if block
        default_server.fetch_rows(sql, &block)
        nil
      else
        rows = []
        default_server.fetch_rows(sql){|r| rows << r}
        rows
      end
    end
    
    # Return the unaliased part of the identifier.  Handles both
    # implicit aliases in symbols, as well as SQL::AliasedExpression
    # objects.  Other objects are returned as is.
    def unaliased_identifier(c)
      case c
      when Symbol
        table, column, aliaz = split_symbol(c)
        if aliaz
          table ? SQL::QualifiedIdentifier.new(table, column) : Sequel.identifier(column)
        else
          c
        end
      when SQL::AliasedExpression
        c.expression
      when SQL::OrderedExpression
        case expr = c.expression
        when Symbol, SQL::AliasedExpression
          SQL::OrderedExpression.new(unaliased_identifier(expr), c.descending, :nulls=>c.nulls)
        else
          c
        end
      else
        c
      end
    end

    # Cached dataset to use for with_sql_#{all,each,first,single_value}.
    # This is used so that the columns returned by the given SQL do not
    # affect the receiver of the with_sql_* method.
    def _with_sql_dataset
      if @opts[:_with_sql_ds]
        self
      else
        cached_dataset(:_with_sql_ds) do
          clone(:_with_sql_ds=>true)
        end
      end
    end
  end
end
