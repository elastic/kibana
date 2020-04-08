# encoding: utf-8

require "logstash/filters/base"
require "logstash/namespace"
require "thread"
require "logstash/util/decorators"


class LogStash::Filters::Aggregate < LogStash::Filters::Base


  # ############## #
  # CONFIG OPTIONS #
  # ############## #


  config_name "aggregate"

  config :task_id, :validate => :string, :required => true

  config :code, :validate => :string, :required => true

  config :map_action, :validate => ["create", "update", "create_or_update"], :default => "create_or_update"

  config :end_of_task, :validate => :boolean, :default => false

  config :aggregate_maps_path, :validate => :string, :required => false

  config :timeout, :validate => :number, :required => false

  config :inactivity_timeout, :validate => :number, :required => false

  config :timeout_code, :validate => :string, :required => false

  config :push_map_as_event_on_timeout, :validate => :boolean, :required => false, :default => false

  config :push_previous_map_as_event, :validate => :boolean, :required => false, :default => false

  config :timeout_timestamp_field, :validate => :string, :required => false

  config :timeout_task_id_field, :validate => :string, :required => false

  config :timeout_tags, :validate => :array, :required => false, :default => []


  # ################## #
  # INSTANCE VARIABLES #
  # ################## #


  # pointer to current pipeline context
  attr_accessor :current_pipeline

  # boolean indicating if expired maps should be checked on every flush call (typically because custom timeout has beeen set on a map)
  attr_accessor :check_expired_maps_on_every_flush

  # ################ #
  # STATIC VARIABLES #
  # ################ #


  # Default timeout (in seconds) when not defined in plugin configuration
  DEFAULT_TIMEOUT = 1800

  # Store all shared aggregate attributes per pipeline id
  @@pipelines = {}


  # ####### #
  # METHODS #
  # ####### #


  # Initialize plugin
  public
  def register

    @logger.debug("Aggregate register call", :code => @code)

    # validate task_id option
    if !@task_id.match(/%\{.+\}/)
      raise LogStash::ConfigurationError, "Aggregate plugin: task_id pattern '#{@task_id}' must contain a dynamic expression like '%{field}'"
    end

    # process lambda expression to call in each filter call
    eval("@codeblock = lambda { |event, map, map_meta| #{@code} }", binding, "(aggregate filter code)")

    # process lambda expression to call in the timeout case or previous event case
    if @timeout_code
      eval("@timeout_codeblock = lambda { |event| #{@timeout_code} }", binding, "(aggregate filter timeout code)")
    end

    # init pipeline context
    @@pipelines[pipeline_id] ||= LogStash::Filters::Aggregate::Pipeline.new()
    @current_pipeline = @@pipelines[pipeline_id]

    @current_pipeline.mutex.synchronize do

      # timeout management : define eviction_instance for current task_id pattern
      if has_timeout_options?
        if @current_pipeline.flush_instance_map.has_key?(@task_id)
          # all timeout options have to be defined in only one aggregate filter per task_id pattern
          raise LogStash::ConfigurationError, "Aggregate plugin: For task_id pattern '#{@task_id}', there are more than one filter which defines timeout options. All timeout options have to be defined in only one aggregate filter per task_id pattern. Timeout options are : #{display_timeout_options}"
        end
        @current_pipeline.flush_instance_map[@task_id] = self
        @logger.debug("Aggregate timeout for '#{@task_id}' pattern: #{@timeout} seconds")
      end

      # timeout management : define default_timeout
      if @timeout && (@current_pipeline.default_timeout.nil? || @timeout < @current_pipeline.default_timeout)
        @current_pipeline.default_timeout = @timeout
        @logger.debug("Aggregate default timeout: #{@timeout} seconds")
      end

      # inactivity timeout management: make sure it is lower than timeout
      if @inactivity_timeout && ((@timeout && @inactivity_timeout > @timeout) || (@current_pipeline.default_timeout && @inactivity_timeout > @current_pipeline.default_timeout))
        raise LogStash::ConfigurationError, "Aggregate plugin: For task_id pattern #{@task_id}, inactivity_timeout must be lower than timeout"
      end

      # reinit pipeline_close_instance (if necessary)
      if !@current_pipeline.aggregate_maps_path_set && @current_pipeline.pipeline_close_instance
        @current_pipeline.pipeline_close_instance = nil
      end

      # check if aggregate_maps_path option has already been set on another instance else set @current_pipeline.aggregate_maps_path_set
      if @aggregate_maps_path
        if @current_pipeline.aggregate_maps_path_set
          @current_pipeline.aggregate_maps_path_set = false
          raise LogStash::ConfigurationError, "Aggregate plugin: Option 'aggregate_maps_path' must be set on only one aggregate filter"
        else
          @current_pipeline.aggregate_maps_path_set = true
          @current_pipeline.pipeline_close_instance = self
        end
      end

      # load aggregate maps from file (if option defined)
      if @aggregate_maps_path && File.exist?(@aggregate_maps_path)
        File.open(@aggregate_maps_path, "r") { |from_file| @current_pipeline.aggregate_maps.merge!(Marshal.load(from_file)) }
        File.delete(@aggregate_maps_path)
        @logger.info("Aggregate maps loaded from : #{@aggregate_maps_path}")
      end

      # init aggregate_maps
      @current_pipeline.aggregate_maps[@task_id] ||= {}
      update_aggregate_maps_metric()

    end
  end

  # Called when Logstash stops
  public
  def close

    @logger.debug("Aggregate close call", :code => @code)

    # define pipeline close instance if none is already defined
    @current_pipeline.pipeline_close_instance = self if @current_pipeline.pipeline_close_instance.nil?

    if @current_pipeline.pipeline_close_instance == self
      # store aggregate maps to file (if option defined)
      @current_pipeline.mutex.synchronize do
        @current_pipeline.aggregate_maps.delete_if { |key, value| value.empty? }
        if @aggregate_maps_path && !@current_pipeline.aggregate_maps.empty?
          File.open(@aggregate_maps_path, "w"){ |to_file| Marshal.dump(@current_pipeline.aggregate_maps, to_file) }
          @logger.info("Aggregate maps stored to : #{@aggregate_maps_path}")
        end
      end

      # remove pipeline context for Logstash reload
      @@pipelines.delete(pipeline_id)
    end

  end

  # This method is invoked each time an event matches the filter
  public
  def filter(event)

    # define task id
    task_id = event.sprintf(@task_id)
    return if task_id.nil? || task_id == @task_id

    noError = false
    event_to_yield = nil

    # protect aggregate_maps against concurrent access, using a mutex
    @current_pipeline.mutex.synchronize do

      # if timeout is based on event timestamp, check if task_id map is expired and should be removed
      if @timeout_timestamp_field
        event_to_yield = remove_expired_map_based_on_event_timestamp(task_id, event)
      end

      # retrieve the current aggregate map
      aggregate_maps_element = @current_pipeline.aggregate_maps[@task_id][task_id]

      # case where aggregate map isn't already created
      if aggregate_maps_element.nil?
        return if @map_action == "update"

        # create new event from previous map, if @push_previous_map_as_event is enabled
        if @push_previous_map_as_event && !@current_pipeline.aggregate_maps[@task_id].empty?
          event_to_yield = extract_previous_map_as_event()
        end

        # create aggregate map
        creation_timestamp = reference_timestamp(event)
        aggregate_maps_element = LogStash::Filters::Aggregate::Element.new(creation_timestamp, task_id)
        @current_pipeline.aggregate_maps[@task_id][task_id] = aggregate_maps_element
        update_aggregate_maps_metric()
      else
        return if @map_action == "create"
      end

      # update last event timestamp
      aggregate_maps_element.lastevent_timestamp = reference_timestamp(event)
      aggregate_maps_element.difference_from_lastevent_to_now = (Time.now - aggregate_maps_element.lastevent_timestamp).to_i

      # execute the code to read/update map and event
      map = aggregate_maps_element.map
      begin
        @codeblock.call(event, map, aggregate_maps_element)
        @logger.debug("Aggregate successful filter code execution", :code => @code)
        noError = true
      rescue => exception
        @logger.error("Aggregate exception occurred",
                      :error => exception,
                      :code => @code,
                      :map => map,
                      :event_data => event.to_hash_with_metadata)
        event.tag("_aggregateexception")
        metric.increment(:code_errors)
      end

      # delete the map if task is ended
      @current_pipeline.aggregate_maps[@task_id].delete(task_id) if @end_of_task
      update_aggregate_maps_metric()

      # process custom timeout set by code block
      if (aggregate_maps_element.timeout || aggregate_maps_element.inactivity_timeout)
        event_to_yield = process_map_timeout(aggregate_maps_element)
      end

    end

    # match the filter, only if no error occurred
    filter_matched(event) if noError

    # yield previous map as new event if set
    yield event_to_yield if event_to_yield
  end

  # Process a custom timeout defined in aggregate map element
  # Returns an event to yield if timeout=0 and push_map_as_event_on_timeout=true
  def process_map_timeout(element)
    event_to_yield = nil
    init_pipeline_timeout_management()
    if (element.timeout == 0 || element.inactivity_timeout == 0)
      @current_pipeline.aggregate_maps[@task_id].delete(element.task_id)
      if @current_pipeline.flush_instance_map[@task_id].push_map_as_event_on_timeout
        event_to_yield = create_timeout_event(element.map, element.task_id)
      end
      @logger.debug("Aggregate remove expired map with task_id=#{element.task_id} and custom timeout=0")
      metric.increment(:task_timeouts)
      update_aggregate_maps_metric()
    else
      @current_pipeline.flush_instance_map[@task_id].check_expired_maps_on_every_flush ||= true
    end
    return event_to_yield
  end

  # Create a new event from the aggregation_map and the corresponding task_id
  # This will create the event and
  #  if @timeout_task_id_field is set, it will set the task_id on the timeout event
  #  if @timeout_code is set, it will execute the timeout code on the created timeout event
  # returns the newly created event
  def create_timeout_event(aggregation_map, task_id)

    @logger.debug("Aggregate create_timeout_event call with task_id '#{task_id}'")

    event_to_yield = LogStash::Event.new(aggregation_map)

    if @timeout_task_id_field
      event_to_yield.set(@timeout_task_id_field, task_id)
    end

    LogStash::Util::Decorators.add_tags(@timeout_tags, event_to_yield, "filters/#{self.class.name}")


    # Call timeout code block if available
    if @timeout_code
      begin
        @timeout_codeblock.call(event_to_yield)
      rescue => exception
        @logger.error("Aggregate exception occurred",
                      :error => exception,
                      :timeout_code => @timeout_code,
                      :timeout_event_data => event_to_yield.to_hash_with_metadata)
        event_to_yield.tag("_aggregateexception")
        metric.increment(:timeout_code_errors)
      end
    end

    metric.increment(:pushed_events)

    return event_to_yield
  end

  # Extract the previous map in aggregate maps, and return it as a new Logstash event
  def extract_previous_map_as_event
    previous_entry = @current_pipeline.aggregate_maps[@task_id].shift()
    previous_task_id = previous_entry[0]
    previous_map = previous_entry[1].map
    update_aggregate_maps_metric()
    return create_timeout_event(previous_map, previous_task_id)
  end

  # Necessary to indicate Logstash to periodically call 'flush' method
  def periodic_flush
    true
  end

  # This method is invoked by LogStash every 5 seconds.
  def flush(options = {})

    @logger.trace("Aggregate flush call with #{options}")

    # init flush/timeout properties for current pipeline
    init_pipeline_timeout_management()
    
    # launch timeout management only every interval of (@inactivity_timeout / 2) seconds or at Logstash shutdown
    if @current_pipeline.flush_instance_map[@task_id] == self && @current_pipeline.aggregate_maps[@task_id] && (!@current_pipeline.last_flush_timestamp_map.has_key?(@task_id) || Time.now > @current_pipeline.last_flush_timestamp_map[@task_id] + @inactivity_timeout / 2 || options[:final] || @check_expired_maps_on_every_flush)
      events_to_flush = remove_expired_maps()

      # at Logstash shutdown, if push_previous_map_as_event is enabled, it's important to force flush (particularly for jdbc input plugin)
      @current_pipeline.mutex.synchronize do
        if options[:final] && @push_previous_map_as_event && !@current_pipeline.aggregate_maps[@task_id].empty?
          events_to_flush << extract_previous_map_as_event()
        end
      end
      
      update_aggregate_maps_metric()

      # tag flushed events, indicating "final flush" special event
      if options[:final]
        events_to_flush.each { |event_to_flush| event_to_flush.tag("_aggregatefinalflush") }
      end

      # update last flush timestamp
      @current_pipeline.last_flush_timestamp_map[@task_id] = Time.now

      # return events to flush into Logstash pipeline
      return events_to_flush
    else
      return []
    end
  end
  
  # init flush/timeout properties for current pipeline
  def init_pipeline_timeout_management()
    
    # Define default timeout (if not defined by user)
    if @current_pipeline.default_timeout.nil?
      @current_pipeline.default_timeout = DEFAULT_TIMEOUT
    end
    
    # Define default flush instance that manages timeout (if not defined by user)
    if !@current_pipeline.flush_instance_map.has_key?(@task_id)
      @current_pipeline.flush_instance_map[@task_id] = self
    end

    # Define timeout and inactivity_timeout (if not defined by user)
    if @current_pipeline.flush_instance_map[@task_id] == self
      if @timeout.nil?
        @timeout = @current_pipeline.default_timeout
        @logger.debug("Aggregate timeout for '#{@task_id}' pattern: #{@timeout} seconds")
      end
      if @inactivity_timeout.nil?
        @inactivity_timeout = @timeout
      end
    end

  end

  # Remove the expired Aggregate maps from @current_pipeline.aggregate_maps if they are older than timeout or if no new event has been received since inactivity_timeout.
  # If @push_previous_map_as_event option is set, or @push_map_as_event_on_timeout is set, expired maps are returned as new events to be flushed to Logstash pipeline.
  def remove_expired_maps()
    events_to_flush = []
    default_min_timestamp = Time.now - @timeout
    default_min_inactivity_timestamp = Time.now - @inactivity_timeout

    @current_pipeline.mutex.synchronize do

      @logger.debug("Aggregate remove_expired_maps call with '#{@task_id}' pattern and #{@current_pipeline.aggregate_maps[@task_id].length} maps")

      @current_pipeline.aggregate_maps[@task_id].delete_if do |key, element|
        min_timestamp = element.timeout ? Time.now - element.timeout : default_min_timestamp
        min_inactivity_timestamp = element.inactivity_timeout ? Time.now - element.inactivity_timeout : default_min_inactivity_timestamp
        if element.creation_timestamp + element.difference_from_creation_to_now < min_timestamp || element.lastevent_timestamp + element.difference_from_lastevent_to_now < min_inactivity_timestamp
          if @push_previous_map_as_event || @push_map_as_event_on_timeout
            events_to_flush << create_timeout_event(element.map, key)
          end
          @logger.debug("Aggregate remove expired map with task_id=#{key}")
          metric.increment(:task_timeouts)
          next true
        end
        next false
      end
    end
    
    # disable check_expired_maps_on_every_flush if there is not anymore maps
    if @current_pipeline.aggregate_maps[@task_id].length == 0 && @check_expired_maps_on_every_flush
      @check_expired_maps_on_every_flush = nil
    end

    return events_to_flush
  end

  # Remove the expired Aggregate map associated to task_id if it is older than timeout or if no new event has been received since inactivity_timeout (relative to current event timestamp).
  # If @push_previous_map_as_event option is set, or @push_map_as_event_on_timeout is set, expired map is returned as new event to be flushed to Logstash pipeline.
  def remove_expired_map_based_on_event_timestamp(task_id, event)

    @logger.debug("Aggregate remove_expired_map_based_on_event_timestamp call with task_id : '#{@task_id}'")

    # get aggregate map element
    element = @current_pipeline.aggregate_maps[@task_id][task_id]
    return nil if element.nil?

    init_pipeline_timeout_management()

    event_to_flush = nil
    event_timestamp = reference_timestamp(event)
    min_timestamp = element.timeout ? event_timestamp - element.timeout : event_timestamp - @timeout
    min_inactivity_timestamp = element.inactivity_timeout ? event_timestamp - element.inactivity_timeout : event_timestamp - @inactivity_timeout

    if element.creation_timestamp < min_timestamp || element.lastevent_timestamp < min_inactivity_timestamp
      if @push_previous_map_as_event || @push_map_as_event_on_timeout
        event_to_flush = create_timeout_event(element.map, task_id)
      end
      @current_pipeline.aggregate_maps[@task_id].delete(task_id)
      @logger.debug("Aggregate remove expired map with task_id=#{task_id}")
      metric.increment(:task_timeouts)
    end

    return event_to_flush
  end

  # return if this filter instance has any timeout option enabled in logstash configuration
  def has_timeout_options?()
    return (
      timeout ||
      inactivity_timeout ||
      timeout_code ||
      push_map_as_event_on_timeout ||
      push_previous_map_as_event ||
      timeout_timestamp_field ||
      timeout_task_id_field ||
      !timeout_tags.empty?
    )
  end

  # display all possible timeout options
  def display_timeout_options()
    return [
      "timeout",
      "inactivity_timeout",
      "timeout_code",
      "push_map_as_event_on_timeout",
      "push_previous_map_as_event",
      "timeout_timestamp_field",
      "timeout_task_id_field",
      "timeout_tags"
    ].join(", ")
  end

  # return current pipeline id
  def pipeline_id()
    if @execution_context
      return @execution_context.pipeline_id
    else
      return "main"
    end
  end

  # compute and return "reference" timestamp to compute timeout :
  # by default "system current time" or event timestamp if timeout_timestamp_field option is defined
  def reference_timestamp(event)
    return (@timeout_timestamp_field) ? event.get(@timeout_timestamp_field).time : Time.now
  end

  # update "aggregate_maps" metric, with aggregate maps count associated to configured taskid pattern 
  def update_aggregate_maps_metric()
    aggregate_maps = @current_pipeline.aggregate_maps[@task_id]
    if aggregate_maps
      metric.gauge(:aggregate_maps, aggregate_maps.length)
    end
  end

