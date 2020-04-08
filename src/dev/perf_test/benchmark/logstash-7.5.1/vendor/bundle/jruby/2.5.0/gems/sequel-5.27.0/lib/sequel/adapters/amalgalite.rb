# frozen-string-literal: true

require 'amalgalite'
require_relative 'shared/sqlite'

module Sequel
  module Amalgalite
    # Type conversion map class for Sequel's use of Amalgamite
    class SequelTypeMap < ::Amalgalite::TypeMaps::DefaultMap
      methods_handling_sql_types.delete('string')
      methods_handling_sql_types.merge!(
        'datetime' => %w'datetime timestamp',
        'time' => %w'time',
        'float' => ['float', 'double', 'real', 'double precision'],
        'decimal' => %w'numeric decimal money'
      )

      # Store the related database object, in order to be able to correctly
      # handle the database timezone.
      def initialize(db)
        @db = db
      end
      
      # Return blobs as instances of Sequel::SQL::Blob instead of
      # Amalgamite::Blob
      def blob(s)
        SQL::Blob.new(s)
      end
      
      # Return numeric/decimal types as instances of BigDecimal
      # instead of Float
      def decimal(s)
        BigDecimal(s)
      end
      
      # Return datetime types as instances of Sequel.datetime_class
      def datetime(s)
        @db.to_application_timestamp(s)
      end

      def time(s)
        Sequel.string_to_time(s)
      end
      
      # Don't raise an error if the value is a string and the declared
      # type doesn't match a known type, just return the value.
      def result_value_of(declared_type, value)
        if value.is_a?(::Amalgalite::Blob)
          SQL::Blob.new(value.to_s)
        elsif value.is_a?(String) && declared_type
          (meth = self.class.sql_to_method(declared_type.downcase)) ? public_send(meth, value) : value
        else
          super
        end
      end
    end
    
    class Database < Sequel::Database
      include ::Sequel::SQLite::DatabaseMethods
      
      set_adapter_scheme :amalgalite
      
      # Mimic the file:// uri, by having 2 preceding slashes specify a relative
      # path, and 3 preceding slashes specify an absolute path.
      def self.uri_to_options(uri) # :nodoc:
        { :database => (uri.host.nil? && uri.path == '/') ? nil : "#{uri.host}#{uri.path}" }
      end
      private_class_method :uri_to_options
      
      # Connect to the database.  Since SQLite is a file based database,
      # the only options available are :database (to specify the database
      # name), and :timeout, to specify how long to wait for the database to
      # be available if it is locked, given in milliseconds (default is 5000).
      def connect(server)
        opts = server_opts(server)
        opts[:database] = ':memory:' if blank_object?(opts[:database])
        db = ::Amalgalite::Database.new(opts[:database])
        db.busy_handler(::Amalgalite::BusyTimeout.new(opts.fetch(:timeout, 5000)/50, 50))
        db.type_map = SequelTypeMap.new(self)
        connection_pragmas.each{|s| log_connection_yield(s, db){db.execute_batch(s)}}
        db
      end
      
      def database_type
        :sqlite
      end

      def execute_ddl(sql, opts=OPTS)
        _execute(sql, opts){|conn| log_connection_yield(sql, conn){conn.execute_batch(sql)}}
        nil
      end
      
      def execute_dui(sql, opts=OPTS)
        _execute(sql, opts){|conn| log_connection_yield(sql, conn){conn.execute_batch(sql)}; conn.row_changes}
      end
      
      def execute_insert(sql, opts=OPTS)
        _execute(sql, opts){|conn| log_connection_yield(sql, conn){conn.execute_batch(sql)}; conn.last_insert_rowid}
      end
      
      def execute(sql, opts=OPTS)
        _execute(sql, opts) do |conn|
          begin
            yield(stmt = log_connection_yield(sql, conn){conn.prepare(sql)})
          ensure
            stmt.close if stmt
          end
        end
      end
      
      # Run the given SQL with the given arguments and return the first value of the first row.
      def single_value(sql, opts=OPTS)
        _execute(sql, opts){|conn| log_connection_yield(sql, conn){conn.first_value_from(sql)}}
      end
      
      private
      
      # Yield an available connection.  Rescue
      # any Amalgalite::Errors and turn them into DatabaseErrors.
      def _execute(sql, opts)
        begin
          synchronize(opts[:server]){|conn| yield conn}
        rescue ::Amalgalite::Error, ::Amalgalite::SQLite3::Error => e
          raise_error(e)
        end
      end
      
      # The Amagalite adapter does not need the pool to convert exceptions.
      # Also, force the max connections to 1 if a memory database is being
      # used, as otherwise each connection gets a separate database.
      def connection_pool_default_options
        o = super.dup
        # Default to only a single connection if a memory database is used,
        # because otherwise each connection will get a separate database
        o[:max_connections] = 1 if @opts[:database] == ':memory:' || blank_object?(@opts[:database])
        o
      end
      
      def dataset_class_default
        Dataset
      end

      def database_error_classes
        [::Amalgalite::Error, ::Amalgalite::SQLite3::Error]
      end
    end
    
    class Dataset < Sequel::Dataset
      include ::Sequel::SQLite::DatasetMethods

      def fetch_rows(sql)
        execute(sql) do |stmt|
          self.columns = cols = stmt.result_fields.map{|c| output_identifier(c)}
          col_count = cols.size
          stmt.each do |result|
            row = {}
            col_count.times{|i| row[cols[i]] = result[i]}
            yield row
          end
        end
      end

      private
      
      # Quote the string using the connection instance method.
      def literal_string_append(sql, v)
        db.synchronize(@opts[:server]){|c| sql << c.quote(v)}
      end
    end
  end
end
