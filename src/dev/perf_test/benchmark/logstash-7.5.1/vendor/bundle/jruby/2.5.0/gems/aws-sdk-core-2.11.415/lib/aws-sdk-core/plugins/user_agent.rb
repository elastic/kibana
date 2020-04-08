module Aws
  module Plugins
    class UserAgent < Seahorse::Client::Plugin

      option(:user_agent_suffix)

      # @api private
      class Handler < Seahorse::Client::Handler

        def call(context)
          set_user_agent(context)
          @handler.call(context)
        end

        def set_user_agent(context)
          ua = "aws-sdk-ruby2/#{VERSION} %s/%s %s %s" % [
            (RUBY_ENGINE rescue nil or "ruby"),
            RUBY_VERSION,
            RUBY_PLATFORM,
            context.config.user_agent_suffix,
          ]
          context.http_request.headers['User-Agent'] = ua.strip
        end

      end

      handler(Handler)

    end
  end
end
