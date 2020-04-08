module MarchHare
  class ExceptionHandler < com.rabbitmq.client.impl.ForgivingExceptionHandler
    def initialize(logger)
      super()
      @logger = logger
    end

    def log(msg, error)
      logger.error(msg)
      logger.error(error)
    end

    private

    attr_reader :logger
  end
end