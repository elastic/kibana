module Seahorse
  module Client
    module Plugins

      # @seahorse.client.option [String] :http_proxy
      # @seahorse.client.option [Integer] :http_open_timeout (15)
      # @seahorse.client.option [Integer] :http_read_timeout (60)
      # @seahorse.client.option [Integer] :http_idle_timeout (5)
      # @seahorse.client.option [Float] :http_continue_timeout (1)
      # @seahorse.client.option [Boolean] :http_wire_trace (false)
      # @seahorse.client.option [Logger] :logger (nil)
      # @seahorse.client.option [Boolean] :ssl_verify_peer (true)
      # @seahorse.client.option [String] :ssl_ca_bundle
      # @seahorse.client.option [String] :ssl_ca_directory
      # @seahorse.client.option [String] :ssl_ca_store
      class NetHttp < Plugin

        Client::NetHttp::ConnectionPool::OPTIONS.each_pair do |name, default|
          option(name, default)
        end

        handler(Client::NetHttp::Handler, step: :send)

      end
    end
  end
end
