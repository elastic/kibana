module MarchHare
  class Exception < StandardError
  end

  class ShutdownSignal < Exception
    attr_reader :cause

    def initialize(cause)
      @cause = cause
    end
  end

  class NetworkException < Exception
  end

  class ConnectionRefused < NetworkException
  end

  class ChannelLevelException < Exception
    attr_reader :channel_close

    def initialize(message, channel_close)
      super(message)

      @channel_close = channel_close
    end
  end

  class ConnectionLevelException < Exception
    attr_reader :connection_close

    def initialize(message, connection_close)
      super(message)

      @connection_close = connection_close
    end
  end

  # Raised when RabbitMQ closes network connection before
  # finalizing the connection, typically indicating authentication failure.
  #
  # RabbitMQ versions beyond 3.2 use a better defined authentication failure
  # notifications.
  class PossibleAuthenticationFailureError < Exception
    attr_reader :username, :vhost

    def initialize(username, vhost, password_length)
      @username = username
      @vhost    = vhost

      super("Authentication with RabbitMQ failed or RabbitMQ version used does not support AMQP 0-9-1. Username: #{username}, vhost: #{vhost}, password length: #{password_length}. Please check your configuration.")
    end
  end

  # Raised when RabbitMQ 3.2+ reports authentication
  # failure before closing TCP connection.
  class AuthenticationFailureError < PossibleAuthenticationFailureError
    attr_reader :username, :vhost

    def initialize(username, vhost, password_length)
      super(username, vhost, password_length)
    end
  end

  class PreconditionFailed < ChannelLevelException
  end

  class NotFound < ChannelLevelException
  end

  class ResourceLocked < ChannelLevelException
  end

  class AccessRefused < ChannelLevelException
  end

  class ChannelError < ConnectionLevelException
  end

  class InvalidCommand < ConnectionLevelException
  end

  class FrameError < ConnectionLevelException
  end

  class UnexpectedFrame < ConnectionLevelException
  end

  class ChannelAlreadyClosed < Exception
  end

  class ConnectionForced < Exception
  end

  # Converts RabbitMQ Java client exceptions
  #
  # @private
  class Exceptions
    def self.convert(e, unwrap_io_exception = true)
      case e
      when java.net.SocketException then
        IOError.new(e.message)
      when java.io.IOException then
        c = e.cause

        if c && unwrap_io_exception
          convert(c, false)
        else
          IOError.new(e.message)
        end
      when com.rabbitmq.client.AlreadyClosedException then
        ChannelAlreadyClosed.new(e.reason)
      when com.rabbitmq.client.ShutdownSignalException then
        exception_for_protocol_method(e.reason)
      else
        e
      end
    end

    def self.convert_and_reraise(e)
      raise convert(e)
    end

    def self.exception_for_protocol_method(m)
      case m
      # com.rabbitmq.client.AMQP.Connection.Close does not resolve the inner
      # class correctly. Looks like a JRuby bug we work around by using Rubyesque
      # class name. MK.
      when Java::ComRabbitmqClient::AMQP::Connection::Close then
        exception_for_connection_close(m)
      when Java::ComRabbitmqClient::AMQP::Channel::Close then
        exception_for_channel_close(m)
      else
        NotImplementedError.new("Exception convertion for protocol method #{m.inspect} is not implemented!")
      end
    end # def self


    def self.exception_for_connection_close(m)
      klass = case m.reply_code
              when 320 then
                ConnectionForced
              when 501 then
                FrameError
              when 503 then
                InvalidCommand
              when 504 then
                ChannelError
              when 505 then
                UnexpectedFrame
              else
                raise "Unknown reply code: #{m.reply_code}, text: #{m.reply_text}"
              end

      klass.new("Connection-level error: #{m.reply_text}", m)
    end

    def self.exception_for_channel_close(m)
      klass = case m.reply_code
              when 403 then
                AccessRefused
              when 404 then
                NotFound
              when 405 then
                ResourceLocked
              when 406 then
                PreconditionFailed
              else
                ChannelLevelException
              end

      klass.new(m.reply_text, m)
    end
  end
end # MarchHare
