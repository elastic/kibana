# encoding: utf-8
require "logstash/util/loggable"

module LogStash module PluginMixins module JdbcStreaming
  # so as to not clash with the class of the same name and function in the jdbc input
  # this is in the `module JdbcStreaming` namespace
  # this duplication can be removed in a universal plugin

  class StatementHandler
    def self.build_statement_handler(plugin)
      klass = plugin.use_prepared_statements ? PreparedStatementHandler : NormalStatementHandler
      klass.new(plugin)
    end

    attr_reader :statement, :parameters, :cache

    def initialize(plugin)
      @statement = plugin.statement
      klass = plugin.use_cache ? RowCache : NoCache
      @cache = klass.new(plugin.cache_size, plugin.cache_expiration)
      post_init(plugin)
    end

    # Get from cache or performs remote lookup and saves to cache
    # @param db [Sequel::Database]
    # @param event [LogStash::Event]
    # @returnparam [CachePayload]
    def cache_lookup(db, event)
      # override in subclass
    end

    private

    def common_cache_lookup(db, event)
      params = prepare_parameters_from_event(event)
      @cache.get(params) do
        result = CachePayload.new
        begin
          logger.debug? && logger.debug("Executing JDBC query", :statement => statement, :parameters => params)
          execute_extract_records(db, params, result)
        rescue ::Sequel::Error => e
          # all sequel errors are a subclass of this, let all other standard or runtime errors bubble up
          result.failed!
          logger.warn? && logger.warn("Exception when executing JDBC query", :statement => statement, :parameters => params, :exception => e)
        end
        # if either of: no records or a Sequel exception occurs the payload is
        # empty and the default can be substituted later.
        result
      end
    end

    def execute_extract_records(db, params, result)
      # override in subclass
    end

    def post_init(plugin)
      # override in subclass, if needed
    end

    def prepare_parameters_from_event(event)
      @parameters.inject({}) do |hash, (k, parameter_handler)|
        # defer to appropriate parameter handler
        value = parameter_handler.extract_from(event)
        hash[k] = value.is_a?(::LogStash::Timestamp) ? value.time : value
        hash
      end
    end
  end

  class NormalStatementHandler < StatementHandler
    include LogStash::Util::Loggable

    # Get from cache or performs remote lookup and saves to cache
    # @param db [Sequel::Database]
    # @param event [LogStash::Event]
    # @returnparam [CachePayload]
    def cache_lookup(db, event)
      common_cache_lookup(db, event)
    end

    private

    def execute_extract_records(db, params, result)
      dataset = db[statement, params] # returns a Sequel dataset
      dataset.all do |row|
        result.push row.inject({}){|hash,(k,v)| hash[k.to_s] = v; hash} # Stringify row keys
      end
    end

    def post_init(plugin)
      @parameters = plugin.parameters
    end
  end

  class PreparedStatementHandler < StatementHandler
    include LogStash::Util::Loggable
    attr_reader :name, :bind_values_array, :statement_prepared, :prepared

    # Get from cache or performs remote lookup and saves to cache
    # @param db [Sequel::Database]
    # @param event [LogStash::Event]
    # @returnparam [CachePayload]
    def cache_lookup(db, event)
      build_prepared_statement(db)
      common_cache_lookup(db, event)
    end

    private

    def execute_extract_records(db, params, result)
      records = db.call(name, params) # returns an array of hashes
      records.each do |row|
        result.push row.inject({}){|hash,(k,v)| hash[k.to_s] = v; hash} #Stringify row keys
      end
    end

    def post_init(plugin)
      @name = plugin.prepared_statement_name.to_sym
      @bind_values_array = plugin.prepared_statement_bind_values
      @statement_prepared = Concurrent::AtomicBoolean.new(false)
      @parameters = create_bind_values_hash
    end

    def build_prepared_statement(db)
      # create prepared statement on first use
      if statement_prepared.false?
        prepended = parameters.keys.map{|v| v.to_s.prepend("$").to_sym}
        @prepared = db[statement, *prepended].prepare(:select, name)
        statement_prepared.make_true
      end
      # make sure the Sequel database instance has the prepared statement
      if db.prepared_statement(name).nil?
        db.set_prepared_statement(name, prepared)
      end
    end

    def create_bind_values_hash
      hash = {}
      bind_values_array.each_with_index {|v,i| hash[:"p#{i}"] = v}
      hash
    end
  end
end end end
