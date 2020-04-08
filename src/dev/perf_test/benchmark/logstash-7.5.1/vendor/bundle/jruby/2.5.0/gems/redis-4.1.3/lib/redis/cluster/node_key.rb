# frozen_string_literal: true

class Redis
  class Cluster
    # Node key's format is `<ip>:<port>`.
    # It is different from node id.
    # Node id is internal identifying code in Redis Cluster.
    module NodeKey
      DEFAULT_SCHEME = 'redis'
      SECURE_SCHEME = 'rediss'
      DELIMITER = ':'

      module_function

      def to_node_urls(node_keys, secure:)
        scheme = secure ? SECURE_SCHEME : DEFAULT_SCHEME
        node_keys
          .map { |k| k.split(DELIMITER) }
          .map { |k| URI::Generic.build(scheme: scheme, host: k[0], port: k[1].to_i).to_s }
      end

      def split(node_key)
        node_key.split(DELIMITER)
      end

      def build_from_uri(uri)
        "#{uri.host}#{DELIMITER}#{uri.port}"
      end

      def build_from_host_port(host, port)
        "#{host}#{DELIMITER}#{port}"
      end
    end
  end
end
