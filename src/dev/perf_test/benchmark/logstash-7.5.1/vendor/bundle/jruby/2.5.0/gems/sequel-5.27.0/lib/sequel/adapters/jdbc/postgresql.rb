# frozen-string-literal: true

Sequel::JDBC.load_driver('org.postgresql.Driver', :Postgres)
require_relative '../shared/postgres'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:postgresql] = proc do |db|
        db.dataset_class = Sequel::JDBC::Postgres::Dataset
        db.extend(Sequel::JDBC::Postgres::DatabaseMethods)
        org.postgresql.Driver
      end
    end

    module Postgres
      module DatabaseMethods
        include Sequel::Postgres::DatabaseMethods

        # Add the primary_keys and primary_key_sequences instance variables,
        # so we can get the correct return values for inserted rows.
        def self.extended(db)
          super
          db.send(:initialize_postgres_adapter)
        end

        # Remove any current entry for the oid in the oid_convertor_map.
        def add_conversion_proc(oid, *)
          super
          Sequel.synchronize{@oid_convertor_map.delete(oid)}
        end

        # See Sequel::Postgres::Adapter#copy_into
        def copy_into(table, opts=OPTS)
          data = opts[:data]
          data = Array(data) if data.is_a?(String)

          if block_given? && data
            raise Error, "Cannot provide both a :data option and a block to copy_into"
          elsif !block_given? && !data
            raise Error, "Must provide either a :data option or a block to copy_into"
          end

          synchronize(opts[:server]) do |conn|
            begin
              copy_manager = org.postgresql.copy.CopyManager.new(conn)
              copier = copy_manager.copy_in(copy_into_sql(table, opts))
              if block_given?
                while buf = yield
                  java_bytes = buf.to_java_bytes
                  copier.writeToCopy(java_bytes, 0, java_bytes.length)
                end
              else
                data.each do |d|
                  java_bytes = d.to_java_bytes
                  copier.writeToCopy(java_bytes, 0, java_bytes.length)
                end
              end
            rescue Exception => e
              copier.cancelCopy if copier
              raise
            ensure
              unless e
                begin
                  copier.endCopy
                rescue NativeException => e2
                  raise_error(e2)
                end
              end
            end
          end
        end
        
        # See Sequel::Postgres::Adapter#copy_table
        def copy_table(table, opts=OPTS)
          synchronize(opts[:server]) do |conn|
            copy_manager = org.postgresql.copy.CopyManager.new(conn)
            copier = copy_manager.copy_out(copy_table_sql(table, opts))
            begin
              if block_given?
                while buf = copier.readFromCopy
                  yield(String.from_java_bytes(buf))
                end
                nil
              else
                b = String.new
                while buf = copier.readFromCopy
                  b << String.from_java_bytes(buf)
                end
                b
              end
            rescue => e
              raise_error(e, :disconnect=>true)
            ensure
              if buf && !e
                raise DatabaseDisconnectError, "disconnecting as a partial COPY may leave the connection in an unusable state"
              end
            end
          end
        end

        def oid_convertor_proc(oid)
          if (conv = Sequel.synchronize{@oid_convertor_map[oid]}).nil?
            conv = if pr = conversion_procs[oid]
              lambda do |r, i|
                if v = r.getString(i)
                  pr.call(v)
                end
              end
            else
              false
            end
            Sequel.synchronize{@oid_convertor_map[oid] = conv}
          end
          conv
        end

        private
        
        def disconnect_error?(exception, opts)
          super || exception.message =~ /\A(This connection has been closed\.|FATAL: terminating connection due to administrator command|An I\/O error occurred while sending to the backend\.)\z/
        end

        # For PostgreSQL-specific types, return the string that should be used
        # as the PGObject value. Returns nil by default, loading pg_* extensions
        # will override this to add support for specific types.
        def bound_variable_arg(arg, conn)
          nil
        end

        # Work around issue when using Sequel's bound variable support where the
        # same SQL is used in different bound variable calls, but the schema has
        # changed between the calls.  This is necessary as jdbc-postgres versions
        # after 9.4.1200 violate the JDBC API.  These versions cache separate
        # PreparedStatement instances, which are eventually prepared server side after the
        # prepareThreshold is met.  The JDBC API violation is that PreparedStatement#close
        # does not release the server side prepared statement.
        def prepare_jdbc_statement(conn, sql, opts)
          ps = super
          unless opts[:name]
            ps.prepare_threshold = 0
          end
          ps
        end

        # If the given argument is a recognized PostgreSQL-specific type, create
        # a PGObject instance with unknown type and the bound argument string value,
        # and set that as the prepared statement argument.
        def set_ps_arg(cps, arg, i)
          if v = bound_variable_arg(arg, nil)
            obj = org.postgresql.util.PGobject.new
            obj.setType("unknown")
            obj.setValue(v)
            cps.setObject(i, obj)
          else
            super
          end
        end

        # Use setNull for nil arguments as the default behavior of setString
        # with nil doesn't appear to work correctly on PostgreSQL.
        def set_ps_arg_nil(cps, i)
          cps.setNull(i, JavaSQL::Types::NULL)
        end

        # Execute the connection configuration SQL queries on the connection.
        def setup_connection_with_opts(conn, opts)
          conn = super
          statement(conn) do |stmt|
            connection_configuration_sqls(opts).each{|sql| log_connection_yield(sql, conn){stmt.execute(sql)}}
          end
          conn
        end

        def setup_type_convertor_map
          super
          @oid_convertor_map = {}
        end
      end
      
      class Dataset < JDBC::Dataset
        include Sequel::Postgres::DatasetMethods
        
        private
        
        # Literalize strings similar to the native postgres adapter
        def literal_string_append(sql, v)
          sql << "'" << db.synchronize(@opts[:server]){|c| c.escape_string(v)} << "'"
        end

        # SQL fragment for Sequel::SQLTime, containing just the time part
        def literal_sqltime(v)
          v.strftime("'%H:%M:%S#{sprintf(".%03d", (v.usec/1000.0).round)}'")
        end

        STRING_TYPE = Java::JavaSQL::Types::VARCHAR
        ARRAY_TYPE = Java::JavaSQL::Types::ARRAY
        PG_SPECIFIC_TYPES = [Java::JavaSQL::Types::ARRAY, Java::JavaSQL::Types::OTHER, Java::JavaSQL::Types::STRUCT, Java::JavaSQL::Types::TIME_WITH_TIMEZONE, Java::JavaSQL::Types::TIME].freeze

        # Return PostgreSQL hstore types as ruby Hashes instead of
        # Java HashMaps.  Only used if the database does not have a
        # conversion proc for the type.
        HSTORE_METHOD = Object.new
        def HSTORE_METHOD.call(r, i)
          if v = r.getObject(i)
            v.to_hash
          end
        end 

        def type_convertor(map, meta, type, i)
          case type
          when *PG_SPECIFIC_TYPES
            oid = meta.getField(i).getOID
            if pr = db.oid_convertor_proc(oid)
              pr
            elsif oid == 2950 # UUID
              map[STRING_TYPE]
            elsif meta.getPGType(i) == 'hstore'
              HSTORE_METHOD
            else
              super
            end
          else
            super
          end
        end
      end
    end
  end
end
