# encoding: utf-8
require "logstash/event"
require "logstash/plugin"
require "logstash/config/mixin"
require "concurrent/atomic/atomic_fixnum"

class LogStash::Outputs::Base < LogStash::Plugin
  include LogStash::Util::Loggable
  include LogStash::Config::Mixin

  config_name "output"

  config :type, :validate => :string, :default => "", :obsolete => "You can achieve this same behavior with the new conditionals, like: `if [type] == \"sometype\" { %PLUGIN% { ... } }`."

  config :tags, :validate => :array, :default => [], :obsolete => "You can achieve similar behavior with the new conditionals, like: `if \"sometag\" in [tags] { %PLUGIN% { ... } }`"

  config :exclude_tags, :validate => :array, :default => [], :obsolete => "You can achieve similar behavior with the new conditionals, like: `if (\"sometag\" not in [tags]) { %PLUGIN% { ... } }`"

  # The codec used for output data. Output codecs are a convenient method for encoding your data before it leaves the output, without needing a separate filter in your Logstash pipeline.
  config :codec, :validate => :codec, :default => "plain"
  # TODO remove this in Logstash 6.0
  # when we no longer support the :legacy type
  # This is hacky, but it can only be herne
  config :workers, :type => :number, :default => 1

  # Set or return concurrency type
  def self.concurrency(type=nil)
    if type
      @concurrency = type
    else
      @concurrency || :legacy # default is :legacyo
    end
  end

  # Deprecated: Favor `concurrency :shared`
  def self.declare_threadsafe!
    concurrency :shared
  end

  # Deprecated: Favor `#concurrency`
  def self.threadsafe?
    concurrency == :shared
  end

  # Deprecated: Favor `concurrency :single`
  # Remove in Logstash 6.0.0
  def self.declare_workers_not_supported!(message=nil)
    concurrency :single
  end

  public

  def self.plugin_type
    "output"
  end

  public
  def initialize(params={})
    super
    config_init(@params)

    if self.workers != 1
      raise LogStash::ConfigurationError, "You are using a plugin that doesn't support workers but have set the workers value explicitly! This plugin uses the #{concurrency} and doesn't need this option"
    end

    # If we're running with a single thread we must enforce single-threaded concurrency by default
    # Maybe in a future version we'll assume output plugins are threadsafe
    @single_worker_mutex = Mutex.new

    @receives_encoded = self.methods.include?(:multi_receive_encoded)
  end

  public
  def register
    raise "#{self.class}#register must be overidden"
  end # def register

  public
  def receive(event)
    raise "#{self.class}#receive must be overidden"
  end # def receive

  public
  # To be overridden in implementations
  def multi_receive(events)
    if @receives_encoded
      self.multi_receive_encoded(codec.multi_encode(events))
    else
      events.each {|event| receive(event) }
    end
  end

  def workers_not_supported(message=nil)
    raise "This plugin (#{self.class.name}) is using the obsolete '#workers_not_supported' method. If you installed this plugin specifically on this Logstash version, it is not compatible. If you are a plugin author, please see https://www.elastic.co/guide/en/logstash/current/_how_to_write_a_logstash_output_plugin.html for more info"
  end

  def codec
    params["codec"]
  end

  def concurrency
    self.class.concurrency
  end

  def metric=(metric)
    super
    # Hack to create a new metric namespace using 'plugins' as the root
    @codec.metric = metric.root.namespace(metric.namespace_name[0...-2].push(:codecs, codec.id))
    metric
  end

  def execution_context=(context)
    super
    # There is no easy way to propage an instance variable into the codec, because the codec
    # are created at the class level
    # TODO(talevy): Codecs should have their own execution_context, for now they will inherit their
    #               parent plugin's
    @codec.execution_context = context
    context
  end

  private
  def output?(event)
    # TODO: noop for now, remove this once we delete this call from all plugins
    true
  end # def output?
end # class LogStash::Outputs::Base
