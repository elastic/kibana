# frozen_string_literal: true

require_relative '../errors'
require_relative 'node_key'
require 'uri'

class Redis
  class Cluster
    # Keep options for Redis Cluster Client
    class Option
      DEFAULT_SCHEME = 'redis'
      SECURE_SCHEME = 'rediss'
      VALID_SCHEMES = [DEFAULT_SCHEME, SECURE_SCHEME].freeze

      def initialize(options)
        options = options.dup
        node_addrs = options.delete(:cluster)
        @node_uris = build_node_uris(node_addrs)
        @replica = options.delete(:replica) == true
        @options = options
      end

      def per_node_key
        @node_uris.map { |uri| [NodeKey.build_from_uri(uri), @options.merge(url: uri.to_s)] }
                  .to_h
      end

      def secure?
        @node_uris.any? { |uri| uri.scheme == SECURE_SCHEME } || @options[:ssl_params] || false
      end

      def use_replica?
        @replica
      end

      def update_node(addrs)
        @node_uris = build_node_uris(addrs)
      end

      def add_node(host, port)
        @node_uris << parse_node_hash(host: host, port: port)
      end

      private

      def build_node_uris(addrs)
        raise InvalidClientOptionError, 'Redis option of `cluster` must be an Array' unless addrs.is_a?(Array)
        addrs.map { |addr| parse_node_addr(addr) }
      end

      def parse_node_addr(addr)
        case addr
        when String
          parse_node_url(addr)
        when Hash
          parse_node_hash(addr)
        else
          raise InvalidClientOptionError, 'Redis option of `cluster` must includes String or Hash'
        end
      end

      def parse_node_url(addr)
        uri = URI(addr)
        raise InvalidClientOptionError, "Invalid uri scheme #{addr}" unless VALID_SCHEMES.include?(uri.scheme)
        uri
      rescue URI::InvalidURIError => err
        raise InvalidClientOptionError, err.message
      end

      def parse_node_hash(addr)
        addr = addr.map { |k, v| [k.to_sym, v] }.to_h
        raise InvalidClientOptionError, 'Redis option of `cluster` must includes `:host` and `:port` keys' if addr.values_at(:host, :port).any?(&:nil?)
        URI::Generic.build(scheme: DEFAULT_SCHEME, host: addr[:host], port: addr[:port].to_i)
      end
    end
  end
end
