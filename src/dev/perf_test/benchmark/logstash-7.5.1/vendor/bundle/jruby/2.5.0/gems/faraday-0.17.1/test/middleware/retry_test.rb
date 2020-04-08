require File.expand_path("../../helper", __FILE__)

module Middleware
  class RetryTest < Faraday::TestCase
    def setup
      @times_called = 0
      @envs = []
    end

    def conn(*retry_args)
      Faraday.new do |b|
        b.request :retry, *retry_args

        b.adapter :test do |stub|
          ['get', 'post'].each do |method|
            stub.send(method, '/unstable') do |env|
              @times_called += 1
              @envs << env.dup
              env[:body] = nil # simulate blanking out response body
              @explode.call @times_called
            end

            stub.send(method, '/throttled') do |env|
              @times_called += 1
              @envs << env.dup

              params = env[:params]

              status = (params['status'] || 429).to_i
              headers = {}

              retry_after = params['retry_after']

              headers['Retry-After'] = retry_after if retry_after

              [status, headers, '']
            end
          end
        end
      end
    end

    def test_unhandled_error
      @explode = lambda {|n| raise "boom!" }
      assert_raises(RuntimeError) { conn.get("/unstable") }
      assert_equal 1, @times_called
    end

    def test_handled_error
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      assert_raises(Errno::ETIMEDOUT) { conn.get("/unstable") }
      assert_equal 3, @times_called
    end

    def test_legacy_max_retries
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      assert_raises(Errno::ETIMEDOUT) { conn(1).get("/unstable") }
      assert_equal 2, @times_called
    end

    def test_legacy_max_negative_retries
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      assert_raises(Errno::ETIMEDOUT) { conn(-9).get("/unstable") }
      assert_equal 1, @times_called
    end

    def test_new_max_retries
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      assert_raises(Errno::ETIMEDOUT) { conn(:max => 3).get("/unstable") }
      assert_equal 4, @times_called
    end

    def test_new_max_negative_retries
      @explode = lambda { |n| raise Errno::ETIMEDOUT }
      assert_raises(Errno::ETIMEDOUT) { conn(:max => -9).get("/unstable") }
      assert_equal 1, @times_called
    end

    def test_interval
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      started  = Time.now
      assert_raises(Errno::ETIMEDOUT) {
        conn(:max => 2, :interval => 0.1).get("/unstable")
      }
      assert_in_delta 0.2, Time.now - started, 0.04
    end

    def test_calls_calculate_sleep_amount
      explode_app = MiniTest::Mock.new
      explode_app.expect(:call, nil, [{:body=>nil}])
      def explode_app.call(env)
        raise Errno::ETIMEDOUT
      end

      retry_middleware = Faraday::Request::Retry.new(explode_app)
      class << retry_middleware
        attr_accessor :sleep_amount_retries

        def calculate_sleep_amount(retries, env)
          self.sleep_amount_retries.delete(retries)
          0
        end
      end
      retry_middleware.sleep_amount_retries = [2, 1]

      assert_raises(Errno::ETIMEDOUT) {
        retry_middleware.call({:method => :get})
      }

      assert_empty retry_middleware.sleep_amount_retries
    end

    def test_exponential_backoff
      middleware = Faraday::Request::Retry.new(nil, :max => 5, :interval => 0.1, :backoff_factor => 2)
      assert_equal middleware.send(:calculate_retry_interval, 5), 0.1
      assert_equal middleware.send(:calculate_retry_interval, 4), 0.2
      assert_equal middleware.send(:calculate_retry_interval, 3), 0.4
    end

    def test_exponential_backoff_with_max_interval
      middleware = Faraday::Request::Retry.new(nil, :max => 5, :interval => 1, :max_interval => 3, :backoff_factor => 2)
      assert_equal middleware.send(:calculate_retry_interval, 5), 1
      assert_equal middleware.send(:calculate_retry_interval, 4), 2
      assert_equal middleware.send(:calculate_retry_interval, 3), 3
      assert_equal middleware.send(:calculate_retry_interval, 2), 3
    end

    def test_random_additional_interval_amount
      middleware = Faraday::Request::Retry.new(nil, :max => 2, :interval => 0.1, :interval_randomness => 1.0)
      sleep_amount = middleware.send(:calculate_retry_interval, 2)
      assert_operator sleep_amount, :>=, 0.1
      assert_operator sleep_amount, :<=, 0.2
      middleware = Faraday::Request::Retry.new(nil, :max => 2, :interval => 0.1, :interval_randomness => 0.5)
      sleep_amount = middleware.send(:calculate_retry_interval, 2)
      assert_operator sleep_amount, :>=, 0.1
      assert_operator sleep_amount, :<=, 0.15
      middleware = Faraday::Request::Retry.new(nil, :max => 2, :interval => 0.1, :interval_randomness => 0.25)
      sleep_amount = middleware.send(:calculate_retry_interval, 2)
      assert_operator sleep_amount, :>=, 0.1
      assert_operator sleep_amount, :<=, 0.125
    end

    def test_custom_exceptions
      @explode = lambda {|n| raise "boom!" }
      assert_raises(RuntimeError) {
        conn(:exceptions => StandardError).get("/unstable")
      }
      assert_equal 3, @times_called
    end

    def test_should_retry_with_body_if_block_returns_true_for_non_idempotent_request
      body = { :foo => :bar }
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      check = lambda { |env,exception| true }
      assert_raises(Errno::ETIMEDOUT) {
        conn(:retry_if => check).post("/unstable", body)
      }
      assert_equal 3, @times_called
      assert @envs.all? { |env| env[:body] === body }
    end

    def test_should_stop_retrying_if_block_returns_false_checking_env
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      check = lambda { |env,exception| env[:method] != :post }
      assert_raises(Errno::ETIMEDOUT) {
        conn(:retry_if => check).post("/unstable")
      }
      assert_equal 1, @times_called
    end

    def test_should_stop_retrying_if_block_returns_false_checking_exception
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      check = lambda { |env,exception| !exception.kind_of?(Errno::ETIMEDOUT) }
      assert_raises(Errno::ETIMEDOUT) {
        conn(:retry_if => check).post("/unstable")
      }
      assert_equal 1, @times_called
    end

    def test_should_not_call_retry_if_for_idempotent_methods_if_methods_unspecified
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      check = lambda { |env,exception| raise "this should have never been called" }
      assert_raises(Errno::ETIMEDOUT) {
        conn(:retry_if => check).get("/unstable")
      }
      assert_equal 3, @times_called
    end

    def test_should_not_retry_for_non_idempotent_method_if_methods_unspecified
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      assert_raises(Errno::ETIMEDOUT) {
        conn.post("/unstable")
      }
      assert_equal 1, @times_called
    end

    def test_should_not_call_retry_if_for_specified_methods
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      check = lambda { |env,exception| raise "this should have never been called" }
      assert_raises(Errno::ETIMEDOUT) {
        conn(:retry_if => check, :methods => [:post]).post("/unstable")
      }
      assert_equal 3, @times_called
    end

    def test_should_call_retry_if_for_empty_method_list
      @explode = lambda {|n| raise Errno::ETIMEDOUT }
      check = lambda { |env,exception| @times_called < 2 }
      assert_raises(Errno::ETIMEDOUT) {
        conn(:retry_if => check, :methods => []).get("/unstable")
      }
      assert_equal 2, @times_called
    end

    def test_should_rewind_files_on_retry
      io = StringIO.new("Test data")
      upload_io = Faraday::UploadIO.new(io, "application/octet/stream")

      rewound = 0
      rewind = lambda { rewound += 1 }

      upload_io.stub :rewind, rewind do
        @explode = lambda {|n| raise Errno::ETIMEDOUT }
        check = lambda { |env,exception| true }
        assert_raises(Errno::ETIMEDOUT) {
          conn(:retry_if => check).post("/unstable", { :file => upload_io })
        }
      end
      assert_equal 3, @times_called
      assert_equal 2, rewound
    end

    def test_should_retry_retriable_response
      params = { status: 429 }
      response = conn(:max => 1, :retry_statuses => 429).get("/throttled", params)

      assert_equal 2, @times_called
      assert_equal 429, response.status
    end

    def test_should_not_retry_non_retriable_response
      params = { status: 503 }
      conn(:max => 1, :retry_statuses => 429).get("/throttled", params)

      assert_equal 1, @times_called
    end

    def test_interval_if_retry_after_present
      started = Time.now

      params = { :retry_after => 0.5 }
      conn(:max => 1, :interval => 0.1, :retry_statuses => [429]).get("/throttled", params)

      assert Time.now - started > 0.5
    end

    def test_should_ignore_retry_after_if_less_then_calculated
      started = Time.now

      params = { :retry_after => 0.1 }
      conn(:max => 1, :interval => 0.2, :retry_statuses => [429]).get("/throttled", params)

      assert Time.now - started > 0.2
    end

    def test_interval_when_retry_after_is_timestamp
      started = Time.now

      params = { :retry_after => (Time.now.utc + 2).strftime('%a, %d %b %Y %H:%M:%S GMT') }
      conn(:max => 1, :interval => 0.1, :retry_statuses => [429]).get("/throttled", params)

      assert Time.now - started > 1
    end

    def test_should_not_retry_when_retry_after_greater_then_max_interval
      params = { :retry_after => (Time.now.utc + 20).strftime('%a, %d %b %Y %H:%M:%S GMT') }
      conn(:max => 2, :interval => 0.1, :retry_statuses => [429], max_interval: 5).get("/throttled", params)

      assert_equal 1, @times_called
    end
  end
end
