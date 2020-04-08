require File.expand_path('../integration', __FILE__)

module Adapters
  class NetHttpPersistentTest < Faraday::TestCase

    def adapter() :net_http_persistent end

    Integration.apply(self, :NonParallel) do
      def setup
        if defined?(Net::HTTP::Persistent)
          # work around problems with mixed SSL certificates
          # https://github.com/drbrain/net-http-persistent/issues/45
          if Net::HTTP::Persistent.instance_method(:initialize).parameters.first == [:key, :name]
            Net::HTTP::Persistent.new(name: 'Faraday').reconnect_ssl
          else
            Net::HTTP::Persistent.new('Faraday').ssl_cleanup(4)
          end
        end
      end if ssl_mode?

      def test_reuses_tcp_sockets
        # Ensure that requests are not reused from previous tests
        Thread.current.keys
          .select { |key| key.to_s =~ /\Anet_http_persistent_Faraday_/ }
          .each { |key| Thread.current[key] = nil }

        sockets = []
        tcp_socket_open_wrapped = Proc.new do |*args, &block|
          socket = TCPSocket.__minitest_stub__open(*args, &block)
          sockets << socket
          socket
        end

        TCPSocket.stub :open, tcp_socket_open_wrapped do
          conn = create_connection
          conn.post("/echo", :foo => "bar")
          conn.post("/echo", :foo => "baz")
        end

        assert_equal 1, sockets.count
      end

      def test_does_not_reuse_tcp_sockets_when_proxy_changes
        # Ensure that requests are not reused from previous tests
        Thread.current.keys
          .select { |key| key.to_s =~ /\Anet_http_persistent_Faraday_/ }
          .each { |key| Thread.current[key] = nil }

        sockets = []
        tcp_socket_open_wrapped = Proc.new do |*args, &block|
          socket = TCPSocket.__minitest_stub__open(*args, &block)
          sockets << socket
          socket
        end

        TCPSocket.stub :open, tcp_socket_open_wrapped do
          conn = create_connection
          conn.post("/echo", :foo => "bar")
          conn.proxy = URI(ENV["LIVE_PROXY"])
          conn.post("/echo", :foo => "bar")
        end

        assert_equal 2, sockets.count
      end
    end

    def test_without_custom_connection_config
      url = URI('https://example.com:1234')

      adapter = Faraday::Adapter::NetHttpPersistent.new

      http = adapter.send(:net_http_connection, :url => url, :request => {})

      # `pool` is only present in net_http_persistent >= 3.0
      assert http.pool.size != nil if http.respond_to?(:pool)
    end

    def test_custom_connection_config
      url = URI('https://example.com:1234')

      adapter = Faraday::Adapter::NetHttpPersistent.new(nil, {pool_size: 5})

      http = adapter.send(:net_http_connection, :url => url, :request => {})

      # `pool` is only present in net_http_persistent >= 3.0
      assert_equal 5, http.pool.size if http.respond_to?(:pool)
    end

    def test_custom_adapter_config
      url = URI('https://example.com:1234')

      adapter = Faraday::Adapter::NetHttpPersistent.new do |http|
        http.idle_timeout = 123
      end

      http = adapter.send(:net_http_connection, :url => url, :request => {})
      adapter.send(:configure_request, http, {})

      assert_equal 123, http.idle_timeout
    end

    def test_max_retries
      url = URI('http://example.com')

      adapter = Faraday::Adapter::NetHttpPersistent.new

      http = adapter.send(:net_http_connection, :url => url, :request => {})
      adapter.send(:configure_request, http, {})

      # `max_retries=` is only present in Ruby 2.5
      assert_equal 0, http.max_retries if http.respond_to?(:max_retries=)
    end
  end
end
