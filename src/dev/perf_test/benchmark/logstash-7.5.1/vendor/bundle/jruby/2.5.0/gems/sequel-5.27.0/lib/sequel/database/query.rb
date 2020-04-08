# frozen-string-literal: true

module Sequel
  class Database
    # ---------------------
    # :section: 1 - Methods that execute queries and/or return results
    # This methods generally execute SQL code on the database server.
    # ---------------------

    COLUMN_SCHEMA_DATETIME_TYPES = [:date, :datetime].freeze
    COLUMN_SCHEMA_STRING_TYPES = [:string, :blob, :date, :datetime, :time, :enum, :set, :interval].freeze

    # The prepared statement object hash for this database, keyed by name symbol
    attr_reader :prepared_statements
    
    # Whether the schema should be cached for this database.  True by default
    # for performance, can be set to false to always issue a database query to
    # get the schema.
    attr_accessor :cache_schema
    
    # Runs the supplied SQL statement string on the database server.
    # Returns self so it can be safely chained:
    #
    #   DB << "UPDATE albums SET artist_id = NULL" << "DROP TABLE artists"
    def <<(sql)
      run(sql)
      self
    end
    
    # Call the prepared statement with the given name with the given hash
    # of arguments.
    #
    #   DB[:items].where(id: 1).prepare(:first, :sa)
    #   DB.call(:sa) # SELECT * FROM items WHERE id = 1
    def call(ps_name, hash=OPTS, &block)
      prepared_statement(ps_name).call(hash, &block)
    end
    
    # Method that should be used when submitting any DDL (Data Definition
    # Language) SQL, such as +create_table+.  By default, calls +execute_dui+.
    # This method should not be called directly by user code.
    def execute_ddl(sql, opts=OPTS, &block)
      execute_dui(sql, opts, &block)
    end

    # Method that should be used when issuing a DELETE or UPDATE
    # statement.  By default, calls execute.
    # This method should not be called directly by user code.
    def execute_dui(sql, opts=OPTS, &block)
      execute(sql, opts, &block)
    end

    # Method that should be used when issuing a INSERT
    # statement.  By default, calls execute_dui.
    # This method should not be called directly by user code.
    def execute_insert(sql, opts=OPTS, &block)
      execute_dui(sql, opts, &block)
    end

    # Returns a single value from the database, see Dataset#get.
    #
    #   DB.get(1) # SELECT 1
    #   # => 1
    #   DB.get{server_version.function} # SELECT server_version()
    def get(*args, &block)
      @default_dataset.get(*args, &block)
    end
    
    # Runs the supplied SQL statement string on the database server. Returns nil.
    # Options:
    # :server :: The server to run the SQL on.
    #
    #   DB.run("SET some_server_variable = 42")
    def run(sql, opts=OPTS)
      sql = literal(sql) if sql.is_a?(SQL::PlaceholderLiteralString)
      execute_ddl(sql, opts)
      nil
    end
    
    # Returns the schema for the given table as an array with all members being arrays of length 2,
    # the first member being the column name, and the second member being a hash of column information.
    # The table argument can also be a dataset, as long as it only has one table.
    # Available options are:
    #
    # :reload :: Ignore any cached results, and get fresh information from the database.
    # :schema :: An explicit schema to use.  It may also be implicitly provided
    #            via the table name.
    #
    # If schema parsing is supported by the database, the column information hash should contain at least the
    # following entries:
    #
    # :allow_null :: Whether NULL is an allowed value for the column.
    # :db_type :: The database type for the column, as a database specific string.
    # :default :: The database default for the column, as a database specific string, or nil if there is
    #             no default value.
    # :primary_key :: Whether the columns is a primary key column.  If this column is not present,
    #                 it means that primary key information is unavailable, not that the column
    #                 is not a primary key.
    # :ruby_default :: The database default for the column, as a ruby object.  In many cases, complex
    #                  database defaults cannot be parsed into ruby objects, in which case nil will be
    #                  used as the value.
    # :type :: A symbol specifying the type, such as :integer or :string.
    #
    # Example:
    #
    #   DB.schema(:artists)
    #   # [[:id,
    #   #   {:type=>:integer,
    #   #    :primary_key=>true,
    #   #    :default=>"nextval('artist_id_seq'::regclass)",
    #   #    :ruby_default=>nil,
    #   #    :db_type=>"integer",
    #   #    :allow_null=>false}],
    #   #  [:name,
    #   #   {:type=>:string,
    #   #    :primary_key=>false,
    #   #    :default=>nil,
    #   #    :ruby_default=>nil,
    #   #    :db_type=>"text",
    #   #    :allow_null=>false}]]
    def schema(table, opts=OPTS)
      raise(Error, 'schema parsing is not implemented on this database') unless supports_schema_parsing?

      opts = opts.dup
      tab = if table.is_a?(Dataset)
        o = table.opts
        from = o[:from]
        raise(Error, "can only parse the schema for a dataset with a single from table") unless from && from.length == 1 && !o.include?(:join) && !o.include?(:sql)
        table.first_source_table
      else
        table
      end

      qualifiers = split_qualifiers(tab)
      table_name = qualifiers.pop
      sch = qualifiers.pop
      information_schema_schema = case qualifiers.length
      when 1
        Sequel.identifier(*qualifiers)
      when 2
        Sequel.qualify(*qualifiers)
      end

      if table.is_a?(Dataset)
        quoted_name = table.literal(tab)
        opts[:dataset] = table
      else
        quoted_name = schema_utility_dataset.literal(table)
      end

      opts[:schema] = sch if sch && !opts.include?(:schema)
      opts[:information_schema_schema] = information_schema_schema if information_schema_schema && !opts.include?(:information_schema_schema)

      Sequel.synchronize{@schemas.delete(quoted_name)} if opts[:reload]
      if v = Sequel.synchronize{@schemas[quoted_name]}
        return v
      end

      cols = schema_parse_table(table_name, opts)
      raise(Error, "schema parsing returned no columns, table #{table_name.inspect} probably doesn't exist") if cols.nil? || cols.empty?

      primary_keys = 0
      auto_increment_set = false
      cols.each do |_,c|
        auto_increment_set = true if c.has_key?(:auto_increment)
        primary_keys += 1 if c[:primary_key]
      end

      cols.each do |_,c|
        c[:ruby_default] = column_schema_to_ruby_default(c[:default], c[:type]) unless c.has_key?(:ruby_default)
        if c[:primary_key] && !auto_increment_set
          # If adapter didn't set it, assume that integer primary keys are auto incrementing
          c[:auto_increment] = primary_keys == 1 && !!(c[:db_type] =~ /int/io)
        end
        if !c[:max_length] && c[:type] == :string && (max_length = column_schema_max_length(c[:db_type]))
          c[:max_length] = max_length
        end
      end
      schema_post_process(cols)

      Sequel.synchronize{@schemas[quoted_name] = cols} if cache_schema
      cols
    end

    # Returns true if a table with the given name exists.  This requires a query
    # to the database.
    #
    #   DB.table_exists?(:foo) # => false
    #   # SELECT NULL FROM foo LIMIT 1
    #
    # Note that since this does a SELECT from the table, it can give false negatives
    # if you don't have permission to SELECT from the table.
    def table_exists?(name)
      sch, table_name = schema_and_table(name)
      name = SQL::QualifiedIdentifier.new(sch, table_name) if sch
      ds = from(name)
      transaction(:savepoint=>:only){_table_exists?(ds)}
      true
    rescue DatabaseError
      false
    end

    private
    
    # Should raise an error if the table doesn't not exist,
    # and not raise an error if the table does exist.
    def _table_exists?(ds)
      ds.get(SQL::AliasedExpression.new(Sequel::NULL, :nil))
    end
    
    # Whether the type should be treated as a string type when parsing the
    # column schema default value.
    def column_schema_default_string_type?(type)
      COLUMN_SCHEMA_STRING_TYPES.include?(type)
    end

    # Transform the given normalized default string into a ruby object for the
    # given type.
    def column_schema_default_to_ruby_value(default, type)
      case type
      when :boolean
        case default 
        when /[f0]/i
          false
        when /[t1]/i
          true
        end
      when :string, :enum, :set, :interval
        default
      when :blob
        Sequel::SQL::Blob.new(default)
      when :integer
        Integer(default)
      when :float
        Float(default)
      when :date
        Sequel.string_to_date(default)
      when :datetime
        DateTime.parse(default)
      when :time
        Sequel.string_to_time(default)
      when :decimal
        BigDecimal(default)
      end
    end
   
    # Normalize the default value string for the given type
    # and return the normalized value.
    def column_schema_normalize_default(default, type)
      if column_schema_default_string_type?(type)
        return unless m = /\A'(.*)'\z/.match(default)
        m[1].gsub("''", "'")
      else
        default
      end
    end

    # Convert the given default, which should be a database specific string, into
    # a ruby object.
    def column_schema_to_ruby_default(default, type)
      return default unless default.is_a?(String)
      if COLUMN_SCHEMA_DATETIME_TYPES.include?(type)
        if /now|today|CURRENT|getdate|\ADate\(\)\z/i.match(default)
          if type == :date
            return Sequel::CURRENT_DATE
          else
            return Sequel::CURRENT_TIMESTAMP
          end
        end
      end
      default = column_schema_normalize_default(default, type)
      column_schema_default_to_ruby_value(default, type) rescue nil
    end

    # Look at the db_type and guess the maximum length of the column.
    # This assumes types such as varchar(255).
    def column_schema_max_length(db_type)
      if db_type =~ /\((\d+)\)/
        $1.to_i
      end
    end

    # Return a Method object for the dataset's output_identifier_method.
    # Used in metadata parsing to make sure the returned information is in the
    # correct format.
    def input_identifier_meth(ds=nil)
      (ds || dataset).method(:input_identifier)
    end
    
    # Uncached version of metadata_dataset, designed for overriding.
    def _metadata_dataset
      dataset
    end

    # Return a dataset that uses the default identifier input and output methods
    # for this database.  Used when parsing metadata so that column symbols are
    # returned as expected.
    def metadata_dataset
      @metadata_dataset ||= _metadata_dataset
    end

    # Return a Method object for the dataset's output_identifier_method.
    # Used in metadata parsing to make sure the returned information is in the
    # correct format.
    def output_identifier_meth(ds=nil)
      (ds || dataset).method(:output_identifier)
    end

    # Remove the cached schema for the given schema name
    def remove_cached_schema(table)
      cache = @default_dataset.send(:cache)
      Sequel.synchronize{cache.clear}
      k = quote_schema_table(table)
      Sequel.synchronize{@schemas.delete(k)}
    end
    
    # Match the database's column type to a ruby type via a
    # regular expression, and return the ruby type as a symbol
    # such as :integer or :string.
    def schema_column_type(db_type)
      case db_type
      when /\A(character( varying)?|n?(var)?char|n?text|string|clob)/io
        :string
      when /\A(int(eger)?|(big|small|tiny)int)/io
        :integer
      when /\Adate\z/io
        :date
      when /\A((small)?datetime|timestamp( with(out)? time zone)?)(\(\d+\))?\z/io
        :datetime
      when /\Atime( with(out)? time zone)?\z/io
        :time
      when /\A(bool(ean)?)\z/io
        :boolean
      when /\A(real|float( unsigned)?|double( precision)?|double\(\d+,\d+\)( unsigned)?)\z/io
        :float
      when /\A(?:(?:(?:num(?:ber|eric)?|decimal)(?:\(\d+,\s*(\d+|false|true)\))?))\z/io
        $1 && ['0', 'false'].include?($1) ? :integer : :decimal
      when /bytea|blob|image|(var)?binary/io
        :blob
      when /\Aenum/io
        :enum
      end
    end

    # Post process the schema values.  
    def schema_post_process(cols)
      if RUBY_VERSION >= '2.5'
        cols.each do |_, h|
          db_type = h[:db_type]
          if db_type.is_a?(String)
            h[:db_type] = -db_type
          end
        end
      end

      cols.each do |_,c|
        c.each_value do |val|
          val.freeze if val.is_a?(String)
        end
      end
    end
  end
end
