require "march_hare/consumers/base"

module MarchHare
  class BlockingCallbackConsumer < CallbackConsumer
    POISON = :__poison__

    def initialize(channel, queue, buffer_size, opts, callback)
      super(channel, queue, opts, callback)
      if buffer_size
        @internal_queue = JavaConcurrent::ArrayBlockingQueue.new(buffer_size)
      else
        @internal_queue = JavaConcurrent::LinkedBlockingQueue.new
      end
    end

    def cancel
      if super
        @internal_queue.offer(POISON)
      end
    end

    def start
      interrupted = false
      until (@cancelling.get || @cancelled.get) || JavaConcurrent::Thread.current_thread.interrupted?
        begin
          pair = @internal_queue.take
          if pair
            if pair == POISON
              @cancelling.set(true)
            else
              @callback.call(*pair)
            end
          end
        rescue JavaConcurrent::InterruptedException => e
          interrupted = true
        end
      end
      while (pair = @internal_queue.poll)
        if pair
          if pair == POISON
            @cancelling.set(true)
          else
            @callback.call(*pair)
          end
        end
      end
      @terminated.set(true)
      if interrupted
        JavaConcurrent::Thread.current_thread.interrupt
      end
    end

    def deliver(*pair)
      if (@cancelling.get || @cancelled.get) || JavaConcurrent::Thread.current_thread.interrupted?
        @internal_queue.offer(pair)
      else
        begin
          @internal_queue.put(pair)
        rescue JavaConcurrent::InterruptedException => e
          JavaConcurrent::Thread.current_thread.interrupt
        end
      end
    end

    def gracefully_shut_down
      @cancelling.set(true)
      @internal_queue.offer(POISON)

      @terminated.set(true)
    end

  end
end
