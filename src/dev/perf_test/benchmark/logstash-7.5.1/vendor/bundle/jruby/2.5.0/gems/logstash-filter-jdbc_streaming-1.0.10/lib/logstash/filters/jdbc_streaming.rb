# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"
require "logstash/plugin_mixins/jdbc_streaming"
require "logstash/plugin_mixins/jdbc_streaming/cache_payload"
require "logstash/plugin_mixins/jdbc_streaming/statement_handler"
require "logstash/plugin_mixins/jdbc_streaming/parameter_handler"
require "lru_redux"

# This filter executes a SQL query and store the result set in the field
# specified as `target`.
# It will cache the results locally in an LRU cache with expiry
#
# For example you can load a row based on an id from in the event
#
# [source,ruby]
# filter {
#   jdbc_streaming {
#     jdbc_driver_library => "/path/to/mysql-connector-java-5.1.34-bin.jar"
#     jdbc_driver_class => "com.mysql.jdbc.Driver"
#     jdbc_connection_string => ""jdbc:mysql://localhost:3306/mydatabase"
#     jdbc_user => "me"
#     jdbc_password => "secret"
#     statement => "select * from WORLD.COUNTRY WHERE Code = :code"
#     parameters => { "code" => "country_code"}
#     target => "country_details"
#   }
# }
#
# Prepared Statement Mode example
#
# [source,ruby]
# filter {
#   jdbc_streaming {
#     jdbc_driver_library => "/path/to/mysql-connector-java-5.1.34-bin.jar"
#     jdbc_driver_class => "com.mysql.jdbc.Driver"
#     jdbc_connection_string => ""jdbc:mysql://localhost:3306/mydatabase"
#     jdbc_user => "me"
#     jdbc_password => "secret"
#     statement => "select * from WORLD.COUNTRY WHERE Code = ?"
#     use_prepared_statements => true
#     prepared_statement_name => "get_country_from_code"
#     prepared_statement_bind_values => ["[country_code]"]
#     target => "country_details"
#   }
# }
#
module LogStash module Filters class JdbcStreaming < LogStash::Filters::Base
  include LogStash::PluginMixins::JdbcStreaming

  config_name "jdbc_streaming"

  # Statement to execute.
  # To use parameters, use named parameter syntax, for example "SELECT * FROM MYTABLE WHERE ID = :id"
  config :statement, :validate => :string, :required => true

  # Hash of query parameter, for example `{ "id" => "id_field" }`
  config :parameters, :validate => :hash, :default => {}

  # Define the target field to store the extracted result(s)
  # Field is overwritten if exists
  config :target, :validate => :string, :required => true

  # Define a default object to use when lookup fails to return a matching row.
  # ensure that the key names of this object match the columns from the statement
  config :default_hash, :validate => :hash, :default => {}

  # Append values to the `tags` field if sql error occured
  config :tag_on_failure, :validate => :array, :default => ["_jdbcstreamingfailure"]

  # Append values to the `tags` field if no record was found and default values were used
  config :tag_on_default_use, :validate => :array, :default => ["_jdbcstreamingdefaultsused"]

  # Enable or disable caching, boolean true or false, defaults to true
  config :use_cache, :validate => :boolean, :default => true

  # The minimum number of seconds any entry should remain in the cache, defaults to 5 seconds
  # A numeric value, you can use decimals for example `{ "cache_expiration" => 0.25 }`
  # If there are transient jdbc errors the cache will store empty results for a given
  # parameter set and bypass the jbdc lookup, this merges the default_hash into the event, until
  # the cache entry expires, then the jdbc lookup will be tried again for the same parameters
  # Conversely, while the cache contains valid results any external problem that would cause
  # jdbc errors, will not be noticed for the cache_expiration period.
  config :cache_expiration, :validate => :number, :default => 5.0

  # The maximum number of cache entries are stored, defaults to 500 entries
  # The least recently used entry will be evicted
  config :cache_size, :validate => :number, :default => 500

  config :use_prepared_statements, :validate => :boolean, :default => false
  config :prepared_statement_name, :validate => :string, :default => ""
  config :prepared_statement_bind_values, :validate => :array, :default => []
  config :prepared_statement_warn_on_constant_usage, :validate => :boolean, :default => true # deprecate in a future major LS release

  # Options hash to pass to Sequel
  config :sequel_opts, :validate => :hash, :default => {}

  attr_reader :prepared_statement_constant_warned # for test verification, remove when warning is deprecated and removed

  # ----------------------------------------
  public

  def register
    convert_config_options
    if @use_prepared_statements
      validation_errors = validate_prepared_statement_mode
      unless validation_errors.empty?
        raise(LogStash::ConfigurationError, "Prepared Statement Mode validation errors: " + validation_errors.join(", "))
      end
    else
      # symbolise and wrap value in parameter handler
      unless @parameters.values.all?{|v| v.is_a?(PluginMixins::JdbcStreaming::ParameterHandler)}
        @parameters = parameters.inject({}) do |hash,(k,value)|
          hash[k.to_sym] = PluginMixins::JdbcStreaming::ParameterHandler.build_parameter_handler(value)
          hash
        end
      end
    end
    @statement_handler = LogStash::PluginMixins::JdbcStreaming::StatementHandler.build_statement_handler(self)
    prepare_jdbc_connection
  end

  def filter(event)
    result = @statement_handler.cache_lookup(@database, event) # should return a CachePayload instance

    if result.failed?
      tag_failure(event)
    end

    if result.empty?
      tag_default(event)
      process_event(event, @default_array)
    else
      process_event(event, result.payload)
    end
  end

  def close
    @database.disconnect
  rescue => e
    logger.warn("Exception caught when attempting to close filter.", :exception => e.message, :backtrace => e.backtrace)
  end

  # ----------------------------------------
  private

  def tag_failure(event)
    @tag_on_failure.each do |tag|
      event.tag(tag)
    end
  end

  def tag_default(event)
    @tag_on_default_use.each do |tag|
      event.tag(tag)
    end
  end

  def process_event(event, value)
    # use deep clone here so other filter function don't taint the cached payload by reference
    event.set(@target, ::LogStash::Util.deep_clone(value))
    filter_matched(event)
  end

  def convert_config_options
    # create these object once they will be cloned for every filter call anyway,
    # lets not create a new object for each
    @default_array = [@default_hash]
  end

  def validate_prepared_statement_mode
    @prepared_statement_constant_warned = false
    error_messages = []
    if @prepared_statement_name.empty?
      error_messages << "must provide a name for the Prepared Statement, it must be unique for the db session"
    end
    if @statement.count("?") != @prepared_statement_bind_values.size
      # mismatch in number of bind value elements to placeholder characters
      error_messages << "there is a mismatch between the number of statement `?` placeholders and :prepared_statement_bind_values array setting elements"
    end
    unless @prepared_statement_bind_values.all?{|v| v.is_a?(PluginMixins::JdbcStreaming::ParameterHandler)}
      @prepared_statement_bind_values = prepared_statement_bind_values.map do |value|
        ParameterHandler.build_bind_value_handler(value)
      end
    end
    if prepared_statement_warn_on_constant_usage
      warnables = @prepared_statement_bind_values.select {|handler| handler.is_a?(PluginMixins::JdbcStreaming::ConstantParameter) && handler.given_value.is_a?(String)}
      unless warnables.empty?
        @prepared_statement_constant_warned = true
        msg = "When using prepared statements, the following `prepared_statement_bind_values` will be treated as constants, if you intend them to be field references please use the square bracket field reference syntax e.g. '[field]'"
        logger.warn(msg, :constants => warnables)
      end
    end
    error_messages
  end
end end end # class LogStash::Filters::JdbcStreaming
