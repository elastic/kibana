# encoding: utf-8
require_relative "basic_database"

module LogStash module Filters module Jdbc
  class ReadOnlyDatabase < BasicDatabase

    def count(statement)
      result = 0
      debug_log_messages = ["Lookup query count is zero"]
      begin
        # its the responsibility of the caller to manage the connections see Loader
        if connected?
          result = @db[statement].count
        else
          debug_log_messages.concat("and there is no connection to the remote db at this time")
        end
      rescue ::Sequel::Error => err
        # a fatal issue
        msg = "Exception occurred when executing loader Jdbc query count"
        logger.error(msg, :exception => err.message, :backtrace => err.backtrace.take(8))
        raise wrap_error(LookupJdbcException, err, msg)
      end
      logger.debug(debug_log_messages.join(' ')) if result.zero?
      result
    end

    def query(statement)
      result = empty_record_set
      debug_log_messages = ["Lookup query results are empty"]
      begin
        # its the responsibility of the caller to manage the connections see Loader
        if connected?
          result = @db[statement].all
        else
          debug_log_messages.concat("and there is no connection to the remote db at this time")
        end
      rescue ::Sequel::Error => err
        # a fatal issue
        msg = "Exception occurred when executing loader Jdbc query"
        logger.error(msg, :exception => err.message, :backtrace => err.backtrace.take(8))
        raise wrap_error(LookupJdbcException, err, msg)
      end
      logger.debug(debug_log_messages.join(' ')) if result.empty?
      result
    end

    def post_create(connection_string, driver_class, driver_library, user, password)
      verify_connection(connection_string, driver_class, driver_library, user, password)
    end

    private

    def post_initialize()
      super
    end
  end
end end end
