# encoding: utf-8
require "logstash/instrument/collector"

module LogStash
  module Api
    class Service
      include LogStash::Util::Loggable

      attr_reader :agent

      def initialize(agent)
        @agent = agent
        logger.debug("[api-service] start") if logger.debug?
      end

      def started?
        true
      end

      def snapshot
        agent.metric.collector.snapshot_metric
      end

      def get_shallow(*path)
        snapshot.metric_store.get_shallow(*path)
      end

      def extract_metrics(path, *keys)
        snapshot.metric_store.extract_metrics(path, *keys)
      end
    end
  end
end
