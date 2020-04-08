require "minitest" unless defined? Minitest::Runnable

module Minitest
  ##
  # Subclass Test to create your own tests. Typically you'll want a
  # Test subclass per implementation class.
  #
  # See Minitest::Assertions

  class Test < Runnable
    require "minitest/assertions"
    include Minitest::Assertions

    PASSTHROUGH_EXCEPTIONS = [NoMemoryError, SignalException, SystemExit] # :nodoc:

    # :stopdoc:
    class << self; attr_accessor :io_lock; end
    self.io_lock = Mutex.new
    # :startdoc:

    ##
    # Call this at the top of your tests when you absolutely
    # positively need to have ordered tests. In doing so, you're
    # admitting that you suck and your tests are weak.

    def self.i_suck_and_my_tests_are_order_dependent!
      class << self
        undef_method :test_order if method_defined? :test_order
        define_method :test_order do :alpha end
      end
    end

    ##
    # Make diffs for this Test use #pretty_inspect so that diff
    # in assert_equal can have more details. NOTE: this is much slower
    # than the regular inspect but much more usable for complex
    # objects.

    def self.make_my_diffs_pretty!
      require "pp"

      define_method :mu_pp, &:pretty_inspect
    end

    ##
    # Call this at the top of your tests when you want to run your
    # tests in parallel. In doing so, you're admitting that you rule
    # and your tests are awesome.

    def self.parallelize_me!
      include Minitest::Parallel::Test
      extend Minitest::Parallel::Test::ClassMethods
    end

    ##
    # Returns all instance methods starting with "test_". Based on
    # #test_order, the methods are either sorted, randomized
    # (default), or run in parallel.

    def self.runnable_methods
      methods = methods_matching(/^test_/)

      case self.test_order
      when :random, :parallel then
        max = methods.size
        methods.sort.sort_by { rand max }
      when :alpha, :sorted then
        methods.sort
      else
        raise "Unknown test_order: #{self.test_order.inspect}"
      end
    end

    ##
    # Defines the order to run tests (:random by default). Override
    # this or use a convenience method to change it for your tests.

    def self.test_order
      :random
    end

    ##
    # The time it took to run this test.

    attr_accessor :time

    def marshal_dump # :nodoc:
      super << self.time
    end

    def marshal_load ary # :nodoc:
      self.time = ary.pop
      super
    end

    TEARDOWN_METHODS = %w[ before_teardown teardown after_teardown ] # :nodoc:

    ##
    # Runs a single test with setup/teardown hooks.

    def run
      with_info_handler do
        time_it do
          capture_exceptions do
            before_setup; setup; after_setup

            self.send self.name
          end

          TEARDOWN_METHODS.each do |hook|
            capture_exceptions do
              self.send hook
            end
          end
        end
      end

      self # per contract
    end

    ##
    # Provides before/after hooks for setup and teardown. These are
    # meant for library writers, NOT for regular test authors. See
    # #before_setup for an example.

    module LifecycleHooks

      ##
      # Runs before every test, before setup. This hook is meant for
      # libraries to extend minitest. It is not meant to be used by
      # test developers.
      #
      # As a simplistic example:
      #
      #   module MyMinitestPlugin
      #     def before_setup
      #       super
      #       # ... stuff to do before setup is run
      #     end
      #
      #     def after_setup
      #       # ... stuff to do after setup is run
      #       super
      #     end
      #
      #     def before_teardown
      #       super
      #       # ... stuff to do before teardown is run
      #     end
      #
      #     def after_teardown
      #       # ... stuff to do after teardown is run
      #       super
      #     end
      #   end
      #
      #   class MiniTest::Test
      #     include MyMinitestPlugin
      #   end

      def before_setup; end

      ##
      # Runs before every test. Use this to set up before each test
      # run.

      def setup; end

      ##
      # Runs before every test, after setup. This hook is meant for
      # libraries to extend minitest. It is not meant to be used by
      # test developers.
      #
      # See #before_setup for an example.

      def after_setup; end

      ##
      # Runs after every test, before teardown. This hook is meant for
      # libraries to extend minitest. It is not meant to be used by
      # test developers.
      #
      # See #before_setup for an example.

      def before_teardown; end

      ##
      # Runs after every test. Use this to clean up after each test
      # run.

      def teardown; end

      ##
      # Runs after every test, after teardown. This hook is meant for
      # libraries to extend minitest. It is not meant to be used by
      # test developers.
      #
      # See #before_setup for an example.

      def after_teardown; end
    end # LifecycleHooks

    def capture_exceptions # :nodoc:
      yield
    rescue *PASSTHROUGH_EXCEPTIONS
      raise
    rescue Assertion => e
      self.failures << e
    rescue Exception => e
      self.failures << UnexpectedError.new(e)
    end

    ##
    # Did this run error?

    def error?
      self.failures.any? { |f| UnexpectedError === f }
    end

    ##
    # The location identifier of this test.

    def location
      loc = " [#{self.failure.location}]" unless passed? or error?
      "#{self.class}##{self.name}#{loc}"
    end

    ##
    # Did this run pass?
    #
    # Note: skipped runs are not considered passing, but they don't
    # cause the process to exit non-zero.

    def passed?
      not self.failure
    end

    ##
    # Returns ".", "F", or "E" based on the result of the run.

    def result_code
      self.failure and self.failure.result_code or "."
    end

    ##
    # Was this run skipped?

    def skipped?
      self.failure and Skip === self.failure
    end

    def time_it # :nodoc:
      t0 = Minitest.clock_time

      yield
    ensure
      self.time = Minitest.clock_time - t0
    end

    def to_s # :nodoc:
      return location if passed? and not skipped?

      failures.map { |failure|
        "#{failure.result_label}:\n#{self.location}:\n#{failure.message}\n"
      }.join "\n"
    end

    def with_info_handler &block # :nodoc:
      t0 = Minitest.clock_time

      handler = lambda do
        warn "\nCurrent: %s#%s %.2fs" % [self.class, self.name, Minitest.clock_time - t0]
      end

      self.class.on_signal ::Minitest.info_signal, handler, &block
    end

    include LifecycleHooks
    include Guard
    extend Guard
  end # Test
end

require "minitest/unit" unless defined?(MiniTest) # compatibility layer only
