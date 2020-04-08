# frozen_string_literal: true

require 'set'

class Redis
  class Cluster
    # Keep slot and node key map for Redis Cluster Client
    class Slot
      ROLE_SLAVE = 'slave'

      def initialize(available_slots, node_flags = {}, with_replica = false)
        @with_replica = with_replica
        @node_flags = node_flags
        @map = build_slot_node_key_map(available_slots)
      end

      def exists?(slot)
        @map.key?(slot)
      end

      def find_node_key_of_master(slot)
        return nil unless exists?(slot)

        @map[slot][:master]
      end

      def find_node_key_of_slave(slot)
        return nil unless exists?(slot)
        return find_node_key_of_master(slot) if replica_disabled?

        @map[slot][:slaves].to_a.sample
      end

      def put(slot, node_key)
        assign_node_key(@map, slot, node_key)
        nil
      end

      private

      def replica_disabled?
        !@with_replica
      end

      def master?(node_key)
        !slave?(node_key)
      end

      def slave?(node_key)
        @node_flags[node_key] == ROLE_SLAVE
      end

      def build_slot_node_key_map(available_slots)
        available_slots.each_with_object({}) do |(node_key, slots), acc|
          slots.each { |slot| assign_node_key(acc, slot, node_key) }
        end
      end

      def assign_node_key(mappings, slot, node_key)
        mappings[slot] ||= { master: nil, slaves: ::Set.new }
        if master?(node_key)
          mappings[slot][:master] = node_key
        else
          mappings[slot][:slaves].add(node_key)
        end
      end
    end
  end
end
