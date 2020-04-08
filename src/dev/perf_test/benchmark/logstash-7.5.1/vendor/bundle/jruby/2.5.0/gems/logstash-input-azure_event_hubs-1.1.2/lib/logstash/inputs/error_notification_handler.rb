# encoding: utf-8
require "logstash/util/loggable"
java_import java.util.function.Consumer

module LogStash
  module Inputs
    module Azure
      class ErrorNotificationHandler
        include Consumer
        include LogStash::Util::Loggable

        def initialize
          @logger = self.logger
        end

        def accept(exception_received_event_args)
          @logger.error("Error with Event Processor Host. ", 
            :host_name => exception_received_event_args.getHostname(),
            :action => exception_received_event_args.getAction(), 
            :exception => exception_received_event_args.getException().toString())
        end
      end
    end
  end
end
