module ::LogStash; module Plugins; module Builtin; module Pipeline; class Input < ::LogStash::Inputs::Base
  include org.logstash.plugins.pipeline.PipelineInput

  config_name "pipeline"

  config :address, :validate => :string, :required => true

  attr_reader :pipeline_bus

  def register
    # May as well set this up here, writers won't do anything until
    # @running is set to false
    @running = java.util.concurrent.atomic.AtomicBoolean.new(false)
    @pipeline_bus = execution_context.agent.pipeline_bus
    listen_successful = pipeline_bus.listen(self, address)
    if !listen_successful
      raise ::LogStash::ConfigurationError, "Internal input at '#{@address}' already bound! Addresses must be globally unique across pipelines."
    end
  end

  def run(queue)
    @queue = queue
    @running.set(true)

    while @running.get()
      sleep 0.1
    end
  end

  def running?
    @running && @running.get()
  end

  # Returns false if the receive failed due to a stopping input
  # To understand why this value is useful see Internal.send_to
  # Note, this takes a java Stream, not a ruby array
  def internalReceive(events)
    return false if !@running.get()

    # TODO This should probably push a batch at some point in the future when doing so
    # buys us some efficiency
    events.forEach do |event|
      decorate(event)
      @queue << event
    end

    true
  end

  def stop
    pipeline_bus.unlisten(self, address)
    # We stop receiving events _after_ we unlisten to pick up any events sent by upstream outputs that
    # have not yet stopped
    @running.set(false) if @running # If register wasn't yet called, no @running!
  end

  def isRunning
    @running.get
  end

end; end; end; end; end