# encoding: utf-8
require "logstash/instrument/metric_store"
require "concurrent/timer_task"
require "observer"
require "singleton"
require "thread"

module LogStash module Instrument
  # The Collector is the single point of reference for all
  # the metrics collection inside logstash, the metrics library will make
  # direct calls to this class.
  class Collector
    include LogStash::Util::Loggable

    SNAPSHOT_ROTATION_TIME_SECS = 1 # seconds
    SNAPSHOT_ROTATION_TIMEOUT_INTERVAL_SECS = 10 * 60 # seconds

    attr_accessor :agent

    def initialize
      @metric_store = MetricStore.new
      @agent = nil
    end

    # The metric library will call this unique interface
    # its the job of the collector to update the store with new metric
    # of update the metric
    #
    # If there is a problem with the key or the type of metric we will record an error
    # but we won't stop processing events, theses errors are not considered fatal.
    #
    def push(namespaces_path, key, type, *metric_type_params)
      begin
        get(namespaces_path, key, type).execute(*metric_type_params)
      rescue MetricStore::NamespacesExpectedError => e
        logger.error("Collector: Cannot record metric", :exception => e)
      rescue NameError => e
        logger.error("Collector: Cannot create concrete class for this metric type",
                     :type => type,
                     :namespaces_path => namespaces_path,
                     :key => key,
                     :metrics_params => metric_type_params,
                     :exception => e,
                     :stacktrace => e.backtrace)
      end
    end

    def get(namespaces_path, key, type)
      @metric_store.fetch_or_store(namespaces_path, key) do
        LogStash::Instrument::MetricType.create(type, namespaces_path, key)
      end
    end

    # Snapshot the current Metric Store and return it immediately,
    # This is useful if you want to get access to the current metric store without
    # waiting for a periodic call.
    #
    # @return [LogStash::Instrument::MetricStore]
    def snapshot_metric
      Snapshot.new(@metric_store.dup)
    end

    def clear(keypath)
      @metric_store.prune(keypath)
    end
  end
end; end
