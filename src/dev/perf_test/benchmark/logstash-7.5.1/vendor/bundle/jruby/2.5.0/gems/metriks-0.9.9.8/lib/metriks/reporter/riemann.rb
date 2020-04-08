module Metriks::Reporter
  class Riemann
    require 'riemann/client'

    attr_accessor :client
    def initialize(options = {})
      @client = ::Riemann::Client.new(
        :host => options[:host],
        :port => options[:port]
      )
      @registry = options[:registry] || Metriks::Registry.default
      @interval = options[:interval] || 60
      @on_error = options[:on_error] || proc { |ex| }
      
      @default_event = options[:default_event] || {}
      @default_event[:ttl] ||= @interval * 1.5
    end

    def start
      @thread ||= Thread.new do
        loop do
          sleep @interval
          
          Thread.new do
            begin
              write
            rescue Exception => ex
              @on_error[ex] rescue nil
            end
          end
        end
      end
    end

    def stop
      @thread.kill if @thread
      @thread = nil
    end

    def restart
      stop
      start
    end

    def flush
      # Is this supposed to take interval into account? --aphyr
      if !@last_write || @last_write.min != Time.now.min
        write
      end
    end

    def write
      @last_write = Time.now

      @registry.each do |name, metric|
        case metric
        when Metriks::Meter
          send_metric name, 'meter', metric, [
            :count, :one_minute_rate, :five_minute_rate,
            :fifteen_minute_rate, :mean_rate
          ]
        when Metriks::Counter
          send_metric name, 'counter', metric, [
            :count
          ]
        when Metriks::Gauge
          send_metric name, 'gauge', metric, [
            :value
          ]
        when Metriks::UtilizationTimer
          send_metric name, 'utilization_timer', metric, [
            :count, :one_minute_rate, :five_minute_rate,
            :fifteen_minute_rate, :mean_rate,
            :min, :max, :mean, :stddev,
            :one_minute_utilization, :five_minute_utilization,
            :fifteen_minute_utilization, :mean_utilization,
          ], [
            :median, :get_95th_percentile
          ]
        when Metriks::Timer
          send_metric name, 'timer', metric, [
            :count, :one_minute_rate, :five_minute_rate,
            :fifteen_minute_rate, :mean_rate,
            :min, :max, :mean, :stddev
          ], [
            :median, :get_95th_percentile
          ]
        when Metriks::Histogram
          send_metric name, 'histogram', metric, [
            :count, :min, :max, :mean, :stddev
          ], [
            :median, :get_95th_percentile
          ]
        end
      end
    end

    def send_metric(name, type, metric, keys, snapshot_keys = [])
      keys.each do |key|
        @client << @default_event.merge(
          :service => "#{name} #{key}",
          :metric => metric.send(key),
          :tags => [type]
        )
      end

      unless snapshot_keys.empty?
        snapshot = metric.snapshot
        snapshot_keys.each do |key|
          @client << @default_event.merge(
            :service => "#{name} #{key}",
            :metric => snapshot.send(key),
            :tags => [type]
          )
        end
      end
    end
  end
end
