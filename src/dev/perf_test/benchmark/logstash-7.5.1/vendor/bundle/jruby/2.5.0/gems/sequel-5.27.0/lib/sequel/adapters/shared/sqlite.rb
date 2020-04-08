# frozen-string-literal: true

require_relative '../utils/replace'
require_relative '../utils/unmodified_identifiers'

module Sequel
  module SQLite
    Sequel::Database.set_shared_adapter_scheme(:sqlite, self)

    def self.mock_adapter_setup(db)
      db.instance_exec do
        @sqlite_version = 30903

        def schema_parse_table(*)
          []
        end
      end
    end
    
    # No matter how you connect to SQLite, the following Database options
    # can be used to set PRAGMAs on connections in a thread-safe manner:
    # :auto_vacuum, :foreign_keys, :synchronous, and :temp_store.
    module DatabaseMethods
      include UnmodifiedIdentifiers::DatabaseMethods

      AUTO_VACUUM = [:none, :full, :incremental].freeze
      SYNCHRONOUS = [:off, :normal, :full].freeze
      TEMP_STORE = [:default, :file, :memory].freeze
      TRANSACTION_MODE = {
        :deferred => "BEGIN DEFERRED TRANSACTION".freeze,
        :immediate => "BEGIN IMMEDIATE TRANSACTION".freeze,
        :exclusive => "BEGIN EXCLUSIVE TRANSACTION".freeze,
        nil => "BEGIN".freeze
      }.freeze

      # Whether to use integers for booleans in the database.  SQLite recommends
      # booleans be stored as integers, but historically Sequel has used 't'/'f'.
      attr_accessor :integer_booleans

      # A symbol signifying the value of the default transaction mode
      attr_reader :transaction_mode

      # Set the default transaction mode.
      def transaction_mode=(value)
        if TRANSACTION_MODE.include?(value)
          @transaction_mode = value
        else
          raise Error, "Invalid value for transaction_mode.  Please specify one of :deferred, :immediate, :exclusive, nil"
        end
      end

      # SQLite uses the :sqlite database type.
      def database_type
        :sqlite
      end
      
      # Set the integer_booleans option using the passed in :integer_boolean option.
      def set_integer_booleans
        @integer_booleans = @opts.has_key?(:integer_booleans) ? typecast_value_boolean(@opts[:integer_booleans]) : true
      end

      # Return the array of foreign key info hashes using the foreign_key_list PRAGMA,
      # including information for the :on_update and :on_delete entries.
      def foreign_key_list(table, opts=OPTS)
        m = output_identifier_meth
        h = {}
        _foreign_key_list_ds(table).each do |row|
          if r = h[row[:id]]
            r[:columns] << m.call(row[:from])
            r[:key] << m.call(row[:to]) if r[:key]
          else
            h[row[:id]] = {:columns=>[m.call(row[:from])], :table=>m.call(row[:table]), :key=>([m.call(row[:to])] if row[:to]), :on_update=>on_delete_sql_to_sym(row[:on_update]), :on_delete=>on_delete_sql_to_sym(row[:on_delete])}
          end
        end
        h.values
      end

      def freeze
        sqlite_version
        use_timestamp_timezones?
        super
      end

      # Use the index_list and index_info PRAGMAs to determine the indexes on the table.
      def indexes(table, opts=OPTS)
        m = output_identifier_meth
        im = input_identifier_meth
        indexes = {}
        table = table.value if table.is_a?(Sequel::SQL::Identifier)
        metadata_dataset.with_sql("PRAGMA index_list(?)", im.call(table)).each do |r|
          if opts[:only_autocreated]
            # If specifically asked for only autocreated indexes, then return those an only those
            next unless r[:name] =~ /\Asqlite_autoindex_/
          elsif r.has_key?(:origin)
            # If origin is set, then only exclude primary key indexes and partial indexes
            next if r[:origin] == 'pk'
            next if r[:partial].to_i == 1
          else
            # When :origin key not present, assume any autoindex could be a primary key one and exclude it
            next if r[:name] =~ /\Asqlite_autoindex_/
          end

          indexes[m.call(r[:name])] = {:unique=>r[:unique].to_i==1}
        end
        indexes.each do |k, v|
          v[:columns] = metadata_dataset.with_sql("PRAGMA index_info(?)", im.call(k)).map(:name).map{|x| m.call(x)}
        end
        indexes
      end

      # The version of the server as an integer, where 3.6.19 = 30619.
      # If the server version can't be determined, 0 is used.
      def sqlite_version
        return @sqlite_version if defined?(@sqlite_version)
        @sqlite_version = begin
          v = fetch('SELECT sqlite_version()').single_value
          [10000, 100, 1].zip(v.split('.')).inject(0){|a, m| a + m[0] * Integer(m[1])}
        rescue
          0
        end
      end
      
      # SQLite supports CREATE TABLE IF NOT EXISTS syntax since 3.3.0.
      def supports_create_table_if_not_exists?
        sqlite_version >= 30300
      end
      
      # SQLite 3.6.19+ supports deferrable foreign key constraints.
      def supports_deferrable_foreign_key_constraints?
        sqlite_version >= 30619
      end

      # SQLite 3.8.0+ supports partial indexes.
      def supports_partial_indexes?
        sqlite_version >= 30800
      end

      # SQLite 3.6.8+ supports savepoints. 
      def supports_savepoints?
        sqlite_version >= 30608
      end

      # Override the default setting for whether to use timezones in timestamps.
      # It is set to +false+ by default, as SQLite's date/time methods do not
      # support timezones in timestamps.
      attr_writer :use_timestamp_timezones

      # SQLite supports timezones in timestamps, since it just stores them as strings,
      # but it breaks the usage of SQLite's datetime functions.
      def use_timestamp_timezones?
        defined?(@use_timestamp_timezones) ? @use_timestamp_timezones : (@use_timestamp_timezones = false)
      end

      # Array of symbols specifying the table names in the current database.
      #
      # Options:
      # :server :: Set the server to use.
      def tables(opts=OPTS)
        tables_and_views(Sequel.~(:name=>'sqlite_sequence') & {:type => 'table'}, opts)
      end
      
      # Creates a dataset that uses the VALUES clause:
      #
      #   DB.values([[1, 2], [3, 4]])
      #   # VALUES ((1, 2), (3, 4))
      def values(v)
        @default_dataset.clone(:values=>v)
      end

      # Array of symbols specifying the view names in the current database.
      #
      # Options:
      # :server :: Set the server to use.
      def views(opts=OPTS)
        tables_and_views({:type => 'view'}, opts)
      end

      private

      # Dataset used for parsing foreign key lists
      def _foreign_key_list_ds(table)
        metadata_dataset.with_sql("PRAGMA foreign_key_list(?)", input_identifier_meth.call(table))
      end

      # Dataset used for parsing schema
      def _parse_pragma_ds(table_name, opts)
        metadata_dataset.with_sql("PRAGMA table_info(?)", input_identifier_meth(opts[:dataset]).call(table_name))
      end

      # Run all alter_table commands in a transaction.  This is technically only
      # needed for drop column.
      def apply_alter_table(table, ops)
        fks = fetch("PRAGMA foreign_keys")
        if fks
          run "PRAGMA foreign_keys = 0"
          run "PRAGMA legacy_alter_table = 1" if sqlite_version >= 32600
        end
        transaction do 
          if ops.length > 1 && ops.all?{|op| op[:op] == :add_constraint || op[:op] == :set_column_null}
            null_ops, ops = ops.partition{|op| op[:op] == :set_column_null}

            # Apply NULL/NOT NULL ops first, since those should be purely idependent of the constraints.
            null_ops.each{|op| alter_table_sql_list(table, [op]).flatten.each{|sql| execute_ddl(sql)}}

            # If you are just doing constraints, apply all of them at the same time,
            # as otherwise all but the last one get lost.
            alter_table_sql_list(table, [{:op=>:add_constraints, :ops=>ops}]).flatten.each{|sql| execute_ddl(sql)}
          else
            # Run each operation separately, as later operations may depend on the
            # results of earlier operations.
            ops.each{|op| alter_table_sql_list(table, [op]).flatten.each{|sql| execute_ddl(sql)}}
          end
        end
        remove_cached_schema(table)
      ensure
        if fks
          run "PRAGMA foreign_keys = 1"
          run "PRAGMA legacy_alter_table = 0" if sqlite_version >= 32600
        end
      end

      # SQLite supports limited table modification.  You can add a column
      # or an index.  Dropping columns is supported by copying the table into
      # a temporary table, dropping the table, and creating a new table without
      # the column inside of a transaction.
      def alter_table_sql(table, op)
        case op[:op]
        when :add_index, :drop_index
          super
        when :add_column
          if op[:unique] || op[:primary_key]
            duplicate_table(table){|columns| columns.push(op)}
          else
            super
          end
        when :drop_column
          ocp = lambda{|oc| oc.delete_if{|c| c.to_s == op[:name].to_s}}
          duplicate_table(table, :old_columns_proc=>ocp){|columns| columns.delete_if{|s| s[:name].to_s == op[:name].to_s}}
        when :rename_column
          if sqlite_version >= 32500
            super
          else
            ncp = lambda{|nc| nc.map!{|c| c.to_s == op[:name].to_s ? op[:new_name] : c}}
            duplicate_table(table, :new_columns_proc=>ncp){|columns| columns.each{|s| s[:name] = op[:new_name] if s[:name].to_s == op[:name].to_s}}
          end
        when :set_column_default
          duplicate_table(table){|columns| columns.each{|s| s[:default] = op[:default] if s[:name].to_s == op[:name].to_s}}
        when :set_column_null
          duplicate_table(table){|columns| columns.each{|s| s[:null] = op[:null] if s[:name].to_s == op[:name].to_s}}
        when :set_column_type
          duplicate_table(table){|columns| columns.each{|s| s.merge!(op) if s[:name].to_s == op[:name].to_s}}
        when :drop_constraint
          case op[:type]
          when :primary_key
            duplicate_table(table){|columns| columns.each{|s| s[:primary_key] = s[:auto_increment] = nil}}
          when :foreign_key
            if op[:columns]
              duplicate_table(table, :skip_foreign_key_columns=>op[:columns])
            else
              duplicate_table(table, :no_foreign_keys=>true)
            end
          else
            duplicate_table(table)
          end
        when :add_constraint
          duplicate_table(table, :constraints=>[op])
        when :add_constraints
          duplicate_table(table, :constraints=>op[:ops])
        else
          raise Error, "Unsupported ALTER TABLE operation: #{op[:op].inspect}"
        end
      end

      def begin_new_transaction(conn, opts)
        mode = opts[:mode] || @transaction_mode
        sql = TRANSACTION_MODE[mode] or raise Error, "transaction :mode must be one of: :deferred, :immediate, :exclusive, nil"
        log_connection_execute(conn, sql)
        set_transaction_isolation(conn, opts)
      end

      # A name to use for the backup table
      def backup_table_name(table, opts=OPTS)
        table = table.gsub('`', '')
        (opts[:times]||1000).times do |i|
          table_name = "#{table}_backup#{i}"
          return table_name unless table_exists?(table_name)
        end
      end

      # SQLite allows adding primary key constraints on NULLABLE columns, but then
      # does not enforce NOT NULL for such columns, so force setting the columns NOT NULL.
      def can_add_primary_key_constraint_on_nullable_columns?
        false
      end

      # Surround default with parens to appease SQLite
      def column_definition_default_sql(sql, column)
        sql << " DEFAULT (#{literal(column[:default])})" if column.include?(:default)
      end
    
      # Array of PRAGMA SQL statements based on the Database options that should be applied to
      # new connections.
      def connection_pragmas
        ps = []
        v = typecast_value_boolean(opts.fetch(:foreign_keys, 1))
        ps << "PRAGMA foreign_keys = #{v ? 1 : 0}"
        v = typecast_value_boolean(opts.fetch(:case_sensitive_like, 1))
        ps << "PRAGMA case_sensitive_like = #{v ? 1 : 0}"
        [[:auto_vacuum, AUTO_VACUUM], [:synchronous, SYNCHRONOUS], [:temp_store, TEMP_STORE]].each do |prag, con|
          if v = opts[prag]
            raise(Error, "Value for PRAGMA #{prag} not supported, should be one of #{con.join(', ')}") unless v = con.index(v.to_sym)
            ps << "PRAGMA #{prag} = #{v}"
          end
        end
        ps
      end

      # SQLite support creating temporary views.
      def create_view_prefix_sql(name, options)
        create_view_sql_append_columns("CREATE #{'TEMPORARY 'if options[:temp]}VIEW #{quote_schema_table(name)}", options[:columns])
      end

      DATABASE_ERROR_REGEXPS = {
        /(is|are) not unique\z|PRIMARY KEY must be unique\z|UNIQUE constraint failed: .+\z/ => UniqueConstraintViolation,
        /foreign key constraint failed\z/i => ForeignKeyConstraintViolation,
        /\A(SQLITE ERROR 275 \(CONSTRAINT_CHECK\) : )?CHECK constraint failed/ => CheckConstraintViolation,
        /\A(SQLITE ERROR 19 \(CONSTRAINT\) : )?constraint failed\z/ => ConstraintViolation,
        /may not be NULL\z|NOT NULL constraint failed: .+\z/ => NotNullConstraintViolation,
        /\ASQLITE ERROR \d+ \(\) : CHECK constraint failed: / => CheckConstraintViolation
      }.freeze
      def database_error_regexps
        DATABASE_ERROR_REGEXPS
      end

      # Recognize SQLite error codes if the exception provides access to them.
      def database_specific_error_class(exception, opts)
        case sqlite_error_code(exception)
        when 1299
          NotNullConstraintViolation
        when 1555, 2067, 2579
          UniqueConstraintViolation
        when 787
          ForeignKeyConstraintViolation
        when 275
          CheckConstraintViolation
        when 19
          ConstraintViolation
        when 517
          SerializationFailure
        else
          super
        end
      end

      # The array of column schema hashes for the current columns in the table
      def defined_columns_for(table)
        cols = parse_pragma(table, OPTS)
        cols.each do |c|
          c[:default] = LiteralString.new(c[:default]) if c[:default]
          c[:type] = c[:db_type]
        end
        cols
      end

      # Duplicate an existing table by creating a new table, copying all records
      # from the existing table into the new table, deleting the existing table
      # and renaming the new table to the existing table's name.
      def duplicate_table(table, opts=OPTS)
        remove_cached_schema(table)
        def_columns = defined_columns_for(table)
        old_columns = def_columns.map{|c| c[:name]}
        opts[:old_columns_proc].call(old_columns) if opts[:old_columns_proc]

        yield def_columns if block_given?

        constraints = (opts[:constraints] || []).dup
        pks = []
        def_columns.each{|c| pks << c[:name] if c[:primary_key]}
        if pks.length > 1
          constraints << {:type=>:primary_key, :columns=>pks}
          def_columns.each{|c| c[:primary_key] = false if c[:primary_key]}
        end

        # If dropping a foreign key constraint, drop all foreign key constraints,
        # as there is no way to determine which one to drop.
        unless opts[:no_foreign_keys]
          fks = foreign_key_list(table)

          # If dropping a column, if there is a foreign key with that
          # column, don't include it when building a copy of the table.
          if ocp = opts[:old_columns_proc]
            fks.delete_if{|c| ocp.call(c[:columns].dup) != c[:columns]}
          end
          
          # Skip any foreign key columns where a constraint for those
          # foreign keys is being dropped.
          if sfkc = opts[:skip_foreign_key_columns]
            fks.delete_if{|c| c[:columns] == sfkc}
          end

          constraints.concat(fks.each{|h| h[:type] = :foreign_key})
        end

        # Determine unique constraints and make sure the new columns have them
        unique_columns = []
        skip_indexes = []
        indexes(table, :only_autocreated=>true).each do |name, h|
          skip_indexes << name
          if h[:columns].length == 1 && h[:unique]
            unique_columns.concat(h[:columns])
          end
        end
        unique_columns -= pks
        unless unique_columns.empty?
          unique_columns.map!{|c| quote_identifier(c)}
          def_columns.each do |c|
            c[:unique] = true if unique_columns.include?(quote_identifier(c[:name]))
          end
        end
        
        def_columns_str = (def_columns.map{|c| column_definition_sql(c)} + constraints.map{|c| constraint_definition_sql(c)}).join(', ')
        new_columns = old_columns.dup
        opts[:new_columns_proc].call(new_columns) if opts[:new_columns_proc]

        qt = quote_schema_table(table)
        bt = quote_identifier(backup_table_name(qt))
        a = [
           "ALTER TABLE #{qt} RENAME TO #{bt}",
           "CREATE TABLE #{qt}(#{def_columns_str})",
           "INSERT INTO #{qt}(#{dataset.send(:identifier_list, new_columns)}) SELECT #{dataset.send(:identifier_list, old_columns)} FROM #{bt}",
           "DROP TABLE #{bt}"
        ]
        indexes(table).each do |name, h|
          next if skip_indexes.include?(name)
          if (h[:columns].map(&:to_s) - new_columns).empty?
            a << alter_table_sql(table, h.merge(:op=>:add_index, :name=>name))
          end
        end
        a
      end

      # Does the reverse of on_delete_clause, eg. converts strings like +'SET NULL'+
      # to symbols +:set_null+.
      def on_delete_sql_to_sym(str)
        case str
        when 'RESTRICT'
          :restrict
        when 'CASCADE'
          :cascade
        when 'SET NULL'
          :set_null
        when 'SET DEFAULT'
          :set_default
        when 'NO ACTION'
          :no_action
        end
      end

      # Parse the output of the table_info pragma
      def parse_pragma(table_name, opts)
        pks = 0
        sch = _parse_pragma_ds(table_name, opts).map do |row|
          row.delete(:cid)
          row[:allow_null] = row.delete(:notnull).to_i == 0
          row[:default] = row.delete(:dflt_value)
          row[:default] = nil if blank_object?(row[:default]) || row[:default] == 'NULL'
          row[:db_type] = row.delete(:type)
          if row[:primary_key] = row.delete(:pk).to_i > 0
            pks += 1
            # Guess that an integer primary key uses auto increment,
            # since that is Sequel's default and SQLite does not provide
            # a way to introspect whether it is actually autoincrementing.
            row[:auto_increment] = row[:db_type].downcase == 'integer'
          end
          row[:type] = schema_column_type(row[:db_type])
          row
        end

        if pks > 1
          # SQLite does not allow use of auto increment for tables
          # with composite primary keys, so remove auto_increment
          # if composite primary keys are detected.
          sch.each{|r| r.delete(:auto_increment)}
        end

        sch
      end
      
      # SQLite supports schema parsing using the table_info PRAGMA, so
      # parse the output of that into the format Sequel expects.
      def schema_parse_table(table_name, opts)
        m = output_identifier_meth(opts[:dataset])
        parse_pragma(table_name, opts).map do |row|
          [m.call(row.delete(:name)), row]
        end
      end
      
      # Don't support SQLite error codes for exceptions by default.
      def sqlite_error_code(exception)
        nil
      end

      # Backbone of the tables and views support.
      def tables_and_views(filter, opts)
        m = output_identifier_meth
        metadata_dataset.from(:sqlite_master).server(opts[:server]).where(filter).map{|r| m.call(r[:name])}
      end

      # SQLite only supports AUTOINCREMENT on integer columns, not
      # bigint columns, so use integer instead of bigint for those
      # columns.
      def type_literal_generic_bignum_symbol(column)
        column[:auto_increment] ? :integer : super
      end
    end
    
    module DatasetMethods
      include Dataset::Replace
      include UnmodifiedIdentifiers::DatasetMethods

      # The allowed values for insert_conflict
      INSERT_CONFLICT_RESOLUTIONS = %w'ROLLBACK ABORT FAIL IGNORE REPLACE'.each(&:freeze).freeze

      CONSTANT_MAP = {:CURRENT_DATE=>"date(CURRENT_TIMESTAMP, 'localtime')".freeze, :CURRENT_TIMESTAMP=>"datetime(CURRENT_TIMESTAMP, 'localtime')".freeze, :CURRENT_TIME=>"time(CURRENT_TIMESTAMP, 'localtime')".freeze}.freeze
      EXTRACT_MAP = {:year=>"'%Y'", :month=>"'%m'", :day=>"'%d'", :hour=>"'%H'", :minute=>"'%M'", :second=>"'%f'"}.freeze
      EXTRACT_MAP.each_value(&:freeze)

      Dataset.def_sql_method(self, :delete, [['if db.sqlite_version >= 30803', %w'with delete from where'], ["else", %w'delete from where']])
      Dataset.def_sql_method(self, :insert, [['if db.sqlite_version >= 30803', %w'with insert conflict into columns values on_conflict'], ["else", %w'insert conflict into columns values']])
      Dataset.def_sql_method(self, :select, [['if opts[:values]', %w'with values compounds'], ['else', %w'with select distinct columns from join where group having window compounds order limit lock']])
      Dataset.def_sql_method(self, :update, [['if db.sqlite_version >= 30803', %w'with update table set where'], ["else", %w'update table set where']])

      def cast_sql_append(sql, expr, type)
        if type == Time or type == DateTime
          sql << "datetime("
          literal_append(sql, expr)
          sql << ')'
        elsif type == Date
          sql << "date("
          literal_append(sql, expr)
          sql << ')'
        else
          super
        end
      end

      # SQLite doesn't support a NOT LIKE b, you need to use NOT (a LIKE b).
      # It doesn't support xor, power, or the extract function natively, so those have to be emulated.
      def complex_expression_sql_append(sql, op, args)
        case op
        when :"NOT LIKE", :"NOT ILIKE"
          sql << 'NOT '
          complex_expression_sql_append(sql, (op == :"NOT ILIKE" ? :ILIKE : :LIKE), args)
        when :^
          complex_expression_arg_pairs_append(sql, args){|a, b| Sequel.lit(["((~(", " & ", ")) & (", " | ", "))"], a, b, a, b)}
        when :**
          unless (exp = args[1]).is_a?(Integer)
            raise(Sequel::Error, "can only emulate exponentiation on SQLite if exponent is an integer, given #{exp.inspect}")
          end
          case exp
          when 0
            sql << '1'
          else
            sql << '('
            arg = args[0]
            if exp < 0
              invert = true
              exp = exp.abs
              sql << '(1.0 / ('
            end
            (exp - 1).times do 
              literal_append(sql, arg)
              sql << " * "
            end
            literal_append(sql, arg)
            sql << ')'
            if invert
              sql << "))"
            end
          end
        when :extract
          part = args[0]
          raise(Sequel::Error, "unsupported extract argument: #{part.inspect}") unless format = EXTRACT_MAP[part]
          sql << "CAST(strftime(" << format << ', '
          literal_append(sql, args[1])
          sql << ') AS ' << (part == :second ? 'NUMERIC' : 'INTEGER') << ')'
        else
          super
        end
      end
      
      # SQLite has CURRENT_TIMESTAMP and related constants in UTC instead
      # of in localtime, so convert those constants to local time.
      def constant_sql_append(sql, constant)
        if c = CONSTANT_MAP[constant]
          sql << c
        else
          super
        end
      end
      
      # SQLite performs a TRUNCATE style DELETE if no filter is specified.
      # Since we want to always return the count of records, add a condition
      # that is always true and then delete.
      def delete
        @opts[:where] ? super : where(1=>1).delete
      end
      
      # Return an array of strings specifying a query explanation for a SELECT of the
      # current dataset. Currently, the options are ignored, but it accepts options
      # to be compatible with other adapters.
      def explain(opts=nil)
        # Load the PrettyTable class, needed for explain output
        Sequel.extension(:_pretty_table) unless defined?(Sequel::PrettyTable)

        ds = db.send(:metadata_dataset).clone(:sql=>"EXPLAIN #{select_sql}")
        rows = ds.all
        Sequel::PrettyTable.string(rows, ds.columns)
      end
      
      # HAVING requires GROUP BY on SQLite
      def having(*cond)
        raise(InvalidOperation, "Can only specify a HAVING clause on a grouped dataset") unless @opts[:group]
        super
      end
      
      # SQLite uses the nonstandard ` (backtick) for quoting identifiers.
      def quoted_identifier_append(sql, c)
        sql << '`' << c.to_s.gsub('`', '``') << '`'
      end
      
      # When a qualified column is selected on SQLite and the qualifier
      # is a subselect, the column name used is the full qualified name
      # (including the qualifier) instead of just the column name.  To
      # get correct column names, you must use an alias.
      def select(*cols)
        if ((f = @opts[:from]) && f.any?{|t| t.is_a?(Dataset) || (t.is_a?(SQL::AliasedExpression) && t.expression.is_a?(Dataset))}) || ((j = @opts[:join]) && j.any?{|t| t.table.is_a?(Dataset)})
          super(*cols.map{|c| alias_qualified_column(c)})
        else
          super
        end
      end

      # Handle uniqueness violations when inserting, by using a specified
      # resolution algorithm. With no options, uses INSERT OR REPLACE. SQLite
      # supports the following conflict resolution algoriths: ROLLBACK, ABORT,
      # FAIL, IGNORE and REPLACE.
      #
      # On SQLite 3.24.0+, you can pass a hash to use an ON CONFLICT clause.
      # With out :update option, uses ON CONFLICT DO NOTHING.  Options:
      #
      # :conflict_where :: The index filter, when using a partial index to determine uniqueness.
      # :target :: The column name or expression to handle uniqueness violations on.
      # :update :: A hash of columns and values to set.  Uses ON CONFLICT DO UPDATE.
      # :update_where :: A WHERE condition to use for the update.
      #
      # Examples:
      #
      #   DB[:table].insert_conflict.insert(a: 1, b: 2)
      #   # INSERT OR IGNORE INTO TABLE (a, b) VALUES (1, 2)
      #
      #   DB[:table].insert_conflict(:replace).insert(a: 1, b: 2)
      #   # INSERT OR REPLACE INTO TABLE (a, b) VALUES (1, 2)
      #
      #   DB[:table].insert_conflict({}).insert(a: 1, b: 2)
      #   # INSERT INTO TABLE (a, b) VALUES (1, 2)
      #   # ON CONFLICT DO NOTHING
      #   
      #   DB[:table].insert_conflict(target: :a).insert(a: 1, b: 2)
      #   # INSERT INTO TABLE (a, b) VALUES (1, 2)
      #   # ON CONFLICT (a) DO NOTHING
      #
      #   DB[:table].insert_conflict(target: :a, conflict_where: {c: true}).insert(a: 1, b: 2)
      #   # INSERT INTO TABLE (a, b) VALUES (1, 2)
      #   # ON CONFLICT (a) WHERE (c IS TRUE) DO NOTHING
      #   
      #   DB[:table].insert_conflict(target: :a, update: {b: Sequel[:excluded][:b]}).insert(a: 1, b: 2)
      #   # INSERT INTO TABLE (a, b) VALUES (1, 2)
      #   # ON CONFLICT (a) DO UPDATE SET b = excluded.b
      #   
      #   DB[:table].insert_conflict(target: :a,
      #     update: {b: Sequel[:excluded][:b]}, update_where: {Sequel[:table][:status_id] => 1}).insert(a: 1, b: 2)
      #   # INSERT INTO TABLE (a, b) VALUES (1, 2)
      #   # ON CONFLICT (a) DO UPDATE SET b = excluded.b WHERE (table.status_id = 1)
      def insert_conflict(opts = :ignore)
        case opts
        when Symbol, String
          unless INSERT_CONFLICT_RESOLUTIONS.include?(opts.to_s.upcase)
            raise Error, "Invalid symbol or string passed to Dataset#insert_conflict: #{opts.inspect}.  The allowed values are: :rollback, :abort, :fail, :ignore, or :replace"
          end
          clone(:insert_conflict => opts)
        when Hash
          clone(:insert_on_conflict => opts)
        else
          raise Error, "Invalid value passed to Dataset#insert_conflict: #{opts.inspect}, should use a symbol or a hash"
        end
      end

      # Ignore uniqueness/exclusion violations when inserting, using INSERT OR IGNORE.
      # Exists mostly for compatibility to MySQL's insert_ignore. Example:
      #
      #   DB[:table].insert_ignore.insert(a: 1, b: 2)
      #   # INSERT OR IGNORE INTO TABLE (a, b) VALUES (1, 2)
      def insert_ignore
        insert_conflict(:ignore)
      end

      # SQLite 3.8.3+ supports common table expressions.
      def supports_cte?(type=:select)
        db.sqlite_version >= 30803
      end

      # SQLite supports CTEs in subqueries if it supports CTEs.
      def supports_cte_in_subqueries?
        supports_cte?
      end

      # SQLite does not support table aliases with column aliases
      def supports_derived_column_lists?
        false
      end

      # SQLite does not support INTERSECT ALL or EXCEPT ALL
      def supports_intersect_except_all?
        false
      end

      # SQLite does not support IS TRUE
      def supports_is_true?
        false
      end
      
      # SQLite does not support multiple columns for the IN/NOT IN operators
      def supports_multiple_column_in?
        false
      end
      
      # SQLite supports timezones in literal timestamps, since it stores them
      # as text.  But using timezones in timestamps breaks SQLite datetime
      # functions, so we allow the user to override the default per database.
      def supports_timestamp_timezones?
        db.use_timestamp_timezones?
      end

      # SQLite cannot use WHERE 't'.
      def supports_where_true?
        false
      end

      # SQLite 3.28+ supports the WINDOW clause.
      def supports_window_clause?
        db.sqlite_version >= 32800
      end
      
      # SQLite 3.25+ supports window functions.  However, support is only enabled
      # on SQLite 3.26.0+ because internal Sequel usage of window functions
      # to implement eager loading of limited associations triggers
      # an SQLite crash bug in versions 3.25.0-3.25.3.
      def supports_window_functions?
        db.sqlite_version >= 32600
      end
    
      # SQLite 3.28.0+ supports all window frame options that Sequel supports
      def supports_window_function_frame_option?(option)
        db.sqlite_version >= 32800 ? true : super
      end

      private
      
      # SQLite uses string literals instead of identifiers in AS clauses.
      def as_sql_append(sql, aliaz, column_aliases=nil)
        raise Error, "sqlite does not support derived column lists" if column_aliases
        aliaz = aliaz.value if aliaz.is_a?(SQL::Identifier)
        sql << ' AS '
        literal_append(sql, aliaz.to_s)
      end

      # If col is a qualified column, alias it to the same as the column name
      def alias_qualified_column(col)
        case col
        when Symbol
          t, c, a = split_symbol(col)
          if t && !a
            alias_qualified_column(SQL::QualifiedIdentifier.new(t, c))
          else
            col
          end
        when SQL::QualifiedIdentifier
          SQL::AliasedExpression.new(col, col.column)
        else
          col
        end
      end

      # SQLite supports a maximum of 500 rows in a VALUES clause.
      def default_import_slice
        500
      end

      # SQL fragment specifying a list of identifiers
      def identifier_list(columns)
        columns.map{|i| quote_identifier(i)}.join(', ')
      end
    
      # Add OR clauses to SQLite INSERT statements
      def insert_conflict_sql(sql)
        if resolution = @opts[:insert_conflict]
          sql << " OR " << resolution.to_s.upcase
        end
      end

      # Add ON CONFLICT clause if it should be used
      def insert_on_conflict_sql(sql)
        if opts = @opts[:insert_on_conflict]
          sql << " ON CONFLICT"

          if target = opts[:constraint] 
            sql << " ON CONSTRAINT "
            identifier_append(sql, target)
          elsif target = opts[:target]
            sql << ' '
            identifier_append(sql, Array(target))
            if conflict_where = opts[:conflict_where]
              sql << " WHERE "
              literal_append(sql, conflict_where)
            end
          end

          if values = opts[:update]
            sql << " DO UPDATE SET "
            update_sql_values_hash(sql, values)
            if update_where = opts[:update_where]
              sql << " WHERE "
              literal_append(sql, update_where)
            end
          else
            sql << " DO NOTHING"
          end
        end
      end

      # SQLite uses a preceding X for hex escaping strings
      def literal_blob_append(sql, v)
        sql <<  "X'" << v.unpack("H*").first << "'"
      end

      # Respect the database integer_booleans setting, using 0 or 'f'.
      def literal_false
        @db.integer_booleans ? '0' : "'f'"
      end

      # Respect the database integer_booleans setting, using 1 or 't'.
      def literal_true
        @db.integer_booleans ? '1' : "'t'"
      end

      # SQLite only supporting multiple rows in the VALUES clause
      # starting in 3.7.11.  On older versions, fallback to using a UNION.
      def multi_insert_sql_strategy
        db.sqlite_version >= 30711 ? :values : :union
      end

      # Emulate the char_length function with length
      def native_function_name(emulated_function)
        if emulated_function == :char_length
          'length'
        else
          super
        end
      end

      # SQLite supports NULLS FIRST/LAST natively in 3.30+.
      def requires_emulating_nulls_first?
        db.sqlite_version < 33000
      end

      # SQLite does not support FOR UPDATE, but silently ignore it
      # instead of raising an error for compatibility with other
      # databases.
      def select_lock_sql(sql)
        super unless @opts[:lock] == :update
      end

      def select_only_offset_sql(sql)
        sql << " LIMIT -1 OFFSET "
        literal_append(sql, @opts[:offset])
      end
  
      # Support VALUES clause instead of the SELECT clause to return rows.
      def select_values_sql(sql)
        sql << "VALUES "
        expression_list_append(sql, opts[:values])
      end

      # SQLite does not support CTEs directly inside UNION/INTERSECT/EXCEPT.
      def supports_cte_in_compounds?
        false
      end

      # SQLite 3.30 supports the FILTER clause for aggregate functions.
      def supports_filtered_aggregates?
        db.sqlite_version >= 33000
      end

      # SQLite supports quoted function names.
      def supports_quoted_function_names?
        true
      end

      # SQLite treats a DELETE with no WHERE clause as a TRUNCATE
      def _truncate_sql(table)
        "DELETE FROM #{table}"
      end
    end
  end
end
