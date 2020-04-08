# frozen-string-literal: true

require_relative '../utils/replace'
require_relative '../utils/split_alter_table'
require_relative '../utils/unmodified_identifiers'

module Sequel
  module MySQL
    Sequel::Database.set_shared_adapter_scheme(:mysql, self)

    def self.mock_adapter_setup(db)
      db.instance_exec do
        @server_version = 50617
      end
    end

    module DatabaseMethods
      include UnmodifiedIdentifiers::DatabaseMethods
      include Sequel::Database::SplitAlterTable

      CAST_TYPES = {String=>:CHAR, Integer=>:SIGNED, Time=>:DATETIME, DateTime=>:DATETIME, Numeric=>:DECIMAL, BigDecimal=>:DECIMAL, File=>:BINARY}.freeze
      COLUMN_DEFINITION_ORDER = [:generated, :collate, :null, :default, :unique, :primary_key, :auto_increment, :references].freeze
      
      # Set the default charset used for CREATE TABLE.  You can pass the
      # :charset option to create_table to override this setting.
      attr_accessor :default_charset

      # Set the default collation used for CREATE TABLE.  You can pass the
      # :collate option to create_table to override this setting.
      attr_accessor :default_collate

      # Set the default engine used for CREATE TABLE.  You can pass the
      # :engine option to create_table to override this setting.
      attr_accessor :default_engine

      # MySQL's cast rules are restrictive in that you can't just cast to any possible
      # database type.
      def cast_type_literal(type)
        CAST_TYPES[type] || super
      end

      def commit_prepared_transaction(transaction_id, opts=OPTS)
        run("XA COMMIT #{literal(transaction_id)}", opts)
      end

      def database_type
        :mysql
      end

      # Use the Information Schema's KEY_COLUMN_USAGE table to get
      # basic information on foreign key columns, but include the
      # constraint name.
      def foreign_key_list(table, opts=OPTS)
        m = output_identifier_meth
        im = input_identifier_meth
        ds = metadata_dataset.
          from(Sequel[:INFORMATION_SCHEMA][:KEY_COLUMN_USAGE]).
          where(:TABLE_NAME=>im.call(table), :TABLE_SCHEMA=>Sequel.function(:DATABASE)).
          exclude(:CONSTRAINT_NAME=>'PRIMARY').
          exclude(:REFERENCED_TABLE_NAME=>nil).
          order(:CONSTRAINT_NAME, :POSITION_IN_UNIQUE_CONSTRAINT).
          select(Sequel[:CONSTRAINT_NAME].as(:name), Sequel[:COLUMN_NAME].as(:column), Sequel[:REFERENCED_TABLE_NAME].as(:table), Sequel[:REFERENCED_COLUMN_NAME].as(:key))
        
        h = {}
        ds.each do |row|
          if r = h[row[:name]]
            r[:columns] << m.call(row[:column])
            r[:key] << m.call(row[:key])
          else
            h[row[:name]] = {:name=>m.call(row[:name]), :columns=>[m.call(row[:column])], :table=>m.call(row[:table]), :key=>[m.call(row[:key])]}
          end
        end
        h.values
      end

      def freeze
        server_version
        mariadb?
        supports_timestamp_usecs?
        super
      end

      # MySQL namespaces indexes per table.
      def global_index_namespace?
        false
      end

      # Use SHOW INDEX FROM to get the index information for the
      # table.
      #
      # By default partial indexes are not included, you can use the
      # option :partial to override this.
      def indexes(table, opts=OPTS)
        indexes = {}
        remove_indexes = []
        m = output_identifier_meth
        schema, table = schema_and_table(table)

        table = Sequel::SQL::Identifier.new(table)
        sql = "SHOW INDEX FROM #{literal(table)}"
        if schema
          schema = Sequel::SQL::Identifier.new(schema)
          sql += " FROM #{literal(schema)}"
        end

        metadata_dataset.with_sql(sql).each do |r|
          name = r[:Key_name]
          next if name == 'PRIMARY'
          name = m.call(name)
          remove_indexes << name if r[:Sub_part] && ! opts[:partial]
          i = indexes[name] ||= {:columns=>[], :unique=>r[:Non_unique] != 1}
          i[:columns] << m.call(r[:Column_name])
        end
        indexes.reject{|k,v| remove_indexes.include?(k)}
      end

      def rollback_prepared_transaction(transaction_id, opts=OPTS)
        run("XA ROLLBACK #{literal(transaction_id)}", opts)
      end

      # Whether the database is MariaDB and not MySQL
      def mariadb?
        return @is_mariadb if defined?(@is_mariadb)
        @is_mariadb = !(fetch('SELECT version()').single_value! !~ /mariadb/i)
      end

      # Get version of MySQL server, used for determined capabilities.
      def server_version
        @server_version ||= begin
          m = /(\d+)\.(\d+)\.(\d+)/.match(fetch('SELECT version()').single_value!)
          (m[1].to_i * 10000) + (m[2].to_i * 100) + m[3].to_i
        end
      end
      
      # MySQL supports CREATE TABLE IF NOT EXISTS syntax.
      def supports_create_table_if_not_exists?
        true
      end
      
      # Generated columns are supported in MariaDB 5.2.0+ and MySQL 5.7.6+.
      def supports_generated_columns?
        server_version >= (mariadb? ? 50200 : 50706)
      end

      # MySQL 5+ supports prepared transactions (two-phase commit) using XA
      def supports_prepared_transactions?
        server_version >= 50000
      end

      # MySQL 5+ supports savepoints
      def supports_savepoints?
        server_version >= 50000
      end

      # MySQL doesn't support savepoints inside prepared transactions in from
      # 5.5.12 to 5.5.23, see http://bugs.mysql.com/bug.php?id=64374
      def supports_savepoints_in_prepared_transactions?
        super && (server_version <= 50512 || server_version >= 50523)
      end

      # Support fractional timestamps on MySQL 5.6.5+ if the :fractional_seconds
      # Database option is used.  Technically, MySQL 5.6.4+ supports them, but
      # automatic initialization of datetime values wasn't supported to 5.6.5+,
      # and this is related to that.
      def supports_timestamp_usecs?
        return @supports_timestamp_usecs if defined?(@supports_timestamp_usecs)
        @supports_timestamp_usecs = server_version >= 50605 && typecast_value_boolean(opts[:fractional_seconds])
      end

      # MySQL supports transaction isolation levels
      def supports_transaction_isolation_levels?
        true
      end

      # Return an array of symbols specifying table names in the current database.
      #
      # Options:
      # :server :: Set the server to use
      def tables(opts=OPTS)
        full_tables('BASE TABLE', opts)
      end
      
      # Return an array of symbols specifying view names in the current database.
      #
      # Options:
      # :server :: Set the server to use
      def views(opts=OPTS)
        full_tables('VIEW', opts)
      end
      
      private
      
      def alter_table_add_column_sql(table, op)
        pos = if after_col = op[:after]
          " AFTER #{quote_identifier(after_col)}"
        elsif op[:first]
          " FIRST"
        end

        sql = if related = op.delete(:table)
          sql = super + "#{pos}, ADD "
          op[:table] = related
          op[:key] ||= primary_key_from_schema(related)
          if constraint_name = op.delete(:foreign_key_constraint_name)
            sql << "CONSTRAINT #{quote_identifier(constraint_name)} "
          end
          sql << "FOREIGN KEY (#{quote_identifier(op[:name])})#{column_references_sql(op)}"
        else
          "#{super}#{pos}"
        end
      end

      def alter_table_change_column_sql(table, op)
        o = op[:op]
        opts = schema(table).find{|x| x.first == op[:name]}
        opts = opts ? opts.last.dup : {}
        opts[:name] = o == :rename_column ? op[:new_name] : op[:name]
        opts[:type] = o == :set_column_type ? op[:type] : opts[:db_type]
        opts[:null] = o == :set_column_null ? op[:null] : opts[:allow_null]
        opts[:default] = o == :set_column_default ? op[:default] : opts[:ruby_default]
        opts.delete(:default) if opts[:default] == nil
        opts.delete(:primary_key)
        unless op[:type] || opts[:type]
          raise Error, "cannot determine database type to use for CHANGE COLUMN operation"
        end
        opts = op.merge(opts)
        if op.has_key?(:auto_increment)
          opts[:auto_increment] = op[:auto_increment]
        end
        "CHANGE COLUMN #{quote_identifier(op[:name])} #{column_definition_sql(opts)}"
      end
      alias alter_table_rename_column_sql alter_table_change_column_sql
      alias alter_table_set_column_type_sql alter_table_change_column_sql
      alias alter_table_set_column_null_sql alter_table_change_column_sql

      def alter_table_set_column_default_sql(table, op)
        return super unless op[:default].nil?

        opts = schema(table).find{|x| x[0] == op[:name]}

        if opts && opts[1][:allow_null] == false
          "ALTER COLUMN #{quote_identifier(op[:name])} DROP DEFAULT"
        else
          super
        end
      end

      def alter_table_add_constraint_sql(table, op)
        if op[:type] == :foreign_key
          op[:key] ||= primary_key_from_schema(op[:table])
        end
        super
      end

      def alter_table_drop_constraint_sql(table, op)
        case op[:type]
        when :primary_key
          "DROP PRIMARY KEY"
        when :foreign_key
          name = op[:name] || foreign_key_name(table, op[:columns])
          "DROP FOREIGN KEY #{quote_identifier(name)}"
        when :unique
          "DROP INDEX #{quote_identifier(op[:name])}"
        when :check, nil 
          if supports_check_constraints?
            "DROP CONSTRAINT #{quote_identifier(op[:name])}"
          end
        end
      end

      def alter_table_sql(table, op)
        case op[:op]
        when :drop_index
          "#{drop_index_sql(table, op)} ON #{quote_schema_table(table)}"
        when :drop_constraint
          if op[:type] == :primary_key
            if (pk = primary_key_from_schema(table)).length == 1
              return [alter_table_sql(table, {:op=>:rename_column, :name=>pk.first, :new_name=>pk.first, :auto_increment=>false}), super]
            end
          end
          super
        else
          super
        end
      end

      # Handle MySQL specific default format.
      def column_schema_normalize_default(default, type)
        if column_schema_default_string_type?(type)
          return if [:date, :datetime, :time].include?(type) && /\ACURRENT_(?:DATE|TIMESTAMP)?\z/.match(default)
          default = "'#{default.gsub("'", "''").gsub('\\', '\\\\')}'"
        end
        super(default, type)
      end

      def column_schema_to_ruby_default(default, type)
        return Sequel::CURRENT_DATE if mariadb? && server_version >= 100200 && default == 'curdate()'
        super
      end

      # Don't allow combining adding foreign key operations with other
      # operations, since in some cases adding a foreign key constraint in
      # the same query as other operations results in MySQL error 150.
      def combinable_alter_table_op?(op)
        super && !(op[:op] == :add_constraint && op[:type] == :foreign_key) && !(op[:op] == :drop_constraint && op[:type] == :primary_key)
      end

      # The SQL queries to execute on initial connection
      def mysql_connection_setting_sqls
        sqls = []
        
        if wait_timeout = opts.fetch(:timeout, 2147483)
          # Increase timeout so mysql server doesn't disconnect us
          # Value used by default is maximum allowed value on Windows.
          sqls << "SET @@wait_timeout = #{wait_timeout}"
        end

        # By default, MySQL 'where id is null' selects the last inserted id
        sqls <<  "SET SQL_AUTO_IS_NULL=0" unless opts[:auto_is_null]

        # If the user has specified one or more sql modes, enable them
        if sql_mode = opts[:sql_mode]
          sql_mode = Array(sql_mode).join(',').upcase
          sqls <<  "SET sql_mode = '#{sql_mode}'"
        end

        sqls
      end
      
      def auto_increment_sql
        'AUTO_INCREMENT'
      end
      
      # MySQL needs to set transaction isolation before begining a transaction
      def begin_new_transaction(conn, opts)
        set_transaction_isolation(conn, opts)
        log_connection_execute(conn, begin_transaction_sql)
      end

      # Use XA START to start a new prepared transaction if the :prepare
      # option is given.
      def begin_transaction(conn, opts=OPTS)
        if (s = opts[:prepare]) && savepoint_level(conn) == 1
          log_connection_execute(conn, "XA START #{literal(s)}")
        else
          super
        end
      end

      # Add generation clause SQL fragment to column creation SQL.
      def column_definition_generated_sql(sql, column)
        if (generated_expression = column[:generated_always_as])
          sql << " GENERATED ALWAYS AS (#{literal(generated_expression)})"
          case (type = column[:generated_type])
          when nil
            # none, database default
          when :virtual
            sql << " VIRTUAL"
          when :stored
            sql << (mariadb? ? " PERSISTENT" : " STORED")
          else
            raise Error, "unsupported :generated_type option: #{type.inspect}"
          end
        end
      end

      def column_definition_order
        COLUMN_DEFINITION_ORDER
      end

      # MySQL doesn't allow default values on text columns, so ignore if it the
      # generic text type is used
      def column_definition_sql(column)
        column.delete(:default) if column[:type] == File || (column[:type] == String && column[:text] == true)
        super
      end
      
      # Prepare the XA transaction for a two-phase commit if the
      # :prepare option is given.
      def commit_transaction(conn, opts=OPTS)
        if (s = opts[:prepare]) && savepoint_level(conn) <= 1
          log_connection_execute(conn, "XA END #{literal(s)}")
          log_connection_execute(conn, "XA PREPARE #{literal(s)}")
        else
          super
        end
      end

      # Use MySQL specific syntax for engine type and character encoding
      def create_table_sql(name, generator, options = OPTS)
        engine = options.fetch(:engine, default_engine)
        charset = options.fetch(:charset, default_charset)
        collate = options.fetch(:collate, default_collate)
        generator.constraints.sort_by{|c| (c[:type] == :primary_key) ? -1 : 1}

        # Proc for figuring out the primary key for a given table.
        key_proc = lambda do |t|
          if t == name 
            if pk = generator.primary_key_name
              [pk]
            elsif !(pkc = generator.constraints.select{|con| con[:type] == :primary_key}).empty?
              pkc.first[:columns]
            elsif !(pkc = generator.columns.select{|con| con[:primary_key] == true}).empty?
              pkc.map{|c| c[:name]}
            end
          else
            primary_key_from_schema(t)
          end
        end

        # Manually set the keys, since MySQL requires one, it doesn't use the primary
        # key if none are specified.
        generator.constraints.each do |c|
          if c[:type] == :foreign_key
            c[:key] ||= key_proc.call(c[:table])
          end
        end

        # Split column constraints into table constraints in some cases:
        # foreign key - Always
        # unique, primary_key - Only if constraint has a name
        generator.columns.each do |c|
          if t = c.delete(:table)
            same_table = t == name
            key = c[:key] || key_proc.call(t)

            if same_table && !key.nil?
              generator.constraints.unshift(:type=>:unique, :columns=>Array(key))
            end

            generator.foreign_key([c[:name]], t, c.merge(:name=>c[:foreign_key_constraint_name], :type=>:foreign_key, :key=>key))
          end
        end

        "#{super}#{" ENGINE=#{engine}" if engine}#{" DEFAULT CHARSET=#{charset}" if charset}#{" DEFAULT COLLATE=#{collate}" if collate}"
      end

      DATABASE_ERROR_REGEXPS = {
        /Duplicate entry .+ for key/ => UniqueConstraintViolation,
        /foreign key constraint fails/ => ForeignKeyConstraintViolation,
        /cannot be null/ => NotNullConstraintViolation,
        /Deadlock found when trying to get lock; try restarting transaction/ => SerializationFailure,
        /CONSTRAINT .+ failed for/ => CheckConstraintViolation,
        /\A(Statement aborted because lock\(s\) could not be acquired immediately and NOWAIT is set\.|Lock wait timeout exceeded; try restarting transaction)/ => DatabaseLockTimeout,
      }.freeze
      def database_error_regexps
        DATABASE_ERROR_REGEXPS
      end

      # Backbone of the tables and views support using SHOW FULL TABLES.
      def full_tables(type, opts)
        m = output_identifier_meth
        metadata_dataset.with_sql('SHOW FULL TABLES').server(opts[:server]).map{|r| m.call(r.values.first) if r.delete(:Table_type) == type}.compact
      end

      def index_definition_sql(table_name, index)
        index_name = quote_identifier(index[:name] || default_index_name(table_name, index[:columns]))
        raise Error, "Partial indexes are not supported for this database" if index[:where] && !supports_partial_indexes?
        index_type = case index[:type]
        when :full_text
          "FULLTEXT "
        when :spatial
          "SPATIAL "
        else
          using = " USING #{index[:type]}" unless index[:type] == nil
          "UNIQUE " if index[:unique]
        end
        "CREATE #{index_type}INDEX #{index_name}#{using} ON #{quote_schema_table(table_name)} #{literal(index[:columns])}"
      end
      
      # Parse the schema for the given table to get an array of primary key columns
      def primary_key_from_schema(table)
        schema(table).select{|a| a[1][:primary_key]}.map{|a| a[0]}
      end

      # Rollback the currently open XA transaction
      def rollback_transaction(conn, opts=OPTS)
        if (s = opts[:prepare]) && savepoint_level(conn) <= 1
          log_connection_execute(conn, "XA END #{literal(s)}")
          log_connection_execute(conn, "XA PREPARE #{literal(s)}")
          log_connection_execute(conn, "XA ROLLBACK #{literal(s)}")
        else
          super
        end
      end

      def schema_column_type(db_type)
        case db_type
        when /\Aset/io
          :set
        when /\Amediumint/io
          :integer
        when /\Amediumtext/io
          :string
        else
          super
        end
      end

      # Use the MySQL specific DESCRIBE syntax to get a table description.
      def schema_parse_table(table_name, opts)
        m = output_identifier_meth(opts[:dataset])
        im = input_identifier_meth(opts[:dataset])
        table = SQL::Identifier.new(im.call(table_name))
        table = SQL::QualifiedIdentifier.new(im.call(opts[:schema]), table) if opts[:schema]
        metadata_dataset.with_sql("DESCRIBE ?", table).map do |row|
          extra = row.delete(:Extra)
          if row[:primary_key] = row.delete(:Key) == 'PRI'
            row[:auto_increment] = !!(extra.to_s =~ /auto_increment/i)
          end
          if supports_generated_columns?
            # Extra field contains VIRTUAL or PERSISTENT for generated columns
            row[:generated] = !!(extra.to_s =~ /VIRTUAL|STORED|PERSISTENT/i)
          end
          row[:allow_null] = row.delete(:Null) == 'YES'
          row[:default] = row.delete(:Default)
          row[:db_type] = row.delete(:Type)
          row[:type] = schema_column_type(row[:db_type])
          [m.call(row.delete(:Field)), row]
        end
      end

      # Split DROP INDEX ops on MySQL 5.6+, as dropping them in the same
      # statement as dropping a related foreign key causes an error.
      def split_alter_table_op?(op)
        server_version >= 50600 && (op[:op] == :drop_index || (op[:op] == :drop_constraint && op[:type] == :unique))
      end

      # Whether the database supports CHECK constraints
      def supports_check_constraints?
        mariadb? && server_version >= 100200
      end

      # MySQL can combine multiple alter table ops into a single query.
      def supports_combining_alter_table_ops?
        true
      end

      # MySQL supports CREATE OR REPLACE VIEW.
      def supports_create_or_replace_view?
        true
      end

      # MySQL does not support named column constraints.
      def supports_named_column_constraints?
        false
      end

      # Respect the :size option if given to produce
      # tinyblob, mediumblob, and longblob if :tiny,
      # :medium, or :long is given.
      def type_literal_generic_file(column)
        case column[:size]
        when :tiny    # < 2^8 bytes
          :tinyblob
        when :medium  # < 2^24 bytes
          :mediumblob
        when :long    # < 2^32 bytes
          :longblob
        else          # 2^16 bytes
          :blob
        end
      end

      # MySQL has both datetime and timestamp classes, most people are going
      # to want datetime
      def type_literal_generic_datetime(column)
        if supports_timestamp_usecs?
          :'datetime(6)'
        elsif column[:default] == Sequel::CURRENT_TIMESTAMP
          :timestamp
        else
          :datetime
        end
      end

      # MySQL has both datetime and timestamp classes, most people are going
      # to want datetime.
      def type_literal_generic_only_time(column)
        if supports_timestamp_usecs?
          :'time(6)'
        else
          :time
        end
      end

      # MySQL doesn't have a true boolean class, so it uses tinyint(1)
      def type_literal_generic_trueclass(column)
        :'tinyint(1)'
      end

      # MySQL 5.0.2+ supports views with check option.
      def view_with_check_option_support
        :local if server_version >= 50002
      end
    end
  
    # Dataset methods shared by datasets that use MySQL databases.
    module DatasetMethods
      MATCH_AGAINST = ["MATCH ".freeze, " AGAINST (".freeze, ")".freeze].freeze
      MATCH_AGAINST_BOOLEAN = ["MATCH ".freeze, " AGAINST (".freeze, " IN BOOLEAN MODE)".freeze].freeze

      Dataset.def_sql_method(self, :delete, %w'with delete from where order limit')
      Dataset.def_sql_method(self, :insert, %w'insert ignore into columns values on_duplicate_key_update')
      Dataset.def_sql_method(self, :select, %w'with select distinct calc_found_rows columns from join where group having window compounds order limit lock')
      Dataset.def_sql_method(self, :update, %w'with update ignore table set where order limit')

      include Sequel::Dataset::Replace
      include UnmodifiedIdentifiers::DatasetMethods

      def complex_expression_sql_append(sql, op, args)
        case op
        when :IN, :"NOT IN"
          ds = args[1]
          if ds.is_a?(Sequel::Dataset) && ds.opts[:limit]
            super(sql, op, [args[0], ds.from_self])
          else
            super
          end
        when :~, :'!~', :'~*', :'!~*', :LIKE, :'NOT LIKE', :ILIKE, :'NOT ILIKE'
          if !db.mariadb? && db.server_version >= 80000 && [:~, :'!~'].include?(op)
            func = Sequel.function(:REGEXP_LIKE, args[0], args[1], 'c')
            func = ~func if op == :'!~'
            return literal_append(sql, func)
          end

          sql << '('
          literal_append(sql, args[0])
          sql << ' '
          sql << 'NOT ' if [:'NOT LIKE', :'NOT ILIKE', :'!~', :'!~*'].include?(op)
          sql << ([:~, :'!~', :'~*', :'!~*'].include?(op) ? 'REGEXP' : 'LIKE')
          sql << ' '
          sql << 'BINARY ' if [:~, :'!~', :LIKE, :'NOT LIKE'].include?(op)
          literal_append(sql, args[1])
          if [:LIKE, :'NOT LIKE', :ILIKE, :'NOT ILIKE'].include?(op)
            sql << " ESCAPE "
            literal_append(sql, "\\")
          end
          sql << ')'
        when :'||'
          if args.length > 1
            sql << "CONCAT"
            array_sql_append(sql, args)
          else
            literal_append(sql, args[0])
          end
        when :'B~'
          sql << "CAST(~"
          literal_append(sql, args[0])
          sql << " AS SIGNED INTEGER)"
        else
          super
        end
      end
      
      # MySQL's CURRENT_TIMESTAMP does not use fractional seconds,
      # even if the database itself supports fractional seconds. If
      # MySQL 5.6.4+ is being used, use a value that will return
      # fractional seconds.
      def constant_sql_append(sql, constant)
        if constant == :CURRENT_TIMESTAMP && supports_timestamp_usecs?
          sql << 'CURRENT_TIMESTAMP(6)'
        else
          super
        end
      end

      # Use GROUP BY instead of DISTINCT ON if arguments are provided.
      def distinct(*args)
        args.empty? ? super : group(*args)
      end

      # Sets up the select methods to use SQL_CALC_FOUND_ROWS option.
      #
      #   dataset.calc_found_rows.limit(10)
      #   # SELECT SQL_CALC_FOUND_ROWS * FROM table LIMIT 10
      def calc_found_rows
        clone(:calc_found_rows => true)
      end

      # Sets up the select methods to delete from if deleting from a
      # joined dataset:
      #
      #   DB[:a].join(:b, a_id: :id).delete
      #   # DELETE a FROM a INNER JOIN b ON (b.a_id = a.id)
      #
      #   DB[:a].join(:b, a_id: :id).delete_from(:a, :b).delete
      #   # DELETE a, b FROM a INNER JOIN b ON (b.a_id = a.id)
      def delete_from(*tables)
        clone(:delete_from=>tables)
      end
      
      # Return the results of an EXPLAIN query as a string. Options:
      # :extended :: Use EXPLAIN EXPTENDED instead of EXPLAIN if true.
      def explain(opts=OPTS)
        # Load the PrettyTable class, needed for explain output
        Sequel.extension(:_pretty_table) unless defined?(Sequel::PrettyTable)

        ds = db.send(:metadata_dataset).with_sql(((opts[:extended] && (db.mariadb? || db.server_version < 50700)) ? 'EXPLAIN EXTENDED ' : 'EXPLAIN ') + select_sql).naked
        rows = ds.all
        Sequel::PrettyTable.string(rows, ds.columns)
      end

      # Return a cloned dataset which will use LOCK IN SHARE MODE to lock returned rows.
      def for_share
        lock_style(:share)
      end

      # Adds full text filter
      def full_text_search(cols, terms, opts = OPTS)
        where(full_text_sql(cols, terms, opts))
      end
      
      # MySQL specific full text search syntax.
      def full_text_sql(cols, terms, opts = OPTS)
        terms = terms.join(' ') if terms.is_a?(Array)
        SQL::PlaceholderLiteralString.new((opts[:boolean] ? MATCH_AGAINST_BOOLEAN : MATCH_AGAINST), [Array(cols), terms])
      end

      # Transforms :straight to STRAIGHT_JOIN.
      def join_type_sql(join_type)
        if join_type == :straight
          'STRAIGHT_JOIN'
        else
          super
        end
      end
      
      # Sets up the insert methods to use INSERT IGNORE.
      # Useful if you have a unique key and want to just skip
      # inserting rows that violate the unique key restriction.
      #
      #   dataset.insert_ignore.multi_insert(
      #     [{name: 'a', value: 1}, {name: 'b', value: 2}]
      #   )
      #   # INSERT IGNORE INTO tablename (name, value) VALUES (a, 1), (b, 2)
      def insert_ignore
        clone(:insert_ignore=>true)
      end

      # Sets up the insert methods to use ON DUPLICATE KEY UPDATE
      # If you pass no arguments, ALL fields will be
      # updated with the new values.  If you pass the fields you
      # want then ONLY those field will be updated. If you pass a
      # hash you can customize the values (for example, to increment
      # a numeric field).
      #
      # Useful if you have a unique key and want to update
      # inserting rows that violate the unique key restriction.
      #
      #   dataset.on_duplicate_key_update.multi_insert(
      #     [{name: 'a', value: 1}, {name: 'b', value: 2}]
      #   )
      #   # INSERT INTO tablename (name, value) VALUES (a, 1), (b, 2)
      #   # ON DUPLICATE KEY UPDATE name=VALUES(name), value=VALUES(value)
      #
      #   dataset.on_duplicate_key_update(:value).multi_insert(
      #     [{name: 'a', value: 1}, {name: 'b', value: 2}]
      #   )
      #   # INSERT INTO tablename (name, value) VALUES (a, 1), (b, 2)
      #   # ON DUPLICATE KEY UPDATE value=VALUES(value)
      #
      #   dataset.on_duplicate_key_update(
      #     value: Sequel.lit('value + VALUES(value)')
      #   ).multi_insert(
      #     [{name: 'a', value: 1}, {name: 'b', value: 2}]
      #   )
      #   # INSERT INTO tablename (name, value) VALUES (a, 1), (b, 2)
      #   # ON DUPLICATE KEY UPDATE value=value + VALUES(value)
      def on_duplicate_key_update(*args)
        clone(:on_duplicate_key_update => args)
      end

      # MySQL uses the nonstandard ` (backtick) for quoting identifiers.
      def quoted_identifier_append(sql, c)
        sql << '`' << c.to_s.gsub('`', '``') << '`'
      end

      # MariaDB 10.2+ and MySQL 8+ support CTEs
      def supports_cte?(type=:select)
        if db.mariadb?
          type == :select && db.server_version >= 100200
        else
          case type
          when :select, :update, :delete
            db.server_version >= 80000
          end
        end
      end

      # MySQL does not support derived column lists
      def supports_derived_column_lists?
        false
      end

      # MySQL can emulate DISTINCT ON with its non-standard GROUP BY implementation,
      # though the rows returned cannot be made deterministic through ordering.
      def supports_distinct_on?
        true
      end

      # MySQL supports GROUP BY WITH ROLLUP (but not CUBE)
      def supports_group_rollup?
        true
      end

      # MariaDB 10.3+ supports INTERSECT or EXCEPT
      def supports_intersect_except?
        db.mariadb? && db.server_version >= 100300
      end
      
      # MySQL does not support limits in correlated subqueries (or any subqueries that use IN).
      def supports_limits_in_correlated_subqueries?
        false
      end
    
      # MySQL supports modifying joined datasets
      def supports_modifying_joins?
        true
      end

      # MySQL 8+ and MariaDB 10.3+ support NOWAIT.
      def supports_nowait?
        db.server_version >= (db.mariadb? ? 100300 : 80000)
      end

      # MySQL's DISTINCT ON emulation using GROUP BY does not respect the
      # query's ORDER BY clause.
      def supports_ordered_distinct_on?
        false
      end
    
      # MySQL supports pattern matching via regular expressions
      def supports_regexp?
        true
      end

      # MySQL 8+ supports SKIP LOCKED.
      def supports_skip_locked?
        !db.mariadb? && db.server_version >= 80000
      end

      # Check the database setting for whether fractional timestamps
      # are suppported.
      def supports_timestamp_usecs?
        db.supports_timestamp_usecs?
      end

      # MySQL 8+ supports WINDOW clause.
      def supports_window_clause?
        !db.mariadb? && db.server_version >= 80000
      end

      # MariaDB 10.2+ and MySQL 8+ support window functions
      def supports_window_functions?
        db.server_version >= (db.mariadb? ? 100200 : 80000)
      end

      # Sets up the update methods to use UPDATE IGNORE.
      # Useful if you have a unique key and want to just skip
      # updating rows that violate the unique key restriction.
      #
      #   dataset.update_ignore.update(name: 'a', value: 1)
      #   # UPDATE IGNORE tablename SET name = 'a', value = 1
      def update_ignore
        clone(:update_ignore=>true)
      end
      
      private

      # Allow update and delete for limited datasets, unless there is an offset.
      def check_not_limited!(type)
        super if type == :truncate || @opts[:offset]
      end

      # Consider the first table in the joined dataset is the table to delete
      # from, but include the others for the purposes of selecting rows.
      def delete_from_sql(sql)
        if joined_dataset?
          sql << ' '
          tables = @opts[:delete_from] || @opts[:from][0..0]
          source_list_append(sql, tables)
          sql << ' FROM '
          source_list_append(sql, @opts[:from])
          select_join_sql(sql)
        else
          super
        end
      end

      # MySQL doesn't use the SQL standard DEFAULT VALUES.
      def insert_columns_sql(sql)
        values = opts[:values]
        if values.is_a?(Array) && values.empty?
          sql << " ()"
        else
          super
        end
      end

      # MySQL supports INSERT IGNORE INTO
      def insert_ignore_sql(sql)
        sql << " IGNORE" if opts[:insert_ignore]
      end

      # MySQL supports UPDATE IGNORE
      def update_ignore_sql(sql)
        sql << " IGNORE" if opts[:update_ignore]
      end

      # MySQL supports INSERT ... ON DUPLICATE KEY UPDATE
      def insert_on_duplicate_key_update_sql(sql)
        if update_cols = opts[:on_duplicate_key_update]
          update_vals = nil

          if update_cols.empty?
            update_cols = columns
          elsif update_cols.last.is_a?(Hash)
            update_vals = update_cols.last
            update_cols = update_cols[0..-2]
          end

          sql << " ON DUPLICATE KEY UPDATE "
          c = false
          co = ', '
          values = '=VALUES('
          endp = ')'
          update_cols.each do |col|
            sql << co if c
            quote_identifier_append(sql, col)
            sql << values
            quote_identifier_append(sql, col)
            sql << endp
            c ||= true
          end
          if update_vals
            eq = '='
            update_vals.map do |col,v| 
              sql << co if c
              quote_identifier_append(sql, col)
              sql << eq
              literal_append(sql, v)
              c ||= true
            end
          end
        end
      end

      # MySQL doesn't use the standard DEFAULT VALUES for empty values.
      def insert_values_sql(sql)
        values = opts[:values]
        if values.is_a?(Array) && values.empty?
          sql << " VALUES ()"
        else
          super
        end
      end

      # MySQL allows a LIMIT in DELETE and UPDATE statements.
      def limit_sql(sql)
        if l = @opts[:limit]
          sql << " LIMIT "
          literal_append(sql, l)
        end
      end
      alias delete_limit_sql limit_sql
      alias update_limit_sql limit_sql

      # MySQL uses a preceding X for hex escaping strings
      def literal_blob_append(sql, v)
        if v.empty?
          sql << "''"
        else
          sql << "0x" << v.unpack("H*").first
        end
      end

      # Use 0 for false on MySQL
      def literal_false
        '0'
      end

      # Raise error for infinitate and NaN values
      def literal_float(v)
        if v.infinite? || v.nan?
          raise InvalidValue, "Infinite floats and NaN values are not valid on MySQL"
        else
          super
        end
      end

      # SQL fragment for String.  Doubles \ and ' by default.
      def literal_string_append(sql, v)
        sql << "'" << v.gsub("\\", "\\\\\\\\").gsub("'", "''") << "'"
      end

      # Use 1 for true on MySQL
      def literal_true
        '1'
      end
      
      # MySQL supports multiple rows in VALUES in INSERT.
      def multi_insert_sql_strategy
        :values
      end

      def non_sql_option?(key)
        super || key == :insert_ignore || key == :update_ignore || key == :on_duplicate_key_update
      end

      # MySQL does not natively support NULLS FIRST/LAST.
      def requires_emulating_nulls_first?
        true
      end

      def select_only_offset_sql(sql)
        sql << " LIMIT "
        literal_append(sql, @opts[:offset])
        sql << ",18446744073709551615"
      end
  
      # Support FOR SHARE locking when using the :share lock style.
      # Use SKIP LOCKED if skipping locked rows.
      def select_lock_sql(sql)
        lock = @opts[:lock]
        if lock == :share
          if !db.mariadb? && db.server_version >= 80000
            sql << ' FOR SHARE'
          else
            sql << ' LOCK IN SHARE MODE'
          end
        else
          super
        end

        if lock
          if @opts[:skip_locked]
            sql << " SKIP LOCKED"
          elsif @opts[:nowait]
            sql << " NOWAIT"
          end
        end
      end

      # MySQL specific SQL_CALC_FOUND_ROWS option
      def select_calc_found_rows_sql(sql)
        sql << ' SQL_CALC_FOUND_ROWS' if opts[:calc_found_rows]
      end

      # Use WITH RECURSIVE instead of WITH if any of the CTEs is recursive
      def select_with_sql_base
        opts[:with].any?{|w| w[:recursive]} ? "WITH RECURSIVE " : super
      end

      # MySQL uses WITH ROLLUP syntax.
      def uses_with_rollup?
        true
      end
    end
  end
end
