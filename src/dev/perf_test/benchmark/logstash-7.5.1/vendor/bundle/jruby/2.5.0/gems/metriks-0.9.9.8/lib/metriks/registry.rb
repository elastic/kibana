require 'metriks/counter'
require 'metriks/timer'
require 'metriks/utilization_timer'
require 'metriks/meter'
require 'metriks/gauge'

module Metriks
  # Public: A collection of metrics
  class Registry
    # Public: The default registry for the process.
    #
    # Returns the default Registry for the process.
    def self.default
      @default ||= new
    end

    # Public: Initializes a new Registry.
    def initialize
      @mutex = Mutex.new
      @metrics = {}
    end

    # Public: Clear all of the metrics in the Registry. This ensures all
    # metrics that have been added are stopped.
    #
    # Returns nothing.
    def clear
      @mutex.synchronize do
        @metrics.each do |key, metric|
          metric.stop if metric.respond_to?(:stop)
        end

        @metrics = {}
      end
    end

    # Public: Clear all of the metrics in the Registry. This has the same
    # effect as calling #clear.
    #
    # Returns nothing.
    def stop
      clear
    end

    # Public: Iterate over all of the counters.
    #
    # Examples
    #
    #   registry.each do |name, metric|
    #     puts name
    #   end
    #
    # Returns nothing.
    def each(&block)
      metrics = @mutex.synchronize do
        @metrics.dup
      end

      metrics.each(&block)
    end

    # Public: Fetch or create a new counter metric. Counters are one of the
    # simplest metrics whose only operations are increment and decrement.
    #
    # name - The String name of the metric to define or fetch
    #
    # Examples
    #
    #   registry.counter('method.calls')
    #
    # Returns the Metriks::Counter identified by the name.
    def counter(name)
      add_or_get(name, Metriks::Counter)
    end

    # Public: Fetch or create a new gauge metric.
    #
    # name - The String name of the metric to define or fetch
    #
    # Examples
    #
    #   registry.gauge('disk_space.used') { 1 }
    #
    # Returns the Metriks::Gauge identified by the name.
    def gauge(name, callable = nil, &block)
      add_or_get(name, Metriks::Gauge) do
        Metriks::Gauge.new(callable, &block)
      end
    end

    # Public: Fetch or create a new meter metric. Meters are a counter that
    # tracks throughput along with the count.
    #
    # name - The String name of the metric to define or fetch
    #
    # Examples
    #
    #   registry.meter('resque.calls')
    #
    # Returns the Metriks::Meter identified by the name.
    def meter(name)
      add_or_get(name, Metriks::Meter)
    end

    # Public: Fetch or create a new timer metric. Timers provide the means to
    # time the execution of a method including statistics on the number of
    # invocations, average length of time, throughput.
    #
    # name - The String name of the metric to define or fetch
    #
    # Examples
    #
    #   registry.timer('resque.worker')
    #
    # Returns the Metriks::Timer identified by the name.
    def timer(name)
      add_or_get(name, Metriks::Timer)
    end

    # Public: Fetch or create a new utilization timer metric.
    #
    # Utilization timers are a specialized version of a timer that calculate
    # the percentage of wall-clock time (between 0 and 1) that was spent in
    # the method. This metric is most valuable in a single-threaded
    # environment where a processes is waiting on an external resource like a
    # message queue or HTTP server.
    #
    # name - The String name of the metric to define or fetch
    #
    # Examples
    #
    #   registry.utilization_timer('rack.utilization')
    #
    # Returns the Metriks::UtilizationTimer identified by the name.
    def utilization_timer(name)
      add_or_get(name, Metriks::UtilizationTimer)
    end

    # Public: Fetch or create a new histogram metric. Histograms record values
    # and expose statistics about the distribution of the data like median and
    # 95th percentile.
    #
    # name - The String name of the metric to define or fetch
    #
    # Examples
    #
    #   registry.histogram('backlog.wait')
    #
    # Returns the Metriks::Histogram identified by the name.
    def histogram(name)
      add_or_get(name, Metriks::Histogram) do
        Metriks::Histogram.new_exponentially_decaying
      end
    end

    # Public: Fetch an existing metric.
    #
    # name - The String name of the metric to fetch
    #
    # Examples
    #
    #   registry.get('rack.utilization')
    #
    # Returns the metric or nil.
    def get(name)
      @mutex.synchronize do
        @metrics[name]
      end
    end

    # Public: Add a new metric.
    #
    # name - The String name of the metric to add
    # metric - The metric instance to add
    #
    # Examples
    #
    #   registry.add('method.calls', Metriks::Counter.new)
    #
    # Returns nothing.
    # Raises RuntimeError if the metric name is already defined
    def add(name, metric)
      @mutex.synchronize do
        if @metrics[name]
          raise "Metric '#{name}' already defined"
        else
          @metrics[name] = metric
        end
      end
    end

    protected
    def add_or_get(name, klass, &create_metric)
      @mutex.synchronize do
        if metric = @metrics[name]
          if !metric.is_a?(klass)
            raise "Metric already defined as '#{metric.class}'"
          else
            return metric
          end
        else
          @metrics[name] = create_metric ? create_metric.call : klass.new
        end
      end
    end
  end
end
