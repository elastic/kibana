require File.expand_path("../../helper", __FILE__)

module Middleware
  class InstrumentationTest < Faraday::TestCase
    def setup
      @instrumenter = FakeInstrumenter.new
    end

    def test_default_name
      assert_equal 'request.faraday', options.name
    end

    def test_default_instrumenter
      begin
        instrumenter = options.instrumenter
      rescue NameError => err
        assert_match 'ActiveSupport', err.to_s
      else
        assert_equal ActiveSupport::Notifications, instrumenter
      end
    end

    def test_name
      assert_equal 'booya', options(:name => 'booya').name
    end

    def test_instrumenter
      assert_equal :boom, options(:instrumenter => :boom).instrumenter
    end

    def test_instrumentation_with_default_name
      assert_equal 0, @instrumenter.instrumentations.size

      faraday = conn
      res = faraday.get '/'
      assert_equal 'ok', res.body

      assert_equal 1, @instrumenter.instrumentations.size
      name, env = @instrumenter.instrumentations.first
      assert_equal 'request.faraday', name
      assert_equal '/', env[:url].path
    end

    def test_instrumentation
      assert_equal 0, @instrumenter.instrumentations.size

      faraday = conn :name => 'booya'
      res = faraday.get '/'
      assert_equal 'ok', res.body

      assert_equal 1, @instrumenter.instrumentations.size
      name, env = @instrumenter.instrumentations.first
      assert_equal 'booya', name
      assert_equal '/', env[:url].path
    end

    class FakeInstrumenter
      attr_reader :instrumentations

      def initialize
        @instrumentations = []
      end

      def instrument(name, env)
        @instrumentations << [name, env]
        yield
      end
    end

    def options(hash = nil)
      Faraday::Request::Instrumentation::Options.from hash
    end

    def conn(hash = nil)
      hash ||= {}
      hash[:instrumenter] = @instrumenter

      Faraday.new do |f|
        f.request :instrumentation, hash
        f.adapter :test do |stub|
          stub.get '/' do
            [200, {}, 'ok']
          end
        end
      end
    end
  end
end
