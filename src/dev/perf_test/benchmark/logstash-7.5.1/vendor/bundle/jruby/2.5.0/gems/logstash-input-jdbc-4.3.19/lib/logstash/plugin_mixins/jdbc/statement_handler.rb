# encoding: utf-8

module LogStash module PluginMixins module Jdbc
  class StatementHandler
    def self.build_statement_handler(plugin, logger)
      klass = plugin.use_prepared_statements ? PreparedStatementHandler : NormalStatementHandler
      klass.new(plugin, logger)
    end

    attr_reader :statement, :parameters, :statement_logger

    def initialize(plugin, statement_logger)
      @statement = plugin.statement
      @statement_logger = statement_logger
      post_init(plugin)
    end

    def build_query(db, sql_last_value)
      # override in subclass
    end

    def post_init(plugin)
      # override in subclass, if needed
    end
  end

  class NormalStatementHandler < StatementHandler
    # Performs the query, respecting our pagination settings, yielding once per row of data
    # @param db [Sequel::Database]
    # @param sql_last_value [Integet|DateTime|Time]
    # @yieldparam row [Hash{Symbol=>Object}]
    def perform_query(db, sql_last_value, jdbc_paging_enabled, jdbc_page_size)
      query = build_query(db, sql_last_value)
      if jdbc_paging_enabled
        query.each_page(jdbc_page_size) do |paged_dataset|
          paged_dataset.each do |row|
            yield row
          end
        end
      else
        query.each do |row|
          yield row
        end
      end
    end

    private

    def build_query(db, sql_last_value)
      parameters[:sql_last_value] = sql_last_value
      query = db[statement, parameters]
      statement_logger.log_statement_parameters(statement, parameters, query)
      query
    end

    def post_init(plugin)
      @parameter_keys = ["sql_last_value"] + plugin.parameters.keys
      @parameters = plugin.parameters.inject({}) do |hash,(k,v)|
        case v
        when LogStash::Timestamp
          hash[k.to_sym] = v.time
        else
          hash[k.to_sym] = v
        end
        hash
      end
    end
  end

  class PreparedStatementHandler < StatementHandler
    attr_reader :name, :bind_values_array, :statement_prepared, :prepared

    # Performs the query, ignoring our pagination settings, yielding once per row of data
    # @param db [Sequel::Database]
    # @param sql_last_value [Integet|DateTime|Time]
    # @yieldparam row [Hash{Symbol=>Object}]
    def perform_query(db, sql_last_value, jdbc_paging_enabled, jdbc_page_size)
      query = build_query(db, sql_last_value)
      query.each do |row|
        yield row
      end
    end

    private

    def build_query(db, sql_last_value)
      @parameters = create_bind_values_hash
      if statement_prepared.false?
        prepended = parameters.keys.map{|v| v.to_s.prepend("$").to_sym}
        @prepared = db[statement, *prepended].prepare(:select, name)
        statement_prepared.make_true
      end
      # under the scheduler the Sequel database instance is recreated each time
      # so the previous prepared statements are lost, add back
      if db.prepared_statement(name).nil?
        db.set_prepared_statement(name, prepared)
      end
      bind_value_sql_last_value(sql_last_value)
      statement_logger.log_statement_parameters(statement, parameters, nil)
      db.call(name, parameters)
    end

    def post_init(plugin)
      # don't log statement count when using prepared statements for now...
      # needs enhancement to allow user to supply a bindable count prepared statement in settings.
      @statement_logger.disable_count

      @name = plugin.prepared_statement_name.to_sym
      @bind_values_array = plugin.prepared_statement_bind_values
      @parameters = plugin.parameters
      @statement_prepared = Concurrent::AtomicBoolean.new(false)
    end

    def create_bind_values_hash
      hash = {}
      bind_values_array.each_with_index {|v,i| hash[:"p#{i}"] = v}
      hash
    end

    def bind_value_sql_last_value(sql_last_value)
      parameters.keys.each do |key|
        value = parameters[key]
        if value == ":sql_last_value"
          parameters[key] = sql_last_value
        end
      end
    end
  end
end end end
