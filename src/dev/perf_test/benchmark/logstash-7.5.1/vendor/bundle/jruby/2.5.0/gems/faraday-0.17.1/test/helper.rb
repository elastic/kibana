require 'simplecov'
require 'coveralls'

SimpleCov.formatters = [SimpleCov::Formatter::HTMLFormatter, Coveralls::SimpleCov::Formatter]

SimpleCov.start do
  add_filter '/bundle/'
  add_filter '/test/'
  minimum_coverage(87)
end

gem 'minitest' if defined? Bundler
require 'minitest/autorun'

require File.expand_path('../../lib/faraday', __FILE__)

require 'stringio'
require 'uri'

module Faraday
  module LiveServerConfig
    def live_server=(value)
      @@live_server = case value
      when /^http/
        URI(value)
      when /./
        URI('http://127.0.0.1:4567')
      end
    end

    def live_server?
      defined? @@live_server
    end

    # Returns an object that responds to `host` and `port`.
    def live_server
      live_server? and @@live_server
    end
  end

  class TestCase < MiniTest::Test
    extend LiveServerConfig
    self.live_server = ENV['LIVE']

    def test_default
      assert true
    end unless defined? ::MiniTest

    def capture_warnings
      old, $stderr = $stderr, StringIO.new
      begin
        yield
        $stderr.string
      ensure
        $stderr = old
      end
    end

    def self.jruby?
      defined? RUBY_ENGINE and 'jruby' == RUBY_ENGINE
    end

    def self.rbx?
      defined? RUBY_ENGINE and 'rbx' == RUBY_ENGINE
    end

    def self.ruby_22_plus?
      RUBY_VERSION > '2.2'
    end

    def self.ssl_mode?
      ENV['SSL'] == 'yes'
    end
  end
end
