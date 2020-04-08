require "march_hare/juc"

module MarchHare
  # A slighly more Ruby developer-friendly way of instantiating various
  # JDK executors (thread pools).
  class ThreadPools
    # Returns a new thread pool (JDK executor) of a fixed size.
    #
    # @param [Integer] n Number of threads to use
    #
    # @option options [Boolean] :use_daemon_threads (false) Should new threads be marked as daemon?
    #
    # @return A thread pool (JDK executor)
    def self.fixed_of_size(n, use_daemon_threads: false)
      raise ArgumentError.new("n must be a positive integer!") unless Integer === n
      raise ArgumentError.new("n must be a positive integer!") unless n > 0

      if use_daemon_threads
        JavaConcurrent::Executors.new_fixed_thread_pool(n, &daemon_thread_factory)
      else
        JavaConcurrent::Executors.new_fixed_thread_pool(n)
      end
    end

    # Returns a new thread pool (JDK executor) of a fixed size of 1.
    #
    # @option options [Boolean] :use_daemon_threads (false) Should new threads be marked as daemon?
    #
    # @return A thread pool (JDK executor)
    def self.single_threaded(use_daemon_threads: false)
      if use_daemon_threads
        JavaConcurrent::Executors.new_single_thread_executor(&daemon_thread_factory)
      else
        JavaConcurrent::Executors.new_single_thread_executor
      end
    end

    # Returns a new thread pool (JDK executor) that will create new
    # threads as needed.
    #
    # @option options [Boolean] :use_daemon_threads (false) Should new threads be marked as daemon?
    #
    # @return A thread pool (JDK executor)
    def self.dynamically_growing(use_daemon_threads: false)
      if use_daemon_threads
        JavaConcurrent::Executors.new_cached_thread_pool(&daemon_thread_factory)
      else
        JavaConcurrent::Executors.new_cached_thread_pool
      end
    end

    # Returns a new thread factory that creates daemon threads.
    #
    # @option options [ThreadFactory] :base_factory Upstream thread factory used to create threads
    #
    # @return A thread factory
    def self.daemon_thread_factory(base_factory: JavaConcurrent::Executors.default_thread_factory)
      proc { |runnable|
        base_factory.new_thread(runnable).tap { |t| t.daemon = true }
      }
    end
  end
end
