# encoding: utf-8

require "logstash/api/commands/base"

module LogStash
  module Api
    module Commands
      class DefaultMetadata < Commands::Base
        def all
          {:host => host,
           :version => version,
           :http_address => http_address,
           :id => service.agent.id,
           :name => service.agent.name,
           :ephemeral_id => service.agent.ephemeral_id,
           :status => "green",  # This is hard-coded to mirror x-pack behavior
           :snapshot => ::BUILD_INFO["build_snapshot"],
           :pipeline => {
             :workers => LogStash::SETTINGS.get("pipeline.workers"),
             :batch_size => LogStash::SETTINGS.get("pipeline.batch.size"),
             :batch_delay => LogStash::SETTINGS.get("pipeline.batch.delay"),
           }
           }
        end

        def host
          @@host ||= Socket.gethostname
        end

        def version
          LOGSTASH_CORE_VERSION
        end

        def http_address
          @http_address ||= service.get_shallow(:http_address).value
        rescue ::LogStash::Instrument::MetricStore::MetricNotFound, NoMethodError => e
          nil
        end
      end
    end
  end
end
