# encoding: utf-8
require "logstash-input-azure_event_hubs"
require "logstash/inputs/base"
require "logstash/namespace"
require "stud/interval"
require "logstash/inputs/processor_factory"
require "logstash/inputs/error_notification_handler"
require "logstash/inputs/named_thread_factory"
require "logstash/inputs/look_back_position_provider"


java_import com.microsoft.azure.eventprocessorhost.EventProcessorHost
java_import com.microsoft.azure.eventprocessorhost.EventProcessorOptions
java_import com.microsoft.azure.eventprocessorhost.InMemoryCheckpointManager
java_import com.microsoft.azure.eventprocessorhost.InMemoryLeaseManager
java_import com.microsoft.azure.eventprocessorhost.HostContext
java_import com.microsoft.azure.eventhubs.ConnectionStringBuilder
java_import java.util.concurrent.Executors
java_import java.util.concurrent.TimeUnit


class LogStash::Inputs::AzureEventHubs < LogStash::Inputs::Base
  config_name "azure_event_hubs"

  # This plugin supports two styles of configuration
  # basic - You supply a list of Event Hub connection strings complete with the 'EntityPath' that defines the Event Hub name. All other configuration is shared.
  # advanced - You supply a list of Event Hub names, and under each name provide that Event Hub's configuration. Most all of the configuration options are identical as the basic model, except they are configured per Event Hub.
  # Defaults to basic
  # Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"  , "Endpoint=sb://example2...;EntityPath=event_hub_name2"  ]
  # }
  config :config_mode, :validate => ['basic', 'advanced'], :default => 'basic'

  # advanced MODE ONLY - The event hubs to read from. This is a array of hashes, where the each entry of the array is a hash of the event_hub_name => {configuration}.
  # Note - most basic configuration options are supported under the Event Hub names, and examples proved where applicable
  # Note - while in advanced mode, if any basic options are defined at the top level they will be used if not already defined under the Event Hub name.  e.g. you may define shared configuration at the top level
  # Note - the required event_hub_connection is named 'event_hub_connection' (singular) which differs from the basic configuration option 'event_hub_connections' (plural)
  # Note - the 'event_hub_connection' may contain the 'EntityPath', but only if it matches the Event Hub name.
  # Note - the same Event Hub name is allowed under different configurations (and is why the config is array of Hashes)
  # Example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #       }},
  #       { "event_hub_name2" => {
  #           event_hub_connection => "Endpoint=sb://example2..."
  #           storage_connection => "DefaultEndpointsProtocol=https;AccountName=example...."
  #           storage_container => "my_container"
  #      }}
  #    ]
  #    consumer_group => "logstash" # shared across all Event Hubs
  # }
  config :event_hubs, :validate => :array, :required => true # only required for advanced mode

  # basic MODE ONLY - The Event Hubs to read from. This is a list of Event Hub connection strings that includes the 'EntityPath'.
  # All other configuration options will be shared between Event Hubs.
  # Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"  , "Endpoint=sb://example2...;EntityPath=event_hub_name2"  ]
  # }
  config :event_hub_connections, :validate => :array, :required => true # only required for basic mode

  # Used to persists the offsets between restarts and ensure that multiple instances of Logstash process different partitions
  # This is *stongly* encouraged to be set for production environments.
  # When this value is set, restarts will pick up from where it left off. Without this value set the initial_position is *always* used.
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    storage_connection => "DefaultEndpointsProtocol=https;AccountName=example...."
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           storage_connection => "DefaultEndpointsProtocol=https;AccountName=example...."
  #       }}
  #    ]
  # }
  config :storage_connection, :validate => :password, :required => false

  # The storage container to persist the offsets.
  # Note - don't allow multiple Event Hubs to write to the same container with the same consumer group, else the offsets will be persisted incorrectly.
  # Note - this will default to the event hub name if not defined
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    storage_connection => "DefaultEndpointsProtocol=https;AccountName=example...."
  #    storage_container => "my_container"
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           storage_connection => "DefaultEndpointsProtocol=https;AccountName=example...."
  #           storage_container => "my_container"
  #       }}
  #    ]
  # }
  config :storage_container, :validate => :string, :required => false

  # Total threads used process events. Requires at minimum 2 threads. This option can not be set per Event Hub.
  # azure_event_hubs {
  #    threads => 4
  # }
  config :threads, :validate => :number, :default => 4

  # Consumer group used to read the Event Hub(s). It is recommended to change from the $Default to a consumer group specifically for Logstash, and ensure that all instances of Logstash use that consumer group.
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    consumer_group => "logstash"
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           consumer_group => "logstash"
  #       }}
  #    ]
  # }
  config :consumer_group, :validate => :string, :default => '$Default'

  # The max size of events are processed together. A checkpoint is created after each batch. Increasing this value may help with performance, but requires more memory.
  # Defaults to 50
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    max_batch_size => 125
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           max_batch_size => 125
  #       }}
  #    ]
  # }
  config :max_batch_size, :validate => :number, :default => 125

  # The max size of events that are retrieved prior to processing. Increasing this value may help with performance, but requires more memory.
  # Defaults to 300
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    prefetch_count => 300
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           prefetch_count => 300
  #       }}
  #    ]
  # }
  # NOTE - This option is intentionally not part of the public documentation. This is a very low level configuration that shouldn't need to be changed by anyone other then an Event Hub expert.
  config :prefetch_count, :validate => :number, :default => 300

  # The max time allowed receive events without a timeout.
  # Value is expressed in seconds, default 60
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    receive_timeout => 60
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           receive_timeout => 300
  #       }}
  #    ]
  # }
  # NOTE - This option is intentionally not part of the public documentation. This is a very low level configuration that shouldn't need to be changed by anyone other then an Event Hub expert.
  config :receive_timeout, :validate => :number, :default => 60

  # When first reading from an event hub, start from this position.
  # beginning - reads ALL pre-existing events in the event hub
  # end - reads NO pre-existing events in the event hub
  # look_back - reads end minus N seconds worth of pre-existing events
  # Note - If the storage_connection is set, this configuration is only applicable for the very first time Logstash reads from the event hub.
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    initial_position => "beginning"
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           initial_position => "beginning"
  #       }}
  #    ]
  # }
  config :initial_position, :validate => ['beginning', 'end', 'look_back'], :default => 'beginning'

  # The number of seconds to look back for pre-existing events to determine the initial position.
  # Note - If the storage_connection is set, this configuration is only applicable for the very first time Logstash reads from the event hub.
  # Note - this options is only used when initial_position => "look_back"
  # Value is expressed in seconds, default is 1 day
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    initial_position => "look_back"
  #    initial_position_look_back => 86400
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           initial_position => "look_back"
  #           initial_position_look_back => 86400
  #       }}
  #    ]
  # }
  config :initial_position_look_back, :validate => :number, :default => 86400

  # The interval in seconds between writing checkpoint while processing a batch. Default 5 seconds. Checkpoints can slow down processing, but are needed to know where to start after a restart.
  # Note - checkpoints happen after every batch, so this configuration is only applicable while processing a single batch.
  # Value is expressed in seconds, set to zero to disable
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    checkpoint_interval => 5
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           checkpoint_interval => 5
  #       }}
  #    ]
  # }
  config :checkpoint_interval, :validate => :number, :default => 5

  # Adds meta data to the event.
  # [@metadata][azure_event_hubs][name] - the name of hte event host
  # [@metadata][azure_event_hubs][consumer_group] - the consumer group that consumed this event
  # [@metadata][azure_event_hubs][processor_host] - the unique identifier that identifies which host processed this event. Note - there can be multiple processor hosts on a single instance of Logstash.
  # [@metadata][azure_event_hubs][partition] - the partition from which event came from
  # [@metadata][azure_event_hubs][offset] - the event hub offset for this event
  # [@metadata][azure_event_hubs][sequence] - the event hub sequence for this event
  # [@metadata][azure_event_hubs][timestamp] - the enqueued time of the event
  # [@metadata][azure_event_hubs][event_size] - the size of the event
  # basic Example:
  # azure_event_hubs {
  #    config_mode => "basic"
  #    event_hub_connections => ["Endpoint=sb://example1...;EntityPath=event_hub_name1"]
  #    decorate_events => true
  # }
  # advanced example:
  # azure_event_hubs {
  #   config_mode => "advanced"
  #   event_hubs => [
  #       { "event_hub_name1" => {
  #           event_hub_connection => "Endpoint=sb://example1..."
  #           decorate_events => true
  #       }}
  #    ]
  # }
  config :decorate_events, :validate => :boolean, :default => false

  attr_reader :count, :pre_count

  def initialize(params)

    # explode the all of the parameters to be scoped per event_hub
    @event_hubs_exploded = []
    # global_config will be merged into the each of the exploded configs, prefer any configuration already scoped over the globally scoped config
    global_config = {}
    params.each do |k, v|
      if !k.eql?('id') && !k.eql?('event_hubs') && !k.eql?('threads') && !k.eql?('event_hub_connections')  # don't copy these to the per-event-hub configs
        global_config[k] = v
      end
    end

    if params['config_mode'] && params['config_mode'].eql?('advanced')
      params['event_hub_connections'] = ['dummy'] # trick the :required validation

      params['event_hubs'].each do |event_hub|
        raise "event_hubs must be a Hash" unless event_hub.is_a?(Hash)
        event_hub.each do |event_hub_name, config|
          config.each do |k, v|
            if 'event_hub_connection'.eql?(k) || 'storage_connection'.eql?(k) # protect from leaking logs
              config[k] = ::LogStash::Util::Password.new(v)
            end
          end
          if config['event_hub_connection'] #add the 's' to pass validation
            config['event_hub_connections'] = config['event_hub_connection']
            config.delete('event_hub_connection')
          end

          config.merge!({'event_hubs' => [event_hub_name]})
          config.merge!(global_config) {|k, v1, v2| v1}
          @event_hubs_exploded << config
        end
      end
    else # basic config
      params['event_hubs'] = ['dummy'] # trick the :required validation
      if params['event_hub_connections']
        connections = *params['event_hub_connections'] # ensure array
        connections.each.with_index do |_connection, i|
          begin
            connection = self.class.replace_placeholders(_connection) if self.class.respond_to? 'replace_placeholders' # 6.x
            connection = self.class.replace_env_placeholders(_connection) if self.class.respond_to? 'replace_env_placeholders' # 5.x
            event_hub_name = ConnectionStringBuilder.new(connection).getEventHubName
            redacted_connection = connection.gsub(/(SharedAccessKey=)([0-9a-zA-Z=+]*)([;]*)(.*)/, '\\1<redacted>\\3\\4')
            params['event_hub_connections'][i] = redacted_connection # protect from leaking logs
            raise "invalid Event Hub name" unless event_hub_name
          rescue
            raise LogStash::ConfigurationError, "Error parsing event hub string name for connection: '#{redacted_connection}' please ensure that the connection string contains the EntityPath"
          end
          @event_hubs_exploded << {'event_hubs' => [event_hub_name]}.merge({'event_hub_connections' => [::LogStash::Util::Password.new(connection)]}).merge(global_config) {|k, v1, v2| v1}
        end
      end
    end

    super(params)

    container_consumer_groups = []
    # explicitly validate all the per event hub configs
    @event_hubs_exploded.each do |event_hub|
      if !self.class.validate(event_hub)
        raise LogStash::ConfigurationError, I18n.t("logstash.runner.configuration.invalid_plugin_settings")
      end
      container_consumer_groups << {event_hub['storage_connection'].value.to_s + (event_hub['storage_container'] ? event_hub['storage_container'] : event_hub['event_hubs'][0]) => event_hub['consumer_group']} if event_hub['storage_connection']
    end
    raise "The configuration will result in overwriting offsets. Please ensure that the each Event Hub's consumer_group is using a unique storage container." if container_consumer_groups.size > container_consumer_groups.uniq.size
  end

  attr_reader :event_hubs_exploded

  def register
    # augment the exploded config with the defaults
    @event_hubs_exploded.each do |event_hub|
      @config.each do |key, value|
        if !key.eql?('id') && !key.eql?('event_hubs')
          event_hub[key] = value unless event_hub[key]
        end
      end
    end
    @logger.debug("Exploded Event Hub configuration.",  :event_hubs_exploded => @event_hubs_exploded.to_s)
  end

  def run(queue)
    event_hub_threads = []
    named_thread_factory = LogStash::Inputs::Azure::NamedThreadFactory.new("azure_event_hubs-worker", @id)
    scheduled_executor_service = Executors.newScheduledThreadPool(@threads, named_thread_factory)
    @event_hubs_exploded.each do |event_hub|
      event_hub_threads << Thread.new do
        event_hub_name = event_hub['event_hubs'].first # there will always only be 1 from @event_hubs_exploded
        @logger.info("Event Hub #{event_hub_name} is initializing... ")
        begin
          if event_hub['storage_connection']
            event_processor_host = EventProcessorHost.new(
                EventProcessorHost.createHostName('logstash'),
                event_hub_name,
                event_hub['consumer_group'],
                event_hub['event_hub_connections'].first.value, #there will only be one in this array by the time it gets here
                event_hub['storage_connection'].value,
                event_hub.fetch('storage_container', event_hub_name),
                scheduled_executor_service)
          else
            @logger.warn("You have NOT specified a `storage_connection_string` for #{event_hub_name}. This configuration is only supported for a single Logstash instance.")
            checkpoint_manager = InMemoryCheckpointManager.new
            lease_manager = InMemoryLeaseManager.new
            event_processor_host = EventProcessorHost.new(
                EventProcessorHost.createHostName('logstash'),
                event_hub_name,
                event_hub['consumer_group'],
                event_hub['event_hub_connections'].first.value, #there will only be one in this array by the time it gets here
                checkpoint_manager,
                lease_manager,
                scheduled_executor_service,
                nil)
            #using java_send to avoid naming conflicts with 'initialize' method
            lease_manager.java_send :initialize, [HostContext], event_processor_host.getHostContext
            checkpoint_manager.java_send :initialize, [HostContext], event_processor_host.getHostContext
          end
          options = EventProcessorOptions.new
          options.setExceptionNotification(LogStash::Inputs::Azure::ErrorNotificationHandler.new)
          case @initial_position
          when 'beginning'
            msg = "Configuring Event Hub #{event_hub_name} to read events all events."
            @logger.debug("If this is the initial read... " + msg) if event_hub['storage_connection']
            @logger.info(msg) unless event_hub['storage_connection']
            options.setInitialPositionProvider(EventProcessorOptions::StartOfStreamInitialPositionProvider.new(options))
          when 'end'
            msg = "Configuring Event Hub #{event_hub_name} to read only new events."
            @logger.debug("If this is the initial read... " + msg) if event_hub['storage_connection']
            @logger.info(msg) unless event_hub['storage_connection']
            options.setInitialPositionProvider(EventProcessorOptions::EndOfStreamInitialPositionProvider.new(options))
          when 'look_back'
            msg = "Configuring Event Hub #{event_hub_name} to read events starting at 'now - #{@initial_position_look_back}' seconds."
            @logger.debug("If this is the initial read... " + msg) if event_hub['storage_connection']
            @logger.info(msg) unless event_hub['storage_connection']
            options.setInitialPositionProvider(LogStash::Inputs::Azure::LookBackPositionProvider.new(@initial_position_look_back))
          end
          event_processor_host.registerEventProcessorFactory(LogStash::Inputs::Azure::ProcessorFactory.new(queue, event_hub['codec'], event_hub['checkpoint_interval'], self.method(:decorate), event_hub['decorate_events']), options)
              .whenComplete {|x, e|
                @logger.info("Event Hub registration complete. ", :event_hub_name => event_hub_name )
                @logger.error("Event Hub failure while registering.", :event_hub_name => event_hub_name, :exception => e, :backtrace => e.backtrace) if e
              }
              .then_accept {|x|
                @logger.info("Event Hub is processing events... ", :event_hub_name => event_hub_name )
                # this blocks the completable future chain from progressing, actual work is done via the executor service
                while !stop?
                  Stud.stoppable_sleep(1) {stop?}
                end
              }
              .thenCompose {|x|
                @logger.info("Unregistering Event Hub this can take a while... ", :event_hub_name => event_hub_name )
                event_processor_host.unregisterEventProcessor
              }
              .exceptionally {|e|
                @logger.error("Event Hub encountered an error.", :event_hub_name => event_hub_name , :exception => e, :backtrace => e.backtrace) if e
                nil
              }
              .get # this blocks till all of the futures are complete.
          @logger.info("Event Hub #{event_hub_name} is closed.")
        rescue => e
          @logger.error("Event Hub failed during initialization.", :event_hub_name => event_hub_name, :exception => e, :backtrace => e.backtrace) if e
          do_stop
        end
      end
    end

    # this blocks the input from existing. (all work is being done in threads)
    while !stop?
      Stud.stoppable_sleep(1) {stop?}
    end

    # This blocks the input till all the threads have run to completion.
    event_hub_threads.each do |thread|
      thread.join
    end

    # Ensure proper shutdown of executor service. # Note - this causes a harmless warning in the logs that scheduled tasks are being rejected.
    scheduled_executor_service.shutdown
    begin
      scheduled_executor_service.awaitTermination(10, TimeUnit::MINUTES);
    rescue => e
      @logger.debug("interrupted while waiting to close executor service, this can generally be ignored", :exception => e, :backtrace => e.backtrace) if e
    end
  end
end


