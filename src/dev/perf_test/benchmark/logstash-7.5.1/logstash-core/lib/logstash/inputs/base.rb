# encoding: utf-8
require "logstash/event"
require "logstash/plugin"
require "logstash/config/mixin"
require "logstash/codecs/base"
require "logstash/util/decorators"

# This is the base class for Logstash inputs.
class LogStash::Inputs::Base < LogStash::Plugin
  include LogStash::Util::Loggable
  include LogStash::Config::Mixin

  config_name "input"

  # Add a `type` field to all events handled by this input.
  #
  # Types are used mainly for filter activation.
  #
  # The type is stored as part of the event itself, so you can
  # also use the type to search for it in Kibana.
  #
  # If you try to set a type on an event that already has one (for
  # example when you send an event from a shipper to an indexer) then
  # a new input will not override the existing type. A type set at
  # the shipper stays with that event for its life even
  # when sent to another Logstash server.
  config :type, :validate => :string

  config :debug, :validate => :boolean, :default => false, :obsolete => "This setting no longer has any effect. In past releases, it existed, but almost no plugin made use of it."

  config :format, :validate => ["plain", "json", "json_event", "msgpack_event"], :obsolete => "You should use the newer 'codec' setting instead."

  config :charset, :obsolete => "Use the codec setting instead. For example: input { %PLUGIN% { codec => plain { charset => \"UTF-8\" } }"

  config :message_format, :validate => :string, :obsolete => "Setting is no longer valid."

  # The codec used for input data. Input codecs are a convenient method for decoding your data before it enters the input, without needing a separate filter in your Logstash pipeline.
  config :codec, :validate => :codec, :default => "plain"

  # Add any number of arbitrary tags to your event.
  #
  # This can help with processing later.
  config :tags, :validate => :array

  # Add a field to an event
  config :add_field, :validate => :hash, :default => {}

  attr_accessor :params
  attr_accessor :threadable

  def self.plugin_type
    "input"
  end

  public
  def initialize(params={})
    super
    @threadable = false
    @stop_called = Concurrent::AtomicBoolean.new(false)
    config_init(@params)
    @tags ||= []
  end # def initialize

  public
  def register
    raise "#{self.class}#register must be overidden"
  end # def register

  public
  def tag(newtag)
    @tags << newtag
  end # def tag

  public
  # override stop if you need to do more than do_stop to
  # enforce the input plugin to return from `run`.
  # e.g. a tcp plugin might need to close the tcp socket
  # so blocking read operation aborts
  def stop
    # override if necessary
  end

  public
  def do_stop
    @logger.debug("Stopping", :plugin => self.class.name)
    @stop_called.make_true
    stop
  end

  # stop? should never be overridden
  public
  def stop?
    @stop_called.value
  end

  def clone
    cloned = super
    cloned.codec = @codec.clone if @codec
    cloned
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

  protected
  def decorate(event)
    # Only set 'type' if not already set. This is backwards-compatible behavior
    event.set("type", @type) if @type && !event.include?("type")

    LogStash::Util::Decorators.add_fields(@add_field,event,"inputs/#{self.class.name}")
    LogStash::Util::Decorators.add_tags(@tags,event,"inputs/#{self.class.name}")
  end

  protected
  def fix_streaming_codecs
    require "logstash/codecs/plain"
    require "logstash/codecs/line"
    require "logstash/codecs/json"
    require "logstash/codecs/json_lines"

    case @codec.class.name
      when "LogStash::Codecs::Plain"
        @logger.info("Automatically switching from #{@codec.class.config_name} to line codec", :plugin => self.class.config_name)
        @codec = LogStash::Codecs::Line.new("charset" => @codec.charset)
      when "LogStash::Codecs::JSON"
        @logger.info("Automatically switching from #{@codec.class.config_name} to json_lines codec", :plugin => self.class.config_name)
        @codec = LogStash::Codecs::JSONLines.new("charset" => @codec.charset)
    end
  end
end # class LogStash::Inputs::Base
