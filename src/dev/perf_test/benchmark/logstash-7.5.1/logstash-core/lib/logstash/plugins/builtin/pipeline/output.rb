module ::LogStash; module Plugins; module Builtin; module Pipeline; class Output < ::LogStash::Outputs::Base
  include org.logstash.plugins.pipeline.PipelineOutput

  config_name "pipeline"

  concurrency :shared

  config :send_to, :validate => :string, :required => true, :list => true

  config :ensure_delivery, :validate => :boolean, :default => true

  attr_reader :pipeline_bus

  def register
    @pipeline_bus = execution_context.agent.pipeline_bus
    pipeline_bus.registerSender(self, @send_to)
  end

  def multi_receive(events)
    pipeline_bus.sendEvents(self, events, ensure_delivery)
  end

  def close
    pipeline_bus.unregisterSender(self, @send_to)
  end
end; end; end; end; end