end # class LogStash::Filters::Aggregate

# Element of "aggregate_maps"
class LogStash::Filters::Aggregate::Element

  attr_accessor :creation_timestamp, :lastevent_timestamp, :difference_from_creation_to_now, :difference_from_lastevent_to_now, :timeout, :inactivity_timeout, :task_id, :map

  def initialize(creation_timestamp, task_id)
    @creation_timestamp = creation_timestamp
    @lastevent_timestamp = creation_timestamp    
    @difference_from_creation_to_now = (Time.now - creation_timestamp).to_i
    @difference_from_lastevent_to_now = @difference_from_creation_to_now
    @timeout = nil
    @inactivity_timeout = nil
    @task_id = task_id
    @map = {}
  end
end

# shared aggregate attributes for each pipeline
class LogStash::Filters::Aggregate::Pipeline

  attr_accessor :aggregate_maps, :mutex, :default_timeout, :flush_instance_map, :last_flush_timestamp_map, :aggregate_maps_path_set, :pipeline_close_instance

  def initialize()
    # Stores all aggregate maps, per task_id pattern, then per task_id value
    @aggregate_maps = {}

    # Mutex used to synchronize access to 'aggregate_maps'
    @mutex = Mutex.new

    # Default timeout for task_id patterns where timeout is not defined in Logstash filter configuration
    @default_timeout = nil

    # For each "task_id" pattern, defines which Aggregate instance will process flush() call, processing expired Aggregate elements (older than timeout)
    # For each entry, key is "task_id pattern" and value is "aggregate instance"
    @flush_instance_map = {}

    # last time where timeout management in flush() method was launched, per "task_id" pattern
    @last_flush_timestamp_map = {}

    # flag indicating if aggregate_maps_path option has been already set on one aggregate instance
    @aggregate_maps_path_set = false

    # defines which Aggregate instance will close Aggregate variables associated to current pipeline
    @pipeline_close_instance = nil
  end
end
