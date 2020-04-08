# encoding: utf-8
require "logstash/util"
require "concurrent"

module LogStash module Instrument module PeriodicPoller
  class Base
    include LogStash::Util::Loggable

    DEFAULT_OPTIONS = {
      :polling_interval => 5,
      :polling_timeout => 120
    }

    attr_reader :metric

    public
    def initialize(metric, options = {})
      @metric = metric
      @options = DEFAULT_OPTIONS.merge(options)
      configure_task
    end

    def update(time, result, exception)
      return unless exception

      if exception.is_a?(Concurrent::TimeoutError)
        # On a busy system this can happen, we just log it as a debug
        # event instead of an error, Some of the JVM calls can take a long time or block.
        logger.debug("Timeout exception",
                :poller => self,
                :result => result,
                :polling_timeout => @options[:polling_timeout],
                :polling_interval => @options[:polling_interval],
                :exception => exception.class,
                :executed_at => time)
      else
        logger.error("Exception",
                :poller => self,
                :result => result,
                :exception => exception.class,
                :polling_timeout => @options[:polling_timeout],
                :polling_interval => @options[:polling_interval],
                :executed_at => time)
      end
    end

    def collect
      raise NotImplementedError, "#{self.class.name} need to implement `#collect`"
    end

    def start
      logger.debug("Starting",
                   :polling_interval => @options[:polling_interval],
                   :polling_timeout => @options[:polling_timeout]) if logger.debug?

      collect # Collect data right away if possible
      @task.execute
    end

    def stop
      logger.debug("Stopping")
      @task.shutdown
    end

    protected
    def configure_task
      @task = Concurrent::TimerTask.new { collect }
      @task.execution_interval = @options[:polling_interval]
      @task.timeout_interval = @options[:polling_timeout]
      @task.add_observer(self)
    end
  end
end
end; end
