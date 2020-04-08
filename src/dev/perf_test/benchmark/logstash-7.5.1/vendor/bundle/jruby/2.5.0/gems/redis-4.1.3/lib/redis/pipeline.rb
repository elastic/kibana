class Redis
  class Pipeline
    attr_accessor :db
    attr_reader :client

    attr :futures

    def initialize(client)
      @client = client.is_a?(Pipeline) ? client.client : client
      @with_reconnect = true
      @shutdown = false
      @futures = []
    end

    def timeout
      client.timeout
    end

    def with_reconnect?
      @with_reconnect
    end

    def without_reconnect?
      !@with_reconnect
    end

    def shutdown?
      @shutdown
    end

    def empty?
      @futures.empty?
    end

    def call(command, timeout: nil, &block)
      # A pipeline that contains a shutdown should not raise ECONNRESET when
      # the connection is gone.
      @shutdown = true if command.first == :shutdown
      future = Future.new(command, block, timeout)
      @futures << future
      future
    end

    def call_with_timeout(command, timeout, &block)
      call(command, timeout: timeout, &block)
    end

    def call_pipeline(pipeline)
      @shutdown = true if pipeline.shutdown?
      @futures.concat(pipeline.futures)
      @db = pipeline.db
      nil
    end

    def commands
      @futures.map(&:_command)
    end

    def timeouts
      @futures.map(&:timeout)
    end

    def with_reconnect(val=true)
      @with_reconnect = false unless val
      yield
    end

    def without_reconnect(&blk)
      with_reconnect(false, &blk)
    end

    def finish(replies, &blk)
      if blk
        futures.each_with_index.map do |future, i|
          future._set(blk.call(replies[i]))
        end
      else
        futures.each_with_index.map do |future, i|
          future._set(replies[i])
        end
      end
    end

    class Multi < self
      def finish(replies)
        exec = replies.last

        return if exec.nil? # The transaction failed because of WATCH.

        # EXEC command failed.
        raise exec if exec.is_a?(CommandError)

        if exec.size < futures.size
          # Some command wasn't recognized by Redis.
          raise replies.detect { |r| r.is_a?(CommandError) }
        end

        super(exec) do |reply|
          # Because an EXEC returns nested replies, hiredis won't be able to
          # convert an error reply to a CommandError instance itself. This is
          # specific to MULTI/EXEC, so we solve this here.
          reply.is_a?(::RuntimeError) ? CommandError.new(reply.message) : reply
        end
      end

      def timeouts
        if empty?
          []
        else
          [nil, *super, nil]
        end
      end

      def commands
        if empty?
          []
        else
          [[:multi]] + super + [[:exec]]
        end
      end
    end
  end

  class FutureNotReady < RuntimeError
    def initialize
      super("Value will be available once the pipeline executes.")
    end
  end

  class Future < BasicObject
    FutureNotReady = ::Redis::FutureNotReady.new

    attr_reader :timeout

    def initialize(command, transformation, timeout)
      @command = command
      @transformation = transformation
      @timeout = timeout
      @object = FutureNotReady
    end

    def inspect
      "<Redis::Future #{@command.inspect}>"
    end

    def _set(object)
      @object = @transformation ? @transformation.call(object) : object
      value
    end

    def _command
      @command
    end

    def value
      ::Kernel.raise(@object) if @object.kind_of?(::RuntimeError)
      @object
    end

    def is_a?(other)
      self.class.ancestors.include?(other)
    end

    def class
      Future
    end
  end
end
