module Faraday
  class Response::RaiseError < Response::Middleware
    ClientErrorStatuses = 400...600

    def on_complete(env)
      case env[:status]
      when 404
        raise Faraday::ResourceNotFound, response_values(env)
      when 407
        # mimic the behavior that we get with proxy requests with HTTPS
        raise Faraday::ConnectionFailed.new(
                %{407 "Proxy Authentication Required "},
                response_values(env))
      when ClientErrorStatuses
        raise Faraday::ClientError, response_values(env)
      when nil
        raise Faraday::NilStatusError, response: response_values(env)
      end
    end

    def response_values(env)
      {:status => env.status, :headers => env.response_headers, :body => env.body}
    end
  end
end
