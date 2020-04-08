# encoding: utf-8
require "logstash/event"
require "logstash/plugin"
require "logstash/config/mixin"
require "logstash/util/decorators"

class LogStash::Filters::Base < LogStash::Plugin
  include LogStash::Util::Loggable
  include LogStash::Config::Mixin

  config_name "filter"

  config :type, :validate => :string, :default => "", :obsolete => "You can achieve this same behavior with the new conditionals, like: `if [type] == \"sometype\" { %PLUGIN% { ... } }`."

  config :tags, :validate => :array, :default => [], :obsolete => "You can achieve similar behavior with the new conditionals, like: `if \"sometag\" in [tags] { %PLUGIN% { ... } }`"

  config :exclude_tags, :validate => :array, :default => [], :obsolete => "You can achieve similar behavior with the new conditionals, like: `if (\"sometag\" not in [tags]) { %PLUGIN% { ... } }`"

  # If this filter is successful, add arbitrary tags to the event.
  # Tags can be dynamic and include parts of the event using the `%{field}`
  # syntax.
  #
  # Example:
  # [source,ruby]
  #     filter {
  #       %PLUGIN% {
  #         add_tag => [ "foo_%{somefield}" ]
  #       }
  #     }
  # [source,ruby]
  #     # You can also add multiple tags at once:
  #     filter {
  #       %PLUGIN% {
  #         add_tag => [ "foo_%{somefield}", "taggedy_tag"]
  #       }
  #     }
  #
  # If the event has field `"somefield" == "hello"` this filter, on success,
  # would add a tag `foo_hello` (and the second example would of course add a `taggedy_tag` tag).
  config :add_tag, :validate => :array, :default => []

  # If this filter is successful, remove arbitrary tags from the event.
  # Tags can be dynamic and include parts of the event using the `%{field}`
  # syntax.
  #
  # Example:
  # [source,ruby]
  #     filter {
  #       %PLUGIN% {
  #         remove_tag => [ "foo_%{somefield}" ]
  #       }
  #     }
  # [source,ruby]
  #     # You can also remove multiple tags at once:
  #     filter {
  #       %PLUGIN% {
  #         remove_tag => [ "foo_%{somefield}", "sad_unwanted_tag"]
  #       }
  #     }
  #
  # If the event has field `"somefield" == "hello"` this filter, on success,
  # would remove the tag `foo_hello` if it is present. The second example
  # would remove a sad, unwanted tag as well.
  config :remove_tag, :validate => :array, :default => []

  # If this filter is successful, add any arbitrary fields to this event.
  # Field names can be dynamic and include parts of the event using the `%{field}`.
  #
  # Example:
  # [source,ruby]
  #     filter {
  #       %PLUGIN% {
  #         add_field => { "foo_%{somefield}" => "Hello world, from %{host}" }
  #       }
  #     }
  # [source,ruby]
  #     # You can also add multiple fields at once:
  #     filter {
  #       %PLUGIN% {
  #         add_field => {
  #           "foo_%{somefield}" => "Hello world, from %{host}"
  #           "new_field" => "new_static_value"
  #         }
  #       }
  #     }
  #
  # If the event has field `"somefield" == "hello"` this filter, on success,
  # would add field `foo_hello` if it is present, with the
  # value above and the `%{host}` piece replaced with that value from the
  # event. The second example would also add a hardcoded field.
  config :add_field, :validate => :hash, :default => {}

  # If this filter is successful, remove arbitrary fields from this event.
  # Fields names can be dynamic and include parts of the event using the %{field}
  # Example:
  # [source,ruby]
  #     filter {
  #       %PLUGIN% {
  #         remove_field => [ "foo_%{somefield}" ]
  #       }
  #     }
  # [source,ruby]
  #     # You can also remove multiple fields at once:
  #     filter {
  #       %PLUGIN% {
  #         remove_field => [ "foo_%{somefield}", "my_extraneous_field" ]
  #       }
  #     }
  #
  # If the event has field `"somefield" == "hello"` this filter, on success,
  # would remove the field with name `foo_hello` if it is present. The second
  # example would remove an additional, non-dynamic field.
  config :remove_field, :validate => :array, :default => []

  # Call the filter flush method at regular interval.
  # Optional.
  config :periodic_flush, :validate => :boolean, :default => false

  def self.plugin_type
    "filter"
  end

  public
  def initialize(params)
    super
    config_init(@params)
    @threadsafe = true
  end # def initialize

  public
  def register
    raise "#{self.class}#register must be overidden"
  end # def register

  public
  def filter(event)
    raise "#{self.class}#filter must be overidden"
  end # def filter

  public
  def do_filter(event, &block)
    time = java.lang.System.nanoTime
    filter(event, &block)
    @slow_logger.on_event("event processing time", @original_params, event, java.lang.System.nanoTime - time)
  end


  # in 1.5.0 multi_filter is meant to be used in the generated filter function in LogStash::Config::AST::Plugin only
  # and is temporary until we refactor the filter method interface to accept events list and return events list,
  # just list in multi_filter see https://github.com/elastic/logstash/issues/2872.
  # refactoring the filter method will mean updating all plugins which we want to avoid doing for 1.5.0.
  #
  # @param events [Array<LogStash::Event] list of events to filter
  # @return [Array<LogStash::Event] filtered events and any new events generated by the filter
  public
  def multi_filter(events)
    LogStash::Util.set_thread_plugin(self)
    result = []
    events.each do |event|
      unless event.cancelled?
        result << event
        do_filter(event){|new_event| result << new_event}
      end
    end
    result
  end

  public
  def execute(event, &block)
    do_filter(event, &block)
  end # def execute

  public
  def threadsafe?
    @threadsafe
  end

  # a filter instance should call filter_matched from filter if the event
  # matches the filter's conditions (right type, etc)
  protected
  def filter_matched(event)
    LogStash::Util::Decorators.add_fields(@add_field,event,"filters/#{self.class.name}")

    @remove_field.each do |field|
      field = event.sprintf(field)
      @logger.debug? and @logger.debug("filters/#{self.class.name}: removing field",
                                       :field => field)
      event.remove(field)
    end

    LogStash::Util::Decorators.add_tags(@add_tag,event,"filters/#{self.class.name}")

    # note below that the tags array field needs to be updated then reassigned to the event.
    # this is important because a construct like event["tags"].delete(tag) will not work
    # in the current Java event implementation. see https://github.com/elastic/logstash/issues/4140

    return if @remove_tag.empty?

    tags = event.get("tags")
    return unless tags

    tags = Array(tags)
    @remove_tag.each do |tag|
      break if tags.empty?

      tag = event.sprintf(tag)
      @logger.debug? and @logger.debug("filters/#{self.class.name}: removing tag", :tag => tag)
      tags.delete(tag)
    end

    event.set("tags", tags)
  end # def filter_matched

  protected
  def filter?(event)
    # TODO: noop for now, remove this once we delete this call from all plugins
    true
  end # def filter?

  public
  def close
    # Nothing to do by default.
  end
end # class LogStash::Filters::Base
