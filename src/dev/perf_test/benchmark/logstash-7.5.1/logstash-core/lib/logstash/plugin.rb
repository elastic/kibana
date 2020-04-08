# encoding: utf-8
require "logstash/config/mixin"
require "concurrent"
require "securerandom"

require_relative 'plugin_metadata'

class LogStash::Plugin
  include LogStash::Util::Loggable

  attr_accessor :params, :execution_context

  NL = "\n"

  include LogStash::Config::Mixin

  # Disable or enable metric logging for this specific plugin instance
  # by default we record all the metrics we can, but you can disable metrics collection
  # for a specific plugin.
  config :enable_metric, :validate => :boolean, :default => true

  # Add a unique `ID` to the plugin configuration. If no ID is specified, Logstash will generate one.
  # It is strongly recommended to set this ID in your configuration. This is particularly useful
  # when you have two or more plugins of the same type, for example, if you have 2 grok filters.
  # Adding a named ID in this case will help in monitoring Logstash when using the monitoring APIs.
  #
  # [source,ruby]
  # ---------------------------------------------------------------------------------------------------
  # output {
  #  stdout {
  #    id => "my_plugin_id"
  #  }
  # }
  # ---------------------------------------------------------------------------------------------------
  #
  config :id, :validate => :string

  def hash
    params.hash ^
    self.class.name.hash
  end

  def eql?(other)
    self.class.name == other.class.name && @params == other.params
  end

  def initialize(params=nil)
    @logger = self.logger
    # need to access settings statically because plugins are initialized in config_ast with no context.
    settings = LogStash::SETTINGS
    @slow_logger = self.slow_logger(settings.get("slowlog.threshold.warn"),
                                    settings.get("slowlog.threshold.info"),
                                    settings.get("slowlog.threshold.debug"),
                                    settings.get("slowlog.threshold.trace"))
    @params = LogStash::Util.deep_clone(params)
    # The id should always be defined normally, but in tests that might not be the case
    # In the future we may make this more strict in the Plugin API
    @params["id"] ||= "#{self.class.config_name}_#{SecureRandom.uuid}"
  end

  # Return a uniq ID for this plugin configuration, by default
  # we will generate a UUID
  #
  # If the user defines a `id => 'ABC'` in the configuration we will return
  #
  # @return [String] A plugin ID
  def id
    @params["id"]
  end

  # close is called during shutdown, after the plugin worker
  # main task terminates
  def do_close
    @logger.debug("Closing", :plugin => self.class.name)
    begin
      close
    ensure
      LogStash::PluginMetadata.delete_for_plugin(self.id)
    end
  end

  # Subclasses should implement this close method if you need to perform any
  # special tasks during shutdown (like flushing, etc.)
  def close
    # ..
  end

  def to_s
    return "#{self.class.name}: #{@params}"
  end

  def inspect
    if !@params.nil?
      description = @params
        .reject { |k, v| v.nil? || (v.respond_to?(:empty?) && v.empty?) }
        .collect { |k, v| "#{k}=>#{v.inspect}" }
      return "<#{self.class.name} #{description.join(", ")}>"
    else
      return "<#{self.class.name} --->"
    end
  end

  def reloadable?
    self.class.reloadable?
  end

  def self.reloadable?
    true
  end

  def debug_info
    [self.class.to_s, original_params]
  end

  def metric=(new_metric)
    @metric = new_metric
  end

  def metric
    # We can disable metric per plugin if we want in the configuration
    # we will use the NullMetric in this case.
    @metric_plugin ||= if @enable_metric
                         # Fallback when testing plugin and no metric collector are correctly configured.
                         @metric.nil? ? LogStash::Instrument::NamespacedNullMetric.new : @metric
                       else
                         LogStash::Instrument::NamespacedNullMetric.new(@metric, :null)
                       end
  end

  # return the configured name of this plugin
  # @return [String] The name of the plugin defined by `config_name`
  def config_name
    self.class.config_name
  end

  # This is keep for backward compatibility, the logic was moved into the registry class
  # but some plugins use this method to return a specific instance on lookup
  #
  # Should I remove this now and make sure the pipeline invoke the Registry or I should wait for 6.0
  # Its not really part of the public api but its used by the tests a lot to mock the plugins.
  def self.lookup(type, name)
    require "logstash/plugins/registry"
    LogStash::PLUGIN_REGISTRY.lookup_pipeline_plugin(type, name)
  end

  ##
  # Returns this plugin's metadata key/value store.
  #
  # @see LogStash::PluginMetadata for restrictions and caveats.
  # @since 7.1
  #
  # @usage:
  # ~~~
  # if defined?(plugin_metadata)
  #   plugin_metadata.set(:foo, 'value')
  # end
  # ~~~
  #
  # @return [LogStash::PluginMetadata]
  def plugin_metadata
    LogStash::PluginMetadata.for_plugin(self.id)
  end
end # class LogStash::Plugin
