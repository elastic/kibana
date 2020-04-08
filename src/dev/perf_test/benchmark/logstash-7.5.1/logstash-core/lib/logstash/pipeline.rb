# encoding: utf-8
require "thread"
require "stud/interval"
require "concurrent"
require "logstash-core/logstash-core"
require "logstash/event"
require "logstash/config/file"
require "logstash/filters/base"
require "logstash/inputs/base"
require "logstash/outputs/base"
require "logstash/instrument/collector"
require "logstash/filter_delegator"
require "logstash/compiler"

module LogStash; class BasePipeline < AbstractPipeline
  include LogStash::Util::Loggable

  java_import org.apache.logging.log4j.ThreadContext

  attr_reader :inputs, :filters, :outputs

  def initialize(pipeline_config, namespaced_metric = nil, agent = nil)
    @logger = self.logger
    super pipeline_config, namespaced_metric, @logger

    @inputs = nil
    @filters = nil
    @outputs = nil
    @agent = agent

    @plugin_factory = LogStash::Plugins::PluginFactory.new(
      # use NullMetric if called in the BasePipeline context otherwise use the @metric value
      lir, LogStash::Plugins::PluginMetricFactory.new(pipeline_id, metric),
      LogStash::Plugins::ExecutionContextFactory.new(@agent, self, dlq_writer),
      FilterDelegator
    )
    grammar = LogStashConfigParser.new
    parsed_config = grammar.parse(config_str)
    raise(ConfigurationError, grammar.failure_reason) if parsed_config.nil?

    parsed_config.process_escape_sequences = settings.get_value("config.support_escapes")
    config_code = parsed_config.compile

    if settings.get_value("config.debug")
      @logger.debug("Compiled pipeline code", default_logging_keys(:code => config_code))
    end

    # Evaluate the config compiled code that will initialize all the plugins and define the
    # filter and output methods.
    begin
      eval(config_code)
    rescue => e
      raise e
    end
  end

  def reloadable?
    configured_as_reloadable? && reloadable_plugins?
  end

  def reloadable_plugins?
    non_reloadable_plugins.empty?
  end

  def non_reloadable_plugins
    (inputs + filters + outputs).select { |plugin| !plugin.reloadable? }
  end

  private


  def plugin(plugin_type, name, line, column, *args)
    @plugin_factory.plugin(plugin_type, name, line, column, *args)
  end

  def default_logging_keys(other_keys = {})
    { :pipeline_id => pipeline_id }.merge(other_keys)
  end
end; end

