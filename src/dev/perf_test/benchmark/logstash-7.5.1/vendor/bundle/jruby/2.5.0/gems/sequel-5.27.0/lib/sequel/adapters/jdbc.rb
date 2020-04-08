# frozen-string-literal: true

require 'java'
require_relative 'utils/stored_procedures'

module Sequel
  module JDBC
    # Make it accesing the java.sql hierarchy more ruby friendly.
    module JavaSQL
      include_package 'java.sql'
    end

    # Used to identify a jndi connection and to extract the jndi
    # resource name.
    JNDI_URI_REGEXP = /\Ajdbc:jndi:(.+)/
    
    # Contains procs keyed on subadapter type that extend the
    # given database object so it supports the correct database type.
    DATABASE_SETUP = {}

    # Create custom NativeException alias for nicer access, and also so that
    # JRuby 9.2+ so it doesn't use the deprecated ::NativeException
    NativeException = java.lang.Exception
    
    # Default database error classes
    DATABASE_ERROR_CLASSES = [NativeException]
    if JRUBY_VERSION < '9.2'
      # On JRuby <9.2, still include ::NativeException, as it is still needed in some cases
      DATABASE_ERROR_CLASSES << ::NativeException
    end
    DATABASE_ERROR_CLASSES.freeze

    # Allow loading the necessary JDBC support via a gem.
    def self.load_gem(name)
      begin
        require "jdbc/#{name.to_s.downcase}"
      rescue LoadError
        # jdbc gem not used, hopefully the user has the .jar in their CLASSPATH
      else
        if defined?(::Jdbc) && ( ::Jdbc.const_defined?(name) rescue nil )
          jdbc_module = ::Jdbc.const_get(name) # e.g. Jdbc::SQLite3
          jdbc_module.load_driver if jdbc_module.respond_to?(:load_driver)
        end
      end
    end

    # Attempt to load the JDBC driver class, which should be specified as a string
    # containing the driver class name (which JRuby should autoload).
    # Note that the string is evaled, so this method is not safe to call with
    # untrusted input.
    # Raise a Sequel::AdapterNotFound if evaluating the class name raises a NameError.
    def self.load_driver(drv, gem=nil)
      load_gem(gem) if gem
      eval drv
    rescue NameError
      raise Sequel::AdapterNotFound, "#{drv} not loaded#{", try installing jdbc-#{gem.to_s.downcase} gem" if gem}"
    end

    class TypeConvertor
      CONVERTORS = convertors = {}
      %w'Boolean Float Double Int Long Short'.each do |meth|
        x = convertors[meth.to_sym] = Object.new
        class_eval("def x.call(r, i) v = r.get#{meth}(i); v unless r.wasNull end", __FILE__, __LINE__)
      end
      %w'Object Array String Time Date Timestamp BigDecimal Blob Bytes Clob'.each do |meth|
        x = convertors[meth.to_sym] = Object.new
        class_eval("def x.call(r, i) r.get#{meth}(i) end", __FILE__, __LINE__)
      end
      x = convertors[:RubyTime] = Object.new
      def x.call(r, i)
        if v = r.getTime(i)
          Sequel.string_to_time("#{v.to_string}.#{sprintf('%03i', v.getTime.divmod(1000).last)}")
        end
      end
      x = convertors[:RubyDate] = Object.new
      def x.call(r, i)
        if v = r.getDate(i)
          Date.civil(v.getYear + 1900, v.getMonth + 1, v.getDate)
        end
      end
      x = convertors[:RubyTimestamp] = Object.new
      def x.call(r, i)
        if v = r.getTimestamp(i)
          Sequel.database_to_application_timestamp([v.getYear + 1900, v.getMonth + 1, v.getDate, v.getHours, v.getMinutes, v.getSeconds, v.getNanos])
        end
      end
      x = convertors[:RubyBigDecimal] = Object.new
      def x.call(r, i)
        if v = r.getBigDecimal(i)
          ::Kernel::BigDecimal(v.to_string)
        end
      end
      x = convertors[:RubyBlob] = Object.new
      def x.call(r, i)
        if v = r.getBytes(i)
          Sequel::SQL::Blob.new(String.from_java_bytes(v))
        end
      end
      x = convertors[:RubyClob] = Object.new
      def x.call(r, i)
        if v = r.getClob(i)
          v.getSubString(1, v.length)
        end
      end
      x = convertors[:RubyArray] = Object.new
      def x.call(r, i)
        if v = r.getArray(i)
          v.array.to_ary
        end
      end 

      MAP = Hash.new(convertors[:Object])
      types = Java::JavaSQL::Types

      {
        :BOOLEAN => :Boolean,
        :CHAR => :String,
        :DOUBLE => :Double,
        :FLOAT => :Double,
        :INTEGER => :Int,
        :LONGNVARCHAR => :String,
        :LONGVARCHAR => :String,
        :NCHAR => :String,
        :REAL => :Float,
        :SMALLINT => :Short,
        :TINYINT => :Short,
        :VARCHAR => :String,
      }.each do |type, meth|
        MAP[types.const_get(type)] = convertors[meth]
      end
      BASIC_MAP = MAP.dup

      {
        :ARRAY => :Array,
        :BINARY => :Blob,
        :BLOB => :Blob,
        :CLOB => :Clob,
        :DATE => :Date,
        :DECIMAL => :BigDecimal,
        :LONGVARBINARY => :Blob,
        :NCLOB => :Clob,
        :NUMERIC => :BigDecimal,
        :TIME => :Time,
        :TIMESTAMP => :Timestamp,
        :VARBINARY => :Blob,
      }.each do |type, meth|
        BASIC_MAP[types.const_get(type)] = convertors[meth]
        MAP[types.const_get(type)] = convertors[:"Ruby#{meth}"]
      end
      MAP.freeze
      BASIC_MAP.freeze
    end

    class Database < Sequel::Database
      set_adapter_scheme :jdbc
      
      # The Java database driver we are using (should be a Java class)
      attr_reader :driver
      
      # Whether to convert some Java types to ruby types when retrieving rows.
      # True by default, can be set to false to roughly double performance when
      # fetching rows.
      attr_accessor :convert_types

      # The fetch size to use for JDBC Statement objects created by this database.
      # By default, this is nil so a fetch size is not set explicitly.
      attr_accessor :fetch_size

      # Map of JDBC type ids to callable objects that return appropriate ruby values.
      attr_reader :type_convertor_map

      # Map of JDBC type ids to callable objects that return appropriate ruby or java values.
      attr_reader :basic_type_convertor_map

      # Execute the given stored procedure with the give name. If a block is
      # given, the stored procedure should return rows.
      def call_sproc(name, opts = OPTS)
        args = opts[:args] || []
        sql = "{call #{name}(#{args.map{'?'}.join(',')})}"
        synchronize(opts[:server]) do |conn|
          cps = conn.prepareCall(sql)

          i = 0
          args.each{|arg| set_ps_arg(cps, arg, i+=1)}

          begin
            if block_given?
              yield log_connection_yield(sql, conn){cps.executeQuery}
            else
              log_connection_yield(sql, conn){cps.executeUpdate}
              if opts[:type] == :insert
                last_insert_id(conn, opts)
              end
            end
          rescue *DATABASE_ERROR_CLASSES => e
            raise_error(e)
          ensure
            cps.close
          end
        end
      end
         
      # Connect to the database using JavaSQL::DriverManager.getConnection, and falling back
      # to driver.new.connect if the driver is known.
      def connect(server)
        opts = server_opts(server)
        conn = if jndi?
          get_connection_from_jndi
        else
          args = [uri(opts)]
          args.concat([opts[:user], opts[:password]]) if opts[:user] && opts[:password]
          begin
            JavaSQL::DriverManager.setLoginTimeout(opts[:login_timeout]) if opts[:login_timeout]
            raise StandardError, "skipping regular connection" if opts[:jdbc_properties]
            JavaSQL::DriverManager.getConnection(*args)
          rescue StandardError, *DATABASE_ERROR_CLASSES => e
            raise e unless driver
            # If the DriverManager can't get the connection - use the connect
            # method of the driver. (This happens under Tomcat for instance)
            props = java.util.Properties.new
            if opts && opts[:user] && opts[:password]
              props.setProperty("user", opts[:user])
              props.setProperty("password", opts[:password])
            end
            opts[:jdbc_properties].each{|k,v| props.setProperty(k.to_s, v)} if opts[:jdbc_properties]
            begin
              c = driver.new.connect(args[0], props)
              raise(Sequel::DatabaseError, 'driver.new.connect returned nil: probably bad JDBC connection string') unless c
              c
            rescue StandardError, *DATABASE_ERROR_CLASSES => e2
              if e2.respond_to?(:message=) && e2.message != e.message
                e2.message = "#{e2.message}\n#{e.class.name}: #{e.message}"
              end
              raise e2
            end
          end
        end
        setup_connection_with_opts(conn, opts)
      end

      # Close given adapter connections, and delete any related prepared statements.
      def disconnect_connection(c)
        @connection_prepared_statements_mutex.synchronize{@connection_prepared_statements.delete(c)}
        c.close
      end
      
      def execute(sql, opts=OPTS, &block)
        return call_sproc(sql, opts, &block) if opts[:sproc]
        return execute_prepared_statement(sql, opts, &block) if [Symbol, Dataset].any?{|c| sql.is_a?(c)}
        synchronize(opts[:server]) do |conn|
          statement(conn) do |stmt|
            if block
              if size = fetch_size
                stmt.setFetchSize(size)
              end
              yield log_connection_yield(sql, conn){stmt.executeQuery(sql)}
            else
              case opts[:type]
              when :ddl
                log_connection_yield(sql, conn){stmt.execute(sql)}
              when :insert
                log_connection_yield(sql, conn){execute_statement_insert(stmt, sql)}
                opts = Hash[opts]
                opts[:stmt] = stmt
                last_insert_id(conn, opts)
              else
                log_connection_yield(sql, conn){stmt.executeUpdate(sql)}
              end
            end
          end
        end
      end
      alias execute_dui execute

      def execute_ddl(sql, opts=OPTS)
        opts = Hash[opts]
        opts[:type] = :ddl
        execute(sql, opts)
      end
      
      def execute_insert(sql, opts=OPTS)
        opts = Hash[opts]
        opts[:type] = :insert
        execute(sql, opts)
      end

      def freeze
        @type_convertor_map.freeze
        @basic_type_convertor_map.freeze
        super
      end

      # Use the JDBC metadata to get a list of foreign keys for the table.
      def foreign_key_list(table, opts=OPTS)
        m = output_identifier_meth
        schema, table = metadata_schema_and_table(table, opts)
        foreign_keys = {}
        metadata(:getImportedKeys, nil, schema, table) do |r|
          if fk = foreign_keys[r[:fk_name]]
            fk[:columns] << [r[:key_seq], m.call(r[:fkcolumn_name])]
            fk[:key] << [r[:key_seq], m.call(r[:pkcolumn_name])]
          elsif r[:fk_name]
            foreign_keys[r[:fk_name]] = {:name=>m.call(r[:fk_name]), :columns=>[[r[:key_seq], m.call(r[:fkcolumn_name])]], :table=>m.call(r[:pktable_name]), :key=>[[r[:key_seq], m.call(r[:pkcolumn_name])]]}
          end
        end
        foreign_keys.values.each do |fk|
          [:columns, :key].each do |k|
            fk[k] = fk[k].sort.map{|_, v| v}
          end
        end
      end

      # Use the JDBC metadata to get the index information for the table.
      def indexes(table, opts=OPTS)
        m = output_identifier_meth
        schema, table = metadata_schema_and_table(table, opts)
        indexes = {}
        metadata(:getIndexInfo, nil, schema, table, false, true) do |r|
          next unless name = r[:column_name]
          next if respond_to?(:primary_key_index_re, true) and r[:index_name] =~ primary_key_index_re 
          i = indexes[m.call(r[:index_name])] ||= {:columns=>[], :unique=>[false, 0].include?(r[:non_unique])}
          i[:columns] << m.call(name)
        end
        indexes
      end 

      # Whether or not JNDI is being used for this connection.
      def jndi?
        !!(uri =~ JNDI_URI_REGEXP)
      end
      
      # All tables in this database
      def tables(opts=OPTS)
        get_tables('TABLE', opts)
      end
      
      # The uri for this connection.  You can specify the uri
      # using the :uri, :url, or :database options.  You don't
      # need to worry about this if you use Sequel.connect
      # with the JDBC connectrion strings.
      def uri(opts=OPTS)
        opts = @opts.merge(opts)
        ur = opts[:uri] || opts[:url] || opts[:database]
        ur =~ /^\Ajdbc:/ ? ur : "jdbc:#{ur}"
      end

      # All views in this database
      def views(opts=OPTS)
        get_tables('VIEW', opts)
      end

      private
         
      # Call the DATABASE_SETUP proc directly after initialization,
      # so the object always uses sub adapter specific code.  Also,
      # raise an error immediately if the connection doesn't have a
      # uri, since JDBC requires one.
      def adapter_initialize
        @connection_prepared_statements = {}
        @connection_prepared_statements_mutex = Mutex.new
        @fetch_size = @opts[:fetch_size] ? typecast_value_integer(@opts[:fetch_size]) : default_fetch_size
        @convert_types = typecast_value_boolean(@opts.fetch(:convert_types, true))
        raise(Error, "No connection string specified") unless uri
        
        resolved_uri = jndi? ? get_uri_from_jndi : uri
        setup_type_convertor_map_early

        @driver = if (match = /\Ajdbc:([^:]+)/.match(resolved_uri)) && (prok = Sequel::Database.load_adapter(match[1].to_sym, :map=>DATABASE_SETUP, :subdir=>'jdbc'))
          prok.call(self)
        else
          @opts[:driver]
        end        

        setup_type_convertor_map
      end
      
      # Yield the native prepared statements hash for the given connection
      # to the block in a thread-safe manner.
      def cps_sync(conn, &block)
        @connection_prepared_statements_mutex.synchronize{yield(@connection_prepared_statements[conn] ||= {})}
      end

      def database_error_classes
        DATABASE_ERROR_CLASSES
      end

      def database_exception_sqlstate(exception, opts)
        if database_exception_use_sqlstates?
          while exception.respond_to?(:cause)
            exception = exception.cause
            return exception.getSQLState if exception.respond_to?(:getSQLState)
          end
        end
        nil
      end

      # Whether the JDBC subadapter should use SQL states for exception handling, true by default.
      def database_exception_use_sqlstates?
        true
      end

      def dataset_class_default
        Dataset
      end

      # Raise a disconnect error if the SQL state of the cause of the exception indicates so.
      def disconnect_error?(exception, opts)
        cause = exception.respond_to?(:cause) ? exception.cause : exception
        super || (cause.respond_to?(:getSQLState) && cause.getSQLState =~ /^08/)
      end

      # Execute the prepared statement.  If the provided name is a
      # dataset, use that as the prepared statement, otherwise use
      # it as a key to look it up in the prepared_statements hash.
      # If the connection we are using has already prepared an identical
      # statement, use that statement instead of creating another.
      # Otherwise, prepare a new statement for the connection, bind the
      # variables, and execute it.
      def execute_prepared_statement(name, opts=OPTS)
        args = opts[:arguments]
        if name.is_a?(Dataset)
          ps = name
          name = ps.prepared_statement_name
        else
          ps = prepared_statement(name)
        end
        sql = ps.prepared_sql
        synchronize(opts[:server]) do |conn|
          if name and cps = cps_sync(conn){|cpsh| cpsh[name]} and cps[0] == sql
            cps = cps[1]
          else
            log_connection_yield("CLOSE #{name}", conn){cps[1].close} if cps
            if name
              opts = Hash[opts]
              opts[:name] = name
            end
            cps = log_connection_yield("PREPARE#{" #{name}:" if name} #{sql}", conn){prepare_jdbc_statement(conn, sql, opts)}
            if size = fetch_size
              cps.setFetchSize(size)
            end
            cps_sync(conn){|cpsh| cpsh[name] = [sql, cps]} if name
          end
          i = 0
          args.each{|arg| set_ps_arg(cps, arg, i+=1)}
          msg = "EXECUTE#{" #{name}" if name}"
          if ps.log_sql
            msg += " ("
            msg << sql
            msg << ")"
          end
          begin
            if block_given?
              yield log_connection_yield(msg, conn, args){cps.executeQuery}
            else
              case opts[:type]
              when :ddl
                log_connection_yield(msg, conn, args){cps.execute}
              when :insert
                log_connection_yield(msg, conn, args){execute_prepared_statement_insert(cps)}
                opts = Hash[opts]
                opts[:prepared] = true
                opts[:stmt] = cps
                last_insert_id(conn, opts)
              else
                log_connection_yield(msg, conn, args){cps.executeUpdate}
              end
            end
          rescue *DATABASE_ERROR_CLASSES => e
            raise_error(e)
          ensure
            cps.close unless name
          end
        end
      end

      # Execute the prepared insert statement
      def execute_prepared_statement_insert(stmt)
        stmt.executeUpdate
      end
      
      # Execute the insert SQL using the statement
      def execute_statement_insert(stmt, sql)
        stmt.executeUpdate(sql)
      end

      # The default fetch size to use for statements.  Nil by default, so that the
      # default for the JDBC driver is used.
      def default_fetch_size
        nil
      end
      
      # Gets the connection from JNDI.
      def get_connection_from_jndi
        jndi_name = JNDI_URI_REGEXP.match(uri)[1]
        javax.naming.InitialContext.new.lookup(jndi_name).connection
      end
            
      # Gets the JDBC connection uri from the JNDI resource.
      def get_uri_from_jndi
        conn = get_connection_from_jndi
        conn.meta_data.url
      ensure
        conn.close if conn
      end
      
      # Backbone of the tables and views support.
      def get_tables(type, opts)
        ts = []
        m = output_identifier_meth
        if schema = opts[:schema]
          schema = schema.to_s
        end
        metadata(:getTables, nil, schema, nil, [type].to_java(:string)){|h| ts << m.call(h[:table_name])}
        ts
      end

      # Support Date objects used in bound variables
      def java_sql_date(date)
        java.sql.Date.new(Time.local(date.year, date.month, date.day).to_i * 1000)
      end

      # Support DateTime objects used in bound variables
      def java_sql_datetime(datetime)
        ts = java.sql.Timestamp.new(Time.local(datetime.year, datetime.month, datetime.day, datetime.hour, datetime.min, datetime.sec).to_i * 1000)
        ts.setNanos((datetime.sec_fraction * 1000000000).to_i)
        ts
      end

      # Support fractional seconds for Time objects used in bound variables
      def java_sql_timestamp(time)
        ts = java.sql.Timestamp.new(time.to_i * 1000)
        ts.setNanos(time.nsec)
        ts
      end 
      
      def log_connection_execute(conn, sql)
        statement(conn){|s| log_connection_yield(sql, conn){s.execute(sql)}}
      end

      # By default, there is no support for determining the last inserted
      # id, so return nil.  This method should be overridden in
      # subadapters.
      def last_insert_id(conn, opts)
        nil
      end
      
      # Yield the metadata for this database
      def metadata(*args, &block)
        synchronize do |c|
          result = c.getMetaData.public_send(*args)
          begin
            metadata_dataset.send(:process_result_set, result, &block)
          ensure
            result.close
          end
        end
      end

      # Return the schema and table suitable for use with metadata queries.
      def metadata_schema_and_table(table, opts)
        im = input_identifier_meth(opts[:dataset])
        schema, table = schema_and_table(table)
        schema ||= opts[:schema]
        schema = im.call(schema) if schema
        table = im.call(table)
        [schema, table]
      end
      
      # Created a JDBC prepared statement on the connection with the given SQL.
      def prepare_jdbc_statement(conn, sql, opts)
        conn.prepareStatement(sql)
      end

      # Java being java, you need to specify the type of each argument
      # for the prepared statement, and bind it individually.  This
      # guesses which JDBC method to use, and hopefully JRuby will convert
      # things properly for us.
      def set_ps_arg(cps, arg, i)
        case arg
        when Integer
          cps.setLong(i, arg)
        when Sequel::SQL::Blob
          cps.setBytes(i, arg.to_java_bytes)
        when String
          cps.setString(i, arg)
        when Float
          cps.setDouble(i, arg)
        when TrueClass, FalseClass
          cps.setBoolean(i, arg)
        when NilClass
          set_ps_arg_nil(cps, i)
        when DateTime
          cps.setTimestamp(i, java_sql_datetime(arg))
        when Date
          cps.setDate(i, java_sql_date(arg))
        when Time
          cps.setTimestamp(i, java_sql_timestamp(arg))
        when Java::JavaSql::Timestamp
          cps.setTimestamp(i, arg)
        when Java::JavaSql::Date
          cps.setDate(i, arg)
        else
          cps.setObject(i, arg)
        end
      end

      # Use setString with a nil value by default, but this doesn't work on all subadapters.
      def set_ps_arg_nil(cps, i)
        cps.setString(i, nil)
      end
      
      # Return the connection.  Can be overridden in subadapters for database specific setup.
      def setup_connection(conn)
        conn
      end

      # Setup the connection using the given connection options. Return the connection.  Can be overridden in subadapters for database specific setup.
      def setup_connection_with_opts(conn, opts)
        setup_connection(conn)
      end

      def schema_column_set_db_type(schema)
        case schema[:type]
        when :string
          if schema[:db_type] =~ /\A(character( varying)?|n?(var)?char2?)\z/io && schema[:column_size] > 0
            schema[:db_type] += "(#{schema[:column_size]})"
          end
        when :decimal
          if schema[:db_type] =~ /\A(decimal|numeric)\z/io && schema[:column_size] > 0 && schema[:scale] >= 0
            schema[:db_type] += "(#{schema[:column_size]}, #{schema[:scale]})"
          end
        end
      end
      
      def schema_parse_table(table, opts=OPTS)
        m = output_identifier_meth(opts[:dataset])
        schema, table = metadata_schema_and_table(table, opts)
        pks, ts = [], []
        metadata(:getPrimaryKeys, nil, schema, table) do |h|
          next if schema_parse_table_skip?(h, schema)
          pks << h[:column_name]
        end
        schemas = []
        metadata(:getColumns, nil, schema, table, nil) do |h|
          next if schema_parse_table_skip?(h, schema)
          s = {
            :type=>schema_column_type(h[:type_name]),
            :db_type=>h[:type_name],
            :default=>(h[:column_def] == '' ? nil : h[:column_def]),
            :allow_null=>(h[:nullable] != 0),
            :primary_key=>pks.include?(h[:column_name]),
            :column_size=>h[:column_size],
            :scale=>h[:decimal_digits],
            :remarks=>h[:remarks]
          }
          if s[:primary_key]
            s[:auto_increment] = h[:is_autoincrement] == "YES"
          end
          s[:max_length] = s[:column_size] if s[:type] == :string
          if s[:db_type] =~ /number|numeric|decimal/i && s[:scale] == 0
            s[:type] = :integer
          end
          schema_column_set_db_type(s)
          schemas << h[:table_schem] unless schemas.include?(h[:table_schem])
          ts << [m.call(h[:column_name]), s]
        end
        if schemas.length > 1
          raise Error, 'Schema parsing in the jdbc adapter resulted in columns being returned for a table with the same name in multiple schemas.  Please explicitly qualify your table with a schema.'
        end
        ts
      end
      
      # Skip tables in the INFORMATION_SCHEMA when parsing columns.
      def schema_parse_table_skip?(h, schema)
        h[:table_schem] == 'INFORMATION_SCHEMA'
      end

      # Called after loading subadapter-specific code, overridable by subadapters.
      def setup_type_convertor_map
      end

      # Called before loading subadapter-specific code, necessary so that subadapter initialization code
      # that runs queries works correctly.  This cannot be overridden in subadapters.
      def setup_type_convertor_map_early
        @type_convertor_map = TypeConvertor::MAP.merge(Java::JavaSQL::Types::TIMESTAMP=>method(:timestamp_convert))
        @basic_type_convertor_map = TypeConvertor::BASIC_MAP.dup
      end

      # Yield a new statement object, and ensure that it is closed before returning.
      def statement(conn)
        stmt = conn.createStatement
        yield stmt
      rescue *DATABASE_ERROR_CLASSES => e
        raise_error(e)
      ensure
        stmt.close if stmt
      end

      # A conversion method for timestamp columns.  This is used to make sure timestamps are converted using the
      # correct timezone.
      def timestamp_convert(r, i)
        if v = r.getTimestamp(i)
          to_application_timestamp([v.getYear + 1900, v.getMonth + 1, v.getDate, v.getHours, v.getMinutes, v.getSeconds, v.getNanos])
        end
      end
    end
    
    class Dataset < Sequel::Dataset
      include StoredProcedures

      PreparedStatementMethods = prepared_statements_module(
        "sql = self; opts = Hash[opts]; opts[:arguments] = bind_arguments",
        Sequel::Dataset::UnnumberedArgumentMapper,
        %w"execute execute_dui") do
          private

          def execute_insert(sql, opts=OPTS)
            sql = self
            opts = Hash[opts]
            opts[:arguments] = bind_arguments
            opts[:type] = :insert
            super
          end
      end
      
      StoredProcedureMethods = prepared_statements_module(
        "sql = @opts[:sproc_name]; opts = Hash[opts]; opts[:args] = @opts[:sproc_args]; opts[:sproc] = true",
        Sequel::Dataset::StoredProcedureMethods,
        %w"execute execute_dui") do
          private

          def execute_insert(sql, opts=OPTS)
            sql = @opts[:sproc_name]
            opts = Hash[opts]
            opts[:args] = @opts[:sproc_args]
            opts[:sproc] = true
            opts[:type] = :insert
            super
          end
      end
      
      def fetch_rows(sql, &block)
        execute(sql){|result| process_result_set(result, &block)}
        self
      end
      
      # Set the fetch size on JDBC ResultSets created from the returned dataset.
      def with_fetch_size(size)
        clone(:fetch_size=>size)
      end

      # Set whether to convert Java types to ruby types in the returned dataset.
      def with_convert_types(v)
        clone(:convert_types=>v)
      end
      
      private

      # Whether we should convert Java types to ruby types for this dataset.
      def convert_types?
        ct = @opts[:convert_types]
        ct.nil? ? db.convert_types : ct
      end

      # Extend the dataset with the JDBC stored procedure methods.
      def prepare_extend_sproc(ds)
        ds.with_extend(StoredProcedureMethods)
      end

      # The type conversion proc to use for the given column number i,
      # given the type conversion map and the ResultSetMetaData.
      def type_convertor(map, meta, type, i)
        map[type]
      end

      # The basic type conversion proc to use for the given column number i,
      # given the type conversion map and the ResultSetMetaData.
      #
      # This is implemented as a separate method so that subclasses can
      # override the methods separately.
      def basic_type_convertor(map, meta, type, i)
        map[type]
      end

      def prepared_statement_modules
        [PreparedStatementMethods]
      end

      # Split out from fetch rows to allow processing of JDBC result sets
      # that don't come from issuing an SQL string.
      def process_result_set(result)
        meta = result.getMetaData
        if fetch_size = opts[:fetch_size]
          result.setFetchSize(fetch_size)
        end
        cols = []
        i = 0
        convert = convert_types?
        map = convert ? db.type_convertor_map : db.basic_type_convertor_map

        meta.getColumnCount.times do
          i += 1
          cols << [output_identifier(meta.getColumnLabel(i)), i, convert ? type_convertor(map, meta, meta.getColumnType(i), i) : basic_type_convertor(map, meta, meta.getColumnType(i), i)]
        end
        max = i
        self.columns = cols.map{|c| c[0]}

        while result.next
          row = {}
          i = -1
          while (i += 1) < max
            n, j, pr = cols[i]
            row[n] = pr.call(result, j)
          end
          yield row
        end
      ensure
        result.close
      end
    end
  end
end
