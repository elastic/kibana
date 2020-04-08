# encoding: utf-8

module LogStash module PluginMixins module Jdbc
  class CheckedCountLogger
    def initialize(logger)
      @logger = logger
      @needs_check = true
      @count_is_supported = false
      @in_debug = @logger.debug?
    end

    def disable_count
      @needs_check = false
      @count_is_supported = false
    end

    def log_statement_parameters(statement, parameters, query)
      return unless @in_debug
      check_count_query(query) if @needs_check && query
      if @count_is_supported
        @logger.debug("Executing JDBC query", :statement => statement, :parameters => parameters, :count => execute_count(query))
      else
        @logger.debug("Executing JDBC query", :statement => statement, :parameters => parameters)
      end
    end

    def check_count_query(query)
      @needs_check = false
      begin
        execute_count(query)
        @count_is_supported = true
      rescue Exception => e
        @logger.warn("Attempting a count query raised an error, the generated count statement is most likely incorrect but check networking, authentication or your statement syntax", "exception" => e.message)
        @logger.warn("Ongoing count statement generation is being prevented")
        @count_is_supported = false
      end
    end

    def execute_count(query)
      query.count
    end
  end
end end end
