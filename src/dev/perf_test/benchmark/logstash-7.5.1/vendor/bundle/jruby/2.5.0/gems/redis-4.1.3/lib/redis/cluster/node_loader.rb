# frozen_string_literal: true

require_relative '../errors'

class Redis
  class Cluster
    # Load and hashify node info for Redis Cluster Client
    module NodeLoader
      module_function

      def load_flags(nodes)
        info = {}

        nodes.each do |node|
          info = fetch_node_info(node)
          info.empty? ? next : break
        end

        return info unless info.empty?

        raise CannotConnectError, 'Redis client could not connect to any cluster nodes'
      end

      def fetch_node_info(node)
        node.call(%i[cluster nodes])
            .split("\n")
            .map { |str| str.split(' ') }
            .map { |arr| [arr[1].split('@').first, (arr[2].split(',') & %w[master slave]).first] }
            .to_h
      rescue CannotConnectError, ConnectionError, CommandError
        {} # can retry on another node
      end

      private_class_method :fetch_node_info
    end
  end
end
