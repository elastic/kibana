require 'logger'
require 'metriks/time_tracker'

module Metriks::Reporter
  class Logger
    attr_accessor :prefix, :log_level, :logger

    def initialize(options = {})
      @logger    = options[:logger]    || ::Logger.new(STDOUT)
      @log_level = options[:log_level] || ::Logger::INFO
      @prefix    = options[:prefix]    || 'metriks:'

      @registry     = options[:registry] || Metriks::Registry.default
      @time_tracker = Metriks::TimeTracker.new(options[:interval] || 60)
      @on_error     = options[:on_error] || proc { |ex| }
    end

    def start
      @thread ||= Thread.new do
        loop do
          @time_tracker.sleep

          begin
            write
          rescue Exception => ex
            @on_error[ex] rescue nil
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
      if !@last_write || @last_write.min != Time.now.min
        write
      end
    end

    def write
      @last_write = Time.now

      @registry.each do |name, metric|
        case metric
        when Metriks::Meter
          log_metric name, 'meter', metric, [
            :count, :one_minute_rate, :five_minute_rate,
            :fifteen_minute_rate, :mean_rate
          ]
        when Metriks::Counter
          log_metric name, 'counter', metric, [
            :count
          ]
        when Metriks::Gauge
          log_metric name, 'gauge', metric, [
            :value
          ]
        when Metriks::UtilizationTimer
          log_metric name, 'utilization_timer', metric, [
            :count, :one_minute_rate, :five_minute_rate,
            :fifteen_minute_rate, :mean_rate,
            :min, :max, :mean, :stddev,
            :one_minute_utilization, :five_minute_utilization,
            :fifteen_minute_utilization, :mean_utilization,
          ], [
            :median, :get_95th_percentile
          ]
        when Metriks::Timer
          log_metric name, 'timer', metric, [
            :count, :one_minute_rate, :five_minute_rate,
            :fifteen_minute_rate, :mean_rate,
            :min, :max, :mean, :stddev
          ], [
            :median, :get_95th_percentile
          ]
        when Metriks::Histogram
          log_metric name, 'histogram', metric, [
            :count, :min, :max, :mean, :stddev
          ], [
            :median, :get_95th_percentile
          ]
        end
      end
    end

    def extract_from_metric(metric, *keys)
      keys.flatten.collect do |key|
        name = key.to_s.gsub(/^get_/, '')
        [ { name => metric.send(key) } ]
      end
    end

    def log_metric(name, type, metric, keys, snapshot_keys = [])
      message = []

      message << @prefix if @prefix
      message << { :time => Time.now.to_i }

      message << { :name => name }
      message << { :type => type }
      message += extract_from_metric(metric, keys)

      unless snapshot_keys.empty?
        snapshot = metric.snapshot
        message += extract_from_metric(snapshot, snapshot_keys)
      end

      @logger.add(@log_level, format_message(message))
    end

    def format_message(args)
      args.map do |arg|
        case arg
        when Hash then arg.map { |name, value| "#{name}=#{format_message([value])}" }
        when Array then format_message(arg)
        else arg
        end
      end.join(' ')
    end
  end
end
