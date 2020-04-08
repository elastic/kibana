# encoding: utf-8
require "fileutils"
require "sequel"
require "sequel/adapters/jdbc"
require "java"
require "logstash/util/loggable"

module LogStash module Filters module Jdbc
  EMBEDDED_DERBY_DRIVER_CLASS = "org.apache.derby.jdbc.EmbeddedDriver".freeze
  MEMORY_DERBY_LOCAL_CONNECTION_STRING = "jdbc:derby:memory:____;create=true".freeze
  CONNECTION_ERRORS = [::Sequel::DatabaseConnectionError, ::Sequel::DatabaseDisconnectError, ::Sequel::PoolTimeout]

  class LookupJdbcException < ::StandardError; end
  class LoaderJdbcException < ::StandardError; end
  class ConnectionJdbcException < ::StandardError; end

  class BasicDatabase
    include LogStash::Util::Loggable

    def self.wrap_error(new_error_class, exception, message = nil)
      error = new_error_class.new(message || exception.message)
      error.set_backtrace(exception.backtrace)
      error
    end

    def self.create(
      connection_string = MEMORY_DERBY_LOCAL_CONNECTION_STRING,
      driver_class = EMBEDDED_DERBY_DRIVER_CLASS,
      driver_library = nil,
      user = nil,
      password = nil)
      instance = new
      instance.post_create(connection_string, driver_class, driver_library, user, password)
      instance
    end

    def self.random_name(length = 10)
      SecureRandom.hex(length)
    end

    attr_reader :unique_db_name

    def initialize()
      @options_hash = {}
      post_initialize
    end

    def connect(err_message)
      begin
        @db = ::Sequel.connect(@connection_string, @options_hash)
      rescue *CONNECTION_ERRORS => err
        # we do not raise an error when there is a connection error, we hope that the connection works next time
        logger.error(err_message, :exception => err.message, :backtrace => err.backtrace.take(8))
      else
        raise "::Sequel.connect returned a nil db instance, connection_string: #{@connection_string}, options: #{@options_hash.inspect}" if @db.nil?
      end
    end

    def disconnect(err_message)
      return if @db.nil?
      begin
        @db.disconnect
      rescue *CONNECTION_ERRORS => err
        # we do not raise an error when there is a connection error, we hope that the connection works next time
        logger.error(err_message, :exception => err.message, :backtrace => err.backtrace.take(8))
      ensure
        @db = nil
      end
    end

    def connected?
      !@db.nil?
    end

    def empty_record_set
      []
    end

    def post_create(connection_string, driver_class, driver_library, user, password)
      raise NotImplementedError.new("#{self.class.name} is abstract, you must subclass it and implement #post_create()")
    end

    private

    def verify_connection(connection_string, driver_class, driver_library, user, password)
      begin
        if driver_library
          driver_library.split(",").each do |driver_path|
            require driver_path
          end
        end
      rescue LoadError => e
        msg = "The driver library cannot be loaded. The system error was: '#{e.message}'."
        raise wrap_error(ConnectionJdbcException, e, msg)
      end
      begin
        db = nil
        ::Sequel::JDBC.load_driver(driver_class)
        @connection_string = connection_string
        if user
          @options_hash[:user] = user
        end
        if password
          @options_hash[:password] = password.value
        end
        # test the connection as early as possible
        db = ::Sequel.connect(@connection_string, {:test => true}.merge(@options_hash))
      rescue ::Sequel::AdapterNotFound => anf
        raise wrap_error(ConnectionJdbcException, anf)
      rescue ::Sequel::DatabaseConnectionError => dce
        raise wrap_error(ConnectionJdbcException, dce)
      ensure
        db.disconnect unless db.nil?
      end
    end

    def post_initialize()
      @unique_db_name = SecureRandom.hex(12)
    end

    def wrap_error(new_error_class, exception, message = nil)
      self.class.wrap_error(new_error_class, exception, message)
    end
  end
end end end
