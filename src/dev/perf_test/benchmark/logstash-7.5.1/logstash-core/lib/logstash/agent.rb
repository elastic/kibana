# encoding: utf-8
require "logstash/environment"
require "logstash/config/cpu_core_strategy"
require "logstash/instrument/collector"
require "logstash/instrument/periodic_pollers"
require "logstash/pipeline"
require "logstash/webserver"
require "logstash/config/source_loader"
require "logstash/pipeline_action"
require "logstash/state_resolver"
require "logstash/pipelines_registry"
require "stud/trap"
require "uri"
require "socket"
require "securerandom"

LogStash::Environment.load_locale!

class LogStash::Agent
  include LogStash::Util::Loggable
  STARTED_AT = Time.now.freeze

  attr_reader :metric, :name, :settings, :dispatcher, :ephemeral_id, :pipeline_bus
  attr_accessor :logger

  # initialize method for LogStash::Agent
  # @param params [Hash] potential parameters are:
  #   :name [String] - identifier for the agent
  #   :auto_reload [Boolean] - enable reloading of pipelines
  #   :reload_interval [Integer] - reload pipelines every X seconds
  def initialize(settings = LogStash::SETTINGS, source_loader = nil)
    @logger = self.class.logger
    @settings = settings
    @auto_reload = setting("config.reload.automatic")
    @ephemeral_id = SecureRandom.uuid

    # Mutex to synchonize in the exclusive method
    # Initial usage for the Ruby pipeline initialization which is not thread safe
    @webserver_control_lock = Mutex.new

    @convergence_lock = Mutex.new

    # Special bus object for inter-pipelines communications. Used by the `pipeline` input/output
    @pipeline_bus = org.logstash.plugins.pipeline.PipelineBus.new

    @pipelines_registry = LogStash::PipelinesRegistry.new

    @name = setting("node.name")
    @http_host = setting("http.host")
    @http_port = setting("http.port")
    @http_environment = setting("http.environment")
    # Generate / load the persistent uuid
    id

    # Set the global FieldReference parsing mode
    if @settings.set?('config.field_reference.parser')
      # TODO: i18n
      logger.warn("deprecated setting `config.field_reference.parser` set; field reference parsing is strict by default")
    end

    # This is for backward compatibility in the tests
    if source_loader.nil?
      @source_loader = LogStash::Config::SourceLoader.new
      @source_loader.add_source(LogStash::Config::Source::Local.new(@settings))
    else
      @source_loader = source_loader
    end

    # Normalize time interval to seconds
    @reload_interval = setting("config.reload.interval") / 1_000_000_000.0

    @collect_metric = setting("metric.collect")

    # Create the collectors and configured it with the library
    configure_metrics_collectors

    @state_resolver = LogStash::StateResolver.new(metric)

    @pipeline_reload_metric = metric.namespace([:stats, :pipelines])
    @instance_reload_metric = metric.namespace([:stats, :reloads])
    initialize_agent_metrics

    @dispatcher = LogStash::EventDispatcher.new(self)
    LogStash::PLUGIN_REGISTRY.hooks.register_emitter(self.class, dispatcher)
    dispatcher.fire(:after_initialize)

    @running = Concurrent::AtomicBoolean.new(false)
  end

  def execute
    @thread = Thread.current # this var is implicitly used by Stud.stop?
    LogStash::Util.set_thread_name("Agent thread")
    logger.debug("Starting agent")

    transition_to_running

    converge_state_and_update

    start_webserver

    if auto_reload?
      # `sleep_then_run` instead of firing the interval right away
      Stud.interval(@reload_interval, :sleep_then_run => true) do
        # TODO(ph) OK, in reality, we should get out of the loop, but I am
        # worried about the implication of that change so instead when we are stopped
        # we don't converge.
        #
        # Logstash currently expect to be block here, the signal will force a kill on the agent making
        # the agent thread unblock
        #
        # Actually what we really need is one more state:
        #
        # init => running => stopping => stopped
        converge_state_and_update unless stopped?
      end
    else
      # exit with error status if the initial converge_state_and_update did not create any pipeline
      return 1 if @pipelines_registry.empty?

      while !Stud.stop?
        # exit if all pipelines are terminated and none are reloading
        break if no_pipeline?

        # exit if there are no user defined pipelines (not system pipeline) and none are reloading
        break if !running_user_defined_pipelines?

        sleep(0.5)
      end
    end

    return 0
  ensure
    transition_to_stopped
  end

  def auto_reload?
    @auto_reload
  end

  def running?
    @running.true?
  end

  def stopped?
    @running.false?
  end

  def converge_state_and_update
    results = @source_loader.fetch

    unless results.success?
      if auto_reload?
        logger.debug("Could not fetch the configuration to converge, will retry", :message => results.error, :retrying_in => @reload_interval)
        return
      else
        raise "Could not fetch the configuration, message: #{results.error}"
      end
    end

    converge_result = resolve_actions_and_converge_state(results.response)
    update_metrics(converge_result)

    logger.info(
        "Pipelines running",
        :count => running_pipelines.size,
        :running_pipelines => running_pipelines.keys,
        :non_running_pipelines => non_running_pipelines.keys
    ) if converge_result.success? && converge_result.total > 0

    dispatch_events(converge_result)

    converge_result
  rescue => e
    logger.error("An exception happened when converging configuration", :exception => e.class, :message => e.message, :backtrace => e.backtrace)
  end

  # Calculate the Logstash uptime in milliseconds
  #
  # @return [Integer] Uptime in milliseconds
  def uptime
    ((Time.now.to_f - STARTED_AT.to_f) * 1000.0).to_i
  end

  def shutdown
    # Since we're shutting down we need to shutdown the DAG of pipelines that are talking to each other
    # in order of dependency.
    pipeline_bus.setBlockOnUnlisten(true)

    stop_collecting_metrics
    transition_to_stopped
    converge_result = shutdown_pipelines
    stop_webserver
    converge_result
  end

  def id
    return @id if @id

    uuid = nil
    if ::File.exists?(id_path)
      begin
        uuid = ::File.open(id_path) {|f| f.each_line.first.chomp }
      rescue => e
        logger.warn("Could not open persistent UUID file!",
                    :path => id_path,
                    :error => e.message,
                    :class => e.class.name)
      end
    end

    if !uuid
      uuid = SecureRandom.uuid
      logger.info("No persistent UUID file found. Generating new UUID",
                  :uuid => uuid,
                  :path => id_path)
      begin
        ::File.open(id_path, 'w') {|f| f.write(uuid) }
      rescue => e
        logger.warn("Could not write persistent UUID file! Will use ephemeral UUID",
                    :uuid => uuid,
                    :path => id_path,
                    :error => e.message,
                    :class => e.class.name)
      end
    end

    @id = uuid
  end

  def id_path
    @id_path ||= ::File.join(settings.get("path.data"), "uuid")
  end

  #
  # Backward compatibility proxies to the PipelineRegistry
  #

  def get_pipeline(pipeline_id)
    @pipelines_registry.get_pipeline(pipeline_id)
  end

  def pipelines_count
    @pipelines_registry.size
  end

  def running_pipelines
    @pipelines_registry.running_pipelines
   end

  def non_running_pipelines
    @pipelines_registry.non_running_pipelines
  end

  def running_pipelines?
    @pipelines_registry.running_pipelines.any?
  end

  def running_pipelines_count
    @pipelines_registry.running_pipelines.size
  end

  def running_user_defined_pipelines?
    @pipelines_registry.running_user_defined_pipelines.any?
  end

  def running_user_defined_pipelines
    @pipelines_registry.running_user_defined_pipelines
  end

  def no_pipeline?
    @pipelines_registry.running_pipelines.empty?
  end

  private

  def transition_to_stopped
    @running.make_false
  end

  def transition_to_running
    @running.make_true
  end

  # @param pipeline_configs [Array<Config::PipelineConfig>]
  # @return [ConvergeResult]
  def resolve_actions_and_converge_state(pipeline_configs)
    @convergence_lock.synchronize do
      pipeline_actions = resolve_actions(pipeline_configs)
      converge_state(pipeline_actions)
    end
  end

  # We depends on a series of task derived from the internal state and what
  # need to be run, theses actions are applied to the current pipelines to converge to
  # the desired state.
  #
  # The current actions are simple and favor composition, allowing us to experiment with different
  # way to making them and also test them in isolation with the current running agent.
  #
  # Currently only action related to pipeline exist, but nothing prevent us to use the same logic
  # for other tasks.
  #
  def converge_state(pipeline_actions)
    logger.debug("Converging pipelines state", :actions_count => pipeline_actions.size)
    fail("Illegal access to `LogStash::Agent#converge_state()` without exclusive lock at #{caller[1]}") unless @convergence_lock.owned?

    converge_result = LogStash::ConvergeResult.new(pipeline_actions.size)

    pipeline_actions.map do |action|
      Thread.new(action, converge_result) do |action, converge_result|
        LogStash::Util.set_thread_name("Converge #{action}")
        # We execute every task we need to converge the current state of pipelines
        # for every task we will record the action result, that will help us
        # the results of all the task will determine if the converge was successful or not
        #
        # The ConvergeResult#add, will accept the following values
        #  - boolean
        #  - FailedAction
        #  - SuccessfulAction
        #  - Exception
        #
        # This give us a bit more extensibility with the current startup/validation model
        # that we currently have.
        begin
          logger.debug("Executing action", :action => action)
          action_result = action.execute(self, @pipelines_registry)
          converge_result.add(action, action_result)

          unless action_result.successful?
            logger.error("Failed to execute action",
              :id => action.pipeline_id,
              :action_type => action_result.class,
              :message => action_result.message,
              :backtrace => action_result.backtrace
            )
          end
        rescue SystemExit, Exception => e
          logger.error("Failed to execute action", :action => action, :exception => e.class.name, :message => e.message, :backtrace => e.backtrace)
          converge_result.add(action, e)
        end
      end
    end.each(&:join)

    logger.trace? && logger.trace("Converge results",
      :success => converge_result.success?,
      :failed_actions => converge_result.failed_actions.collect { |a, r| "id: #{a.pipeline_id}, action_type: #{a.class}, message: #{r.message}" },
      :successful_actions => converge_result.successful_actions.collect { |a, r| "id: #{a.pipeline_id}, action_type: #{a.class}" }
    )

    converge_result
  end

  def resolve_actions(pipeline_configs)
    fail("Illegal access to `LogStash::Agent#resolve_actions()` without exclusive lock at #{caller[1]}") unless @convergence_lock.owned?
    @state_resolver.resolve(@pipelines_registry, pipeline_configs)
  end

  def dispatch_events(converge_results)
    converge_results.successful_actions.each do |action, _|
      case action
      when LogStash::PipelineAction::Create
        dispatcher.fire(:pipeline_started, get_pipeline(action.pipeline_id))
      when LogStash::PipelineAction::Reload
        dispatcher.fire(:pipeline_stopped, get_pipeline(action.pipeline_id))
      when LogStash::PipelineAction::Stop
        dispatcher.fire(:pipeline_stopped, get_pipeline(action.pipeline_id))
      end
    end
  end

  def start_webserver
    @webserver_control_lock.synchronize do
      options = {:http_host => @http_host, :http_ports => @http_port, :http_environment => @http_environment }
      @webserver = LogStash::WebServer.new(@logger, self, options)
      @webserver_thread = Thread.new(@webserver) do |webserver|
        LogStash::Util.set_thread_name("Api Webserver")
        webserver.run
      end
    end
  end

  def stop_webserver
    @webserver_control_lock.synchronize do
      if @webserver
        @webserver.stop
        if @webserver_thread.join(5).nil?
          @webserver_thread.kill
          @webserver_thread.join
        end
      end
    end
  end

  def configure_metrics_collectors
    @collector = LogStash::Instrument::Collector.new

    @metric = if collect_metrics?
      @logger.debug("Setting up metric collection")
      LogStash::Instrument::Metric.new(@collector)
    else
      LogStash::Instrument::NullMetric.new(@collector)
    end

    @periodic_pollers = LogStash::Instrument::PeriodicPollers.new(@metric, settings.get("queue.type"), self)
    @periodic_pollers.start
  end

  def stop_collecting_metrics
    @periodic_pollers.stop
  end

  def collect_metrics?
    @collect_metric
  end

  def shutdown_pipelines
    logger.debug("Shutting down all pipelines", :pipelines_count => running_pipelines_count)

    # In this context I could just call shutdown, but I've decided to
    # use the stop action implementation for that so we have the same code.
    # This also give us some context into why a shutdown is failing
    resolve_actions_and_converge_state([]) # We stop all the pipeline, so we converge to a empty state
  end


  def setting(key)
    @settings.get(key)
  end

  # Methods related to the creation of all metrics
  # related to states changes and failures
  #
  # I think we could use an observer here to decouple the metrics, but moving the code
  # into separate function is the first step we take.
  def update_metrics(converge_result)
    converge_result.failed_actions.each do |action, action_result|
      update_failures_metrics(action, action_result)
    end

    converge_result.successful_actions.each do |action, action_result|
      update_success_metrics(action, action_result)
    end
  end

  def update_success_metrics(action, action_result)
    case action
      when LogStash::PipelineAction::Create
        # When a pipeline is successfully created we create the metric
        # place holder related to the lifecycle of the pipeline
        initialize_pipeline_metrics(action)
      when LogStash::PipelineAction::Reload
        update_successful_reload_metrics(action, action_result)
    end
  end

  def update_failures_metrics(action, action_result)
    if action.is_a?(LogStash::PipelineAction::Create)
      # force to create the metric fields
      initialize_pipeline_metrics(action)
    end

    @instance_reload_metric.increment(:failures)

    @pipeline_reload_metric.namespace([action.pipeline_id, :reloads]).tap do |n|
      n.increment(:failures)
      n.gauge(:last_error, { :message => action_result.message, :backtrace => action_result.backtrace})
      n.gauge(:last_failure_timestamp, LogStash::Timestamp.now)
    end
  end

  def initialize_agent_metrics
    @instance_reload_metric.increment(:successes, 0)
    @instance_reload_metric.increment(:failures, 0)
  end

  def initialize_pipeline_metrics(action)
    @pipeline_reload_metric.namespace([action.pipeline_id, :reloads]).tap do |n|
      n.increment(:successes, 0)
      n.increment(:failures, 0)
      n.gauge(:last_error, nil)
      n.gauge(:last_success_timestamp, nil)
      n.gauge(:last_failure_timestamp, nil)
    end
  end

  def update_successful_reload_metrics(action, action_result)
    @instance_reload_metric.increment(:successes)

    @pipeline_reload_metric.namespace([action.pipeline_id, :reloads]).tap do |n|
      n.increment(:successes)
      n.gauge(:last_success_timestamp, action_result.executed_at)
    end
  end
end # class LogStash::Agent
