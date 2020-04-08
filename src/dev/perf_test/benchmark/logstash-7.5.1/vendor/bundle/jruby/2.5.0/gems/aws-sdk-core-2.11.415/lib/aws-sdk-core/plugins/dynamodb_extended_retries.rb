module Aws
  module Plugins

    # @seahorse.client.option [Integer] :retry_limit (10)
    #   The maximum number of times to retry failed requests.  Only
    #   ~ 500 level server errors and certain ~ 400 level client errors
    #   are retried.  Generally, these are throttling errors, data
    #   checksum errors, networking errors, timeout errors and auth
    #   errors from expired credentials.
    class DynamoDBExtendedRetries < Seahorse::Client::Plugin

      option(:retry_limit, 10)

      option(:retry_backoff, lambda { |context|
        if context.retries > 1
          Kernel.sleep(50 * (2 ** (context.retries - 1)) / 1000.0)
        end
      })

    end
  end
end
