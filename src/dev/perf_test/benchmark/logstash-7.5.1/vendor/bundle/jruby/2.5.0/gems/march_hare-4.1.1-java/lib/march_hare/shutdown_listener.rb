module MarchHare
  class ShutdownListener
    include com.rabbitmq.client.ShutdownListener

    def initialize(entity, &block)
      # connection or channel
      @entity = entity
      @block  = block
    end

    def shutdown_completed(cause)
      @block.call(@entity, cause)
    end
  end
end
