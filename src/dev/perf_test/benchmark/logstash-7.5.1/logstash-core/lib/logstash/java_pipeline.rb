# encoding: utf-8
require "thread"
require "concurrent"
require "logstash/filters/base"
require "logstash/inputs/base"
require "logstash/outputs/base"
require "logstash/instrument/collector"
require "logstash/compiler"
require "logstash/config/lir_serializer"

module LogStash; class JavaPipeline < JavaBasePipeline
  include LogStash::Util::Loggable

  java_import org.apache.logging.log4j.ThreadContext

  attr_reader \
    :worker_threads,
    :events_consumed,
    :events_filtered,
    :started_at,
    :thread

  MAX_INFLIGHT_WARN_THRESHOLD = 10_000

  def initialize(pipeline_config, namespaced_metric = nil, agent = nil)
    @logger = self.logger
    super pipeline_config, namespaced_metric, @logger, agent
    open_queue

    @worker_threads = []

    @drain_queue =  settings.get_value("queue.drain") || settings.get("queue.type") == "memory"

    @events_filtered = java.util.concurrent.atomic.LongAdder.new
    @events_consumed = java.util.concurrent.atomic.LongAdder.new

    @input_threads = []
    # @ready requires thread safety since it is typically polled from outside the pipeline thread
    @ready = Concurrent::AtomicBoolean.new(false)
    @running = Concurrent::AtomicBoolean.new(false)
    @flushing = java.util.concurrent.atomic.AtomicBoolean.new(false)
    @flushRequested = java.util.concurrent.atomic.AtomicBoolean.new(false)
    @shutdownRequested = java.util.concurrent.atomic.AtomicBoolean.new(false)
    @outputs_registered = Concurrent::AtomicBoolean.new(false)

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
    safe_filters, unsafe_filters = filters.partition(&:threadsafe?)
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
    filters.any?
  end

  def start
    # Since we start lets assume that the metric namespace is cleared
    # this is useful in the context of pipeline reloading
    collect_stats
    collect_dlq_stats

    @logger.debug("Starting pipeline", default_logging_keys)

    @finished_execution.make_false
    @finished_run.make_false

    @thread = Thread.new do
      begin
        LogStash::Util.set_thread_name("pipeline.#{pipeline_id}")
        ThreadContext.put("pipeline.id", pipeline_id)
        run
        @finished_run.make_true
      rescue => e
        close
        pipeline_log_params = default_logging_keys(
          :exception => e,
          :backtrace => e.backtrace,
          "pipeline.sources" => pipeline_source_details)
        logger.error("Pipeline aborted due to error", pipeline_log_params)
      ensure
        @finished_execution.make_true
      end
    end

    status = wait_until_started

    if status
      logger.debug("Pipeline started successfully", default_logging_keys(:pipeline_id => pipeline_id))
    end

    status
  end

  def wait_until_started
    while true do
      if @finished_run.true?
        # it completed run without exception
        return true
      elsif thread.nil? || !thread.alive?
        # some exception occurred and the thread is dead
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

    @logger.info("Pipeline started", "pipeline.id" => pipeline_id)

    # Block until all inputs have stopped
    # Generally this happens if SIGINT is sent and `shutdown` is called from an external thread

    transition_to_running
    start_flusher # Launches a non-blocking thread for flush events
    wait_inputs
    transition_to_stopped

    @logger.debug("Input plugins stopped! Will shutdown filter/output workers.", default_logging_keys)

    shutdown_flusher
    shutdown_workers

    close

    @logger.debug("Pipeline has been shutdown", default_logging_keys)

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

  # register_plugins calls #register_plugin on the plugins list and upon exception will call Plugin#do_close on all registered plugins
  # @param plugins [Array[Plugin]] the list of plugins to register
  def register_plugins(plugins)
    registered = []
    plugins.each do |plugin|
      plugin.register
      registered << plugin
    end
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
      config_metric.gauge(:ephemeral_id, ephemeral_id)
      config_metric.gauge(:hash, lir.unique_hash)
      config_metric.gauge(:graph, ::LogStash::Config::LIRSerializer.serialize(lir))
      config_metric.gauge(:cluster_uuids, resolve_cluster_uuids)

      pipeline_log_params = default_logging_keys(
        "pipeline.workers" => pipeline_workers,
        "pipeline.batch.size" => batch_size,
        "pipeline.batch.delay" => batch_delay,
        "pipeline.max_inflight" => max_inflight,
        "pipeline.sources" => pipeline_source_details)
      @logger.info("Starting pipeline", pipeline_log_params)

      if max_inflight > MAX_INFLIGHT_WARN_THRESHOLD
        @logger.warn("CAUTION: Recommended inflight events max exceeded! Logstash will run with up to #{max_inflight} events in memory in your current configuration. If your message sizes are large this may cause instability with the default heap size. Please consider setting a non-standard heap size, changing the batch size (currently #{batch_size}), or changing the number of pipeline workers (currently #{pipeline_workers})", default_logging_keys)
      end

      filter_queue_client.set_batch_dimensions(batch_size, batch_delay)

      pipeline_workers.times do |t|
        thread = Thread.new do
          Util.set_thread_name("[#{pipeline_id}]>worker#{t}")
          ThreadContext.put("pipeline.id", pipeline_id)
          org.logstash.execution.WorkerLoop.new(
              lir_execution, filter_queue_client, @events_filtered, @events_consumed,
              @flushRequested, @flushing, @shutdownRequested, @drain_queue).run
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

  def resolve_cluster_uuids
    outputs.each_with_object(Set.new) do |output, cluster_uuids|
      if LogStash::PluginMetadata.exists?(output.id)
        cluster_uuids << LogStash::PluginMetadata.for_plugin(output.id).get(:cluster_uuid)
      end
    end.to_a.compact
  end

  def wait_inputs
    @input_threads.each do |thread|
      if thread.class == Java::JavaObject
        thread.to_java.join
      else
        thread.join
      end
    end
  end

  def start_inputs
    moreinputs = []
    inputs.each do |input|
      if input.threadable && input.threads > 1
        (input.threads - 1).times do |i|
          moreinputs << input.clone
        end
      end
    end
    moreinputs.each {|i| inputs << i}

    # first make sure we can register all input plugins
    register_plugins(inputs)

    # then after all input plugins are successfully registered, start them
    inputs.each { |input| start_input(input) }
  end

  def start_input(plugin)
    if plugin.class == LogStash::JavaInputDelegator
      @input_threads << plugin.start
    else
      @input_threads << Thread.new { inputworker(plugin) }
    end
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
    @logger.info("Pipeline terminated", "pipeline.id" => pipeline_id)
  end # def shutdown

  def wait_for_workers
    @logger.debug("Closing inputs", default_logging_keys)
    @worker_threads.map(&:join)
    @logger.debug("Worker closed", default_logging_keys)
  end

  def stop_inputs
    @logger.debug("Closing inputs", default_logging_keys)
    inputs.each(&:do_stop)
    @logger.debug("Closed inputs", default_logging_keys)
  end

  # After `shutdown` is called from an external thread this is called from the main thread to
  # tell the worker threads to stop and then block until they've fully stopped
  # This also stops all filter and output plugins
  def shutdown_workers
    @shutdownRequested.set(true)

    @worker_threads.each do |t|
      @logger.debug("Shutdown waiting for worker thread" , default_logging_keys(:thread => t.inspect))
      t.join
    end

    filters.each(&:do_close)
    outputs.each(&:do_close)
  end

  # for backward compatibility in devutils for the rspec helpers, this method is not used
  # anymore and just here to not break TestPipeline that inherits this class.
  def filter(event, &block)
  end

  # for backward compatibility in devutils for the rspec helpers, this method is not used
  # anymore and just here to not break TestPipeline that inherits this class.
  def flush_filters(options = {}, &block)
  end

  def start_flusher
    # Invariant to help detect improper initialization
    raise "Attempted to start flusher on a stopped pipeline!" if stopped?
    @flusher_thread = org.logstash.execution.PeriodicFlush.new(@flushRequested, @flushing)
    @flusher_thread.start
  end

  def shutdown_flusher
    @flusher_thread.close
  end

  # Calculate the uptime in milliseconds
  #
  # @return [Fixnum] Uptime in milliseconds, 0 if the pipeline is not started
  def uptime
    return 0 if started_at.nil?
    ((Time.now.to_f - started_at.to_f) * 1000.0).to_i
  end

  def plugin_threads_info
    input_threads = @input_threads.select {|t| t.class == Thread && t.alive? }
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
      register_plugins(outputs)
      register_plugins(filters)
    end
  end

  def default_logging_keys(other_keys = {})
    keys = {:pipeline_id => pipeline_id}.merge other_keys
    keys[:thread] ||= thread.inspect if thread
    keys
  end
end; end
