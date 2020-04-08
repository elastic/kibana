require 'uri'
begin
  require 'statsd-ruby'
rescue LoadError
  raise 'Gem statsd-ruby is required for logging metrics. Please add the gem "statsd-ruby" to your Gemfile.'
end

module SemanticLogger
  module Metrics
    class Statsd
      # Create Statsd metrics subscriber
      #
      # Parameters:
      #   url: [String]
      #     Valid URL to post to.
      #     Example:
      #       udp://localhost:8125
      #     Example, send all metrics to a particular namespace:
      #       udp://localhost:8125/namespace
      #     Default: udp://localhost:8125
      def initialize(options = {})
        options = options.dup
        @url    = options.delete(:url) || 'udp://localhost:8125'
        uri     = URI.parse(@url)
        raise('Statsd only supports udp. Example: "udp://localhost:8125"') if uri.scheme != 'udp'

        @statsd           = ::Statsd.new(uri.host, uri.port)
        path              = uri.path.chomp('/')
        @statsd.namespace = path.sub('/', '') if path != ''
      end

      def call(log)
        metric = log.metric
        if duration = log.duration
          @statsd.timing(metric, duration)
        else
          amount = (log.metric_amount || 1).round
          if amount < 0
            amount.times { @statsd.decrement(metric) }
          else
            amount.times { @statsd.increment(metric) }
          end
        end
      end

    end
  end
end
