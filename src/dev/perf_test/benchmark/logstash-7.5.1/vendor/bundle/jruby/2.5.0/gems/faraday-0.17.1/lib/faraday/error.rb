# frozen_string_literal: true

require 'faraday/deprecate'

# Faraday namespace.
module Faraday
  # Faraday error base class.
  class Error < StandardError
    attr_reader :response, :wrapped_exception

    def initialize(exc, response = nil)
      @wrapped_exception = nil
      @response = response

      if exc.respond_to?(:backtrace)
        super(exc.message)
        @wrapped_exception = exc
      elsif exc.respond_to?(:each_key)
        super("the server responded with status #{exc[:status]}")
        @response = exc
      else
        super(exc.to_s)
      end
    end

    def backtrace
      if @wrapped_exception
        @wrapped_exception.backtrace
      else
        super
      end
    end

    def inspect
      inner = +''
      inner << " wrapped=#{@wrapped_exception.inspect}" if @wrapped_exception
      inner << " response=#{@response.inspect}" if @response
      inner << " #{super}" if inner.empty?
      %(#<#{self.class}#{inner}>)
    end
  end

  # Faraday client error class. Represents 4xx status responses.
  class ClientError < Error
  end

  # Raised by Faraday::Response::RaiseError in case of a 400 response.
  class BadRequestError < ClientError
  end

  # Raised by Faraday::Response::RaiseError in case of a 401 response.
  class UnauthorizedError < ClientError
  end

  # Raised by Faraday::Response::RaiseError in case of a 403 response.
  class ForbiddenError < ClientError
  end

  # Raised by Faraday::Response::RaiseError in case of a 404 response.
  class ResourceNotFound < ClientError
  end

  # Raised by Faraday::Response::RaiseError in case of a 407 response.
  class ProxyAuthError < ClientError
  end

  # Raised by Faraday::Response::RaiseError in case of a 409 response.
  class ConflictError < ClientError
  end

  # Raised by Faraday::Response::RaiseError in case of a 422 response.
  class UnprocessableEntityError < ClientError
  end

  # Faraday server error class. Represents 5xx status responses.
  class ServerError < Error
  end

  # A unified client error for timeouts.
  class TimeoutError < ServerError
    def initialize(exc = 'timeout', response = nil)
      super(exc, response)
    end
  end

  # Raised by Faraday::Response::RaiseError in case of a nil status in response.
  class NilStatusError < ServerError
    def initialize(_exc, response: nil)
      message = 'http status could not be derived from the server response'
      super(message, response)
    end
  end

  # A unified error for failed connections.
  class ConnectionFailed < Error
  end

  # A unified client error for SSL errors.
  class SSLError < Error
  end

  # Raised by FaradayMiddleware::ResponseMiddleware
  class ParsingError < Error
  end

  # Exception used to control the Retry middleware.
  #
  # @see Faraday::Request::Retry
  class RetriableResponse < Error
  end

  %i[ClientError ConnectionFailed ResourceNotFound
     ParsingError TimeoutError SSLError RetriableResponse].each do |const|
    Error.const_set(
      const,
      DeprecatedClass.proxy_class(Faraday.const_get(const))
    )
  end
end
