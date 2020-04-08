module SemanticLogger
  module Metrics
    class NewRelic
      attr_accessor :prefix

      # Parameters:
      #   :prefix [String]
      #     Prefix to add to every metric before forwarding to NewRelic
      #     Default: 'Custom'
      def initialize(options = {})
        options = options.dup
        @prefix = options.delete(:prefix) || 'Custom'
        raise(ArgumentError, "Unknown options: #{options.inspect}") if options.size > 0
      end

      def call(log)
        metric = log.metric
        # Add prefix for NewRelic
        metric = "#{prefix}/#{metric}" unless metric.start_with?(prefix)

        if duration = log.duration
          # Convert duration to seconds
          ::NewRelic::Agent.record_metric(metric, duration / 1000.0)
        else
          ::NewRelic::Agent.increment_metric(metric, log.metric_amount || 1)
        end
      end
    end
  end
end
