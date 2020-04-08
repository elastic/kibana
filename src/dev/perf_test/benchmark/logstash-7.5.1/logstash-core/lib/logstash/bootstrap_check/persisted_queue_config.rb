# encoding: utf-8

module LogStash
  module BootstrapCheck
    class PersistedQueueConfig
      def self.check(settings)
        return unless settings.get('queue.type') == 'persisted'
        if settings.get('queue.page_capacity') > settings.get('queue.max_bytes')
          raise(LogStash::BootstrapCheckError, I18n.t("logstash.bootstrap_check.persisted_queue_config.page-capacity"))
        end
      end
    end
  end
end
