module Aws
  module Plugins
    # Extends the default read-timeout value 
    class SWFReadTimeouts < Seahorse::Client::Plugin

      class Handler < Seahorse::Client::Handler

        def call(context)
          context.config = context.config.dup
          context.config.http_read_timeout = 90
          @handler.call(context)
        end

      end

      handler(Handler, operations: [
        :poll_for_activity_task,
        :poll_for_decision_task,
      ])

    end
  end
end