module LogStash; class Pipeline < BasePipeline
  attr_reader \
    :worker_threads,
    :events_consumed,
    :events_filtered,
    :started_at,
    :thread

  MAX_INFLIGHT_WARN_THRESHOLD = 10_000

  def initialize(pipeline_config, namespaced_metric = nil, agent = nil)
    super
    open_queue

    @worker_threads = []

    @signal_queue = java.util.concurrent.LinkedBlockingQueue.new

    @drain_queue =  settings.get_value("queue.drain") || settings.get("queue.type") == "memory"


    @events_filtered = java.util.concurrent.atomic.LongAdder.new
    @events_consumed = java.util.concurrent.atomic.LongAdder.new

    @input_threads = []
    # @ready requires thread safety since it is typically polled from outside the pipeline thread
    @ready = Concurrent::AtomicBoolean.new(false)
    @running = Concurrent::AtomicBoolean.new(false)
    @flushing = Concurrent::AtomicReference.new(false)
    @outputs_registered = Concurrent::AtomicBoolean.new(false)
    @worker_shutdown = java.util.concurrent.atomic.AtomicBoolean.new(false)

    # @finished_execution signals that the pipeline thread has finished its execution
    # regardless of any exceptions; it will always be true when the thread completes
    @finished_execution = Concurrent::AtomicBoolean.new(false)

    # @finished_run signals that the run methods called in the pipeline thread was completed
    # without errors and it will NOT be set if the run method exits from an exception; this
    # is by design and necessary for the wait_until_started semantic
    @finished_run = Concurrent::AtomicBoolean.new(false)

    @thread = nil
  end # def initialize

  def finished_execution?
    @finished_execution.true?
  end

  def ready?
    @ready.value
  end

  def safe_pipeline_worker_count
    default = settings.get_default("pipeline.workers")
    pipeline_workers = settings.get("pipeline.workers") #override from args "-w 8" or config
    safe_filters, unsafe_filters = @filters.partition(&:threadsafe?)
    plugins = unsafe_filters.collect { |f| f.config_name }

    return pipeline_workers if unsafe_filters.empty?

    if settings.set?("pipeline.workers")
      if pipeline_workers > 1
        @logger.warn("Warning: Manual override - there are filters that might not work with multiple worker threads", default_logging_keys(:worker_threads => pipeline_workers, :filters => plugins))
      end
    else
      # user did not specify a worker thread count
      # warn if the default is multiple
      if default > 1
        @logger.warn("Defaulting pipeline worker threads to 1 because there are some filters that might not work with multiple worker threads",
                     default_logging_keys(:count_was => default, :filters => plugins))
        return 1 # can't allow the default value to propagate if there are unsafe filters
      end
    end
    pipeline_workers
  end

  def filters?
    return @filters.any?
  end

  def start
    # Since we start lets assume that the metric namespace is cleared
    # this is useful in the context of pipeline reloading
    collect_stats
    collect_dlq_stats

    pipeline_log_params = default_logging_keys(
        "pipeline.workers" => settings.get("pipeline.workers"),
        "pipeline.batch.size" => settings.get("pipeline.batch.size"),
        "pipeline.batch.delay" => settings.get("pipeline.batch.delay"),
        "pipeline.sources" => pipeline_source_details)
    @logger.info("Starting pipeline", pipeline_log_params)

    @finished_execution.make_false
    @finished_run.make_false

    @thread = Thread.new do
      begin
        LogStash::Util.set_thread_name("[#{pipeline_id}]-manager")
        ThreadContext.put("pipeline.id", pipeline_id)
        run
        @finished_run.make_true
      rescue => e
        close
        pipeline_log_params = default_logging_keys(
          :exception => e,
          :backtrace => e.backtrace,
          "pipeline.sources" => pipeline_source_details)
        @logger.error("Pipeline aborted due to error", pipeline_log_params)
      ensure
        @finished_execution.make_true
      end
    end

    status = wait_until_started

    if status
      @logger.info("Pipeline started successfully", default_logging_keys)
    end

    status
  end

  def wait_until_started
    while true do
      if @finished_run.true?
        # it completed run without exception
        return true
      elsif thread.nil? || !thread.alive?
        # some exception occured and the thread is dead
        return false
      elsif running?
        # fully initialized and running
        return true
      else
        sleep 0.01
      end
    end
  end

  def run
    @started_at = Time.now
    @thread = Thread.current
    Util.set_thread_name("[#{pipeline_id}]-pipeline-manager")

    start_workers

    # Block until all inputs have stopped
    # Generally this happens if SIGINT is sent and `shutdown` is called from an external thread

    transition_to_running
    start_flusher # Launches a non-blocking thread for flush events
    wait_inputs
    transition_to_stopped

    shutdown_flusher
    @logger.debug("Shutting down filter/output workers", default_logging_keys)
    shutdown_workers

    close

    @logger.info("Pipeline has terminated", default_logging_keys)

    # exit code
    return 0
  end # def run

  def transition_to_running
    @running.make_true
  end

  def transition_to_stopped
    @running.make_false
  end

  def running?
    @running.true?
  end

  def stopped?
    @running.false?
  end

  # register_plugin simply calls the plugin #register method and catches & logs any error
  # @param plugin [Plugin] the plugin to register
  # @return [Plugin] the registered plugin
  def register_plugin(plugin)
    plugin.register
    plugin
  rescue => e
    @logger.error("Error registering plugin", default_logging_keys(:plugin => plugin.inspect, :error => e.message))
    raise e
  end

  # register_plugins calls #register_plugin on the plugins list and upon exception will call Plugin#do_close on all registered plugins
  # @param plugins [Array[Plugin]] the list of plugins to register
  def register_plugins(plugins)
    registered = []
    plugins.each { |plugin| registered << register_plugin(plugin) }
  rescue => e
    registered.each(&:do_close)
    raise e
  end

  def start_workers
    @worker_threads.clear # In case we're restarting the pipeline
    @outputs_registered.make_false
    begin
      maybe_setup_out_plugins

      pipeline_workers = safe_pipeline_worker_count
      batch_size = settings.get("pipeline.batch.size")
      batch_delay = settings.get("pipeline.batch.delay")

      max_inflight = batch_size * pipeline_workers

      config_metric = metric.namespace([:stats, :pipelines, pipeline_id.to_s.to_sym, :config])
      config_metric.gauge(:workers, pipeline_workers)
      config_metric.gauge(:batch_size, batch_size)
      config_metric.gauge(:batch_delay, batch_delay)
      config_metric.gauge(:config_reload_automatic, settings.get("config.reload.automatic"))
      config_metric.gauge(:config_reload_interval, settings.get("config.reload.interval"))
      config_metric.gauge(:dead_letter_queue_enabled, dlq_enabled?)
      config_metric.gauge(:dead_letter_queue_path, dlq_writer.get_path.to_absolute_path.to_s) if dlq_enabled?

      if max_inflight > MAX_INFLIGHT_WARN_THRESHOLD
        @logger.warn("CAUTION: Recommended inflight events max exceeded! Logstash will run with up to #{max_inflight} events in memory in your current configuration. If your message sizes are large this may cause instability with the default heap size. Please consider setting a non-standard heap size, changing the batch size (currently #{batch_size}), or changing the number of pipeline workers (currently #{pipeline_workers})", default_logging_keys)
      end

      pipeline_workers.times do |t|
        thread = Thread.new(batch_size, batch_delay, self) do |_b_size, _b_delay, _pipeline|
          LogStash::Util::set_thread_name("[#{pipeline_id}]>worker#{t}")
          ThreadContext.put("pipeline.id", pipeline_id)
          _pipeline.worker_loop(_b_size, _b_delay)
        end
        @worker_threads << thread
      end

      # inputs should be started last, after all workers
      begin
        start_inputs
      rescue => e
        # if there is any exception in starting inputs, make sure we shutdown workers.
        # exception will already by logged in start_inputs
        shutdown_workers
        raise e
      end
    ensure
      # it is important to guarantee @ready to be true after the startup sequence has been completed
      # to potentially unblock the shutdown method which may be waiting on @ready to proceed
      @ready.make_true
    end
  end

  # Main body of what a worker thread does
  # Repeatedly takes batches off the queue, filters, then outputs them
  def worker_loop(batch_size, batch_delay)
    filter_queue_client.set_batch_dimensions(batch_size, batch_delay)
    output_events_map = Hash.new { |h, k| h[k] = [] }
    while true
      signal = @signal_queue.poll || NO_SIGNAL

      batch = filter_queue_client.read_batch.to_java # metrics are started in read_batch
      batch_size = batch.filteredSize
      if batch_size > 0
        @events_consumed.add(batch_size)
        filter_batch(batch)
      end
      flush_filters_to_batch(batch, :final => false) if signal.flush?
      if batch.filteredSize > 0
        output_batch(batch, output_events_map)
        filter_queue_client.close_batch(batch)
      end
      # keep break at end of loop, after the read_batch operation, some pipeline specs rely on this "final read_batch" before shutdown.
      break if (@worker_shutdown.get && !draining_queue?)
    end

    # we are shutting down, queue is drained if it was required, now  perform a final flush.
    # for this we need to create a new empty batch to contain the final flushed events
    batch = filter_queue_client.to_java.newBatch
    filter_queue_client.start_metrics(batch) # explicitly call start_metrics since we dont do a read_batch here
    flush_filters_to_batch(batch, :final => true)
    output_batch(batch, output_events_map)
    filter_queue_client.close_batch(batch)
  end

  def filter_batch(batch)
    filter_func(batch.to_a).each do |e|
      #these are both original and generated events
      batch.merge(e) unless e.cancelled?
    end
    filter_queue_client.add_filtered_metrics(batch.filtered_size)
    @events_filtered.add(batch.filteredSize)
  rescue Exception => e
    # Plugins authors should manage their own exceptions in the plugin code
    # but if an exception is raised up to the worker thread they are considered
    # fatal and logstash will not recover from this situation.
    #
    # Users need to check their configuration or see if there is a bug in the
    # plugin.
    @logger.error("Exception in pipelineworker, the pipeline stopped processing new events, please check your filter configuration and restart Logstash.",
                  default_logging_keys("exception" => e.message, "backtrace" => e.backtrace))

    raise e
  end

  # Take an array of events and send them to the correct output
  def output_batch(batch, output_events_map)
    # Build a mapping of { output_plugin => [events...]}
    batch.to_a.each do |event|
      # We ask the AST to tell us which outputs to send each event to
      # Then, we stick it in the correct bin
      output_func(event).each do |output|
        output_events_map[output].push(event)
      end
    end
    # Now that we have our output to event mapping we can just invoke each output
    # once with its list of events
    output_events_map.each do |output, events|
      output.multi_receive(events)
      events.clear
    end

    filter_queue_client.add_output_metrics(batch.filtered_size)
  end

  def resolve_cluster_uuids
    outputs.each_with_object(Set.new) do |output, cluster_uuids|
      if LogStash::PluginMetadata.exists?(output.id)
        cluster_uuids << LogStash::PluginMetadata.for_plugin(output.id).get(:cluster_uuid)
      end
    end.to_a.compact
  end

  def wait_inputs
    @input_threads.each(&:join)
  end

  def start_inputs
    moreinputs = []
    @inputs.each do |input|
      if input.threadable && input.threads > 1
        (input.threads - 1).times do |i|
          moreinputs << input.clone
        end
      end
    end
    @inputs += moreinputs

    # first make sure we can register all input plugins
    register_plugins(@inputs)

    # then after all input plugins are successfully registered, start them
    @inputs.each { |input| start_input(input) }
  end

  def start_input(plugin)
    @input_threads << Thread.new { inputworker(plugin) }
  end

  def inputworker(plugin)
    Util::set_thread_name("[#{pipeline_id}]<#{plugin.class.config_name}")
    ThreadContext.put("pipeline.id", pipeline_id)
    begin
      plugin.run(wrapped_write_client(plugin.id.to_sym))
    rescue => e
      if plugin.stop?
        @logger.debug("Input plugin raised exception during shutdown, ignoring it.",
                      default_logging_keys(:plugin => plugin.class.config_name, :exception => e.message, :backtrace => e.backtrace))
        return
      end

      # otherwise, report error and restart
      @logger.error(I18n.t("logstash.pipeline.worker-error-debug",
                            default_logging_keys(
                              :plugin => plugin.inspect,
                              :error => e.message,
                              :exception => e.class,
                              :stacktrace => e.backtrace.join("\n"))))

      # Assuming the failure that caused this exception is transient,
      # let's sleep for a bit and execute #run again
      sleep(1)
      begin
        plugin.do_close
      rescue => close_exception
        @logger.debug("Input plugin raised exception while closing, ignoring",
                      default_logging_keys(:plugin => plugin.class.config_name, :exception => close_exception.message,
                                           :backtrace => close_exception.backtrace))
      end
      retry
    end
  end # def inputworker

  # initiate the pipeline shutdown sequence
  # this method is intended to be called from outside the pipeline thread
  # @param before_stop [Proc] code block called before performing stop operation on input plugins
  def shutdown(&before_stop)
    # shutdown can only start once the pipeline has completed its startup.
    # avoid potential race condition between the startup sequence and this
    # shutdown method which can be called from another thread at any time
    sleep(0.1) while !ready?

    # TODO: should we also check against calling shutdown multiple times concurrently?

    before_stop.call if block_given?

    stop_inputs

    # We make this call blocking, so we know for sure when the method return the shutdown is
    # stopped
    wait_for_workers
    clear_pipeline_metrics
  end # def shutdown

  def wait_for_workers
    @worker_threads.each do |t|
      t.join
      @logger.debug("Worker terminated", default_logging_keys(:thread => t.inspect))
    end
  end

  def stop_inputs
    @logger.debug("Stopping inputs", default_logging_keys)
    @inputs.each(&:do_stop)
    @logger.debug("Stopped inputs", default_logging_keys)
  end

  # After `shutdown` is called from an external thread this is called from the main thread to
  # tell the worker threads to stop and then block until they've fully stopped
  # This also stops all filter and output plugins
  def shutdown_workers
    @logger.debug("Setting shutdown", default_logging_keys)
    @worker_shutdown.set(true)

    @worker_threads.each do |t|
      @logger.debug("Shutdown waiting for worker thread" , default_logging_keys(:thread => t.inspect))
      t.join
    end

    @filters.each(&:do_close)
    @outputs.each(&:do_close)
  end

  # for backward compatibility in devutils for the rspec helpers, this method is not used
  # in the pipeline anymore.
  def filter(event, &block)
    maybe_setup_out_plugins
    # filter_func returns all filtered events, including cancelled ones
    filter_func([event]).each {|e| block.call(e)}
  end

  # perform filters flush and yield flushed event to the passed block
  # @param options [Hash]
  # @option options [Boolean] :final => true to signal a final shutdown flush
  def flush_filters(options = {}, &block)
    flushers = options[:final] ? @shutdown_flushers : @periodic_flushers

    flushers.each do |flusher|
      flusher.call(options, &block)
    end
  end

  def start_flusher
    # Invariant to help detect improper initialization
    raise "Attempted to start flusher on a stopped pipeline!" if stopped?

    @flusher_thread = Thread.new do
      LogStash::Util.set_thread_name("[#{pipeline_id}]-flusher-thread")
      ThreadContext.put("pipeline.id", pipeline_id)
      while Stud.stoppable_sleep(5, 0.1) { stopped? }
        flush
        break if stopped?
      end
    end
  end

  def shutdown_flusher
    @flusher_thread.join
  end

  def flush
    if @flushing.compare_and_set(false, true)
      @logger.debug? && @logger.debug("Pushing flush onto pipeline", default_logging_keys)
      @signal_queue.put(FLUSH)
    end
  end

  # Calculate the uptime in milliseconds
  #
  # @return [Integer] Uptime in milliseconds, 0 if the pipeline is not started
  def uptime
    return 0 if started_at.nil?
    ((Time.now.to_f - started_at.to_f) * 1000.0).to_i
  end

  # perform filters flush into the output queue
  #
  # @param batch [ReadClient::ReadBatch]
  # @param options [Hash]
  def flush_filters_to_batch(batch, options = {})
    flush_filters(options) do |event|
      unless event.cancelled?
        @logger.debug? and @logger.debug("Pushing flushed events", default_logging_keys(:event => event))
        batch.merge(event)
      end
    end

    @flushing.set(false)
  end # flush_filters_to_batch

  def plugin_threads_info
    input_threads = @input_threads.select {|t| t.alive? }
    worker_threads = @worker_threads.select {|t| t.alive? }
    (input_threads + worker_threads).map {|t| Util.thread_info(t) }
  end

  def stalling_threads_info
    plugin_threads_info
      .reject {|t| t["blocked_on"] } # known benign blocking statuses
      .each {|t| t.delete("backtrace") }
      .each {|t| t.delete("blocked_on") }
      .each {|t| t.delete("status") }
  end

  def clear_pipeline_metrics
    # TODO(ph): I think the metric should also proxy that call correctly to the collector
    # this will simplify everything since the null metric would simply just do a noop
    collector = metric.collector

    unless collector.nil?
      # selectively reset metrics we don't wish to keep after reloading
      # these include metrics about the plugins and number of processed events
      # we want to keep other metrics like reload counts and error messages
      collector.clear("stats/pipelines/#{pipeline_id}/plugins")
      collector.clear("stats/pipelines/#{pipeline_id}/events")
    end
  end

  # Sometimes we log stuff that will dump the pipeline which may contain
  # sensitive information (like the raw syntax tree which can contain passwords)
  # We want to hide most of what's in here
  def inspect
    {
      :pipeline_id => pipeline_id,
      :settings => settings.inspect,
      :ready => @ready,
      :running => @running,
      :flushing => @flushing
    }
  end

  private

  def maybe_setup_out_plugins
    if @outputs_registered.make_true
      register_plugins(@outputs)
      register_plugins(@filters)
    end
  end

  def default_logging_keys(other_keys = {})
    keys = super
    keys[:thread] ||= thread.inspect if thread
    keys
  end

  def draining_queue?
    @drain_queue ? !filter_queue_client.empty? : false
  end
end; end
