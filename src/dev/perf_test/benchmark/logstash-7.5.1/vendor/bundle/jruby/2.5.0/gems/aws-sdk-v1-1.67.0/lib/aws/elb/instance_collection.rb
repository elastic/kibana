# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

module AWS
  class ELB

    class InstanceCollection

      include Core::Collection::Simple

      def initialize load_balancer, options = {}
        @load_balancer = load_balancer
        super
      end

      # Returns an {EC2::Instance} object with 3 extra methods added:
      #
      # * `#load_balancer`
      # * `#remove_from_load_balancer`
      # * `#elb_health`
      #
      # See {#health} for more information about what `#elb_health` returns.
      #
      # @return [EC2::Instance] Return an EC2::Instance object with additional
      #   methods added.
      #
      def [] instance_id

        load_balancer = self.load_balancer

        instance = EC2.new(:config => config).instances[instance_id]

        Core::MetaUtils.extend_method(instance, :load_balancer) do
          load_balancer
        end

        Core::MetaUtils.extend_method(instance, :elb_health) do
          health = load_balancer.instances.health(id).first
          health.delete(:instance)
          health
        end

        Core::MetaUtils.extend_method(instance, :remove_from_load_balancer) do
          load_balancer.instances.deregister(self)
        end

        instance

      end

      # Returns an array of instance health descriptions.  Each description
      # is a hash with the following entries:
      #
      #   * `:instance` - The {EC2::Instance} being described.
      #   * `:description` - Provides a description of the instance.
      #   * `:state` - Specifies the current state of the instance.
      #   * `:reason_code` - Provides information about the cause of
      #     OutOfService instances. Specifically, it indicates whether the
      #     cause is Elastic Load Balancing or the instance behind the
      #     load balancer.
      #
      # You can get the health of all instances for this load balancer
      # by passing no arguments to this method:
      #
      #     # get the health of all instances in the collection
      #     load_balancer.instances.health.each do |instance_health|
      #        puts "Instance: "    + instance_health[:instance].id
      #        puts "description: " + instance_health[:description]
      #        puts "state: "       + instance_health[:state]
      #        puts "reason code: " + instance_health[:reason_code]
      #     end
      #
      # If you want the health of a specific list of instances, pass
      # instance ids or instance objects to this method:
      #
      #     # get the health for a few specific instances
      #     load_balancer.instances.health('i-12345', 'i-67890').each{|h| ... }
      #
      # ## Health for a Single Instance
      #
      # If you want the health of a single instance you can use the {#[]}
      # instead:
      #
      #     load_balancer.instances['i-123456'].elb_health
      #     # => { :state => ..., :reason_code => ..., :description => ... }
      #
      # @param [String,EC2::Instance] instances A list of instances to
      #   receive health information for.
      #
      # @return [Array<Hash>] Returns an array of hashes.  Each hash represents
      #   the health of a single instance.  Each hash includes the following
      #   entries:
      #
      def health *instances

        instance_ids = instance_ids(instances)

        opts = {}
        opts[:load_balancer_name] = load_balancer.name
        opts[:instances] = instance_ids unless instance_ids.empty?

        client.describe_instance_health(opts).instance_states.map do |state|
          {
            :instance => self[state.instance_id],
            :description => state.description,
            :state => state.state,
            :reason_code => state.reason_code,
          }
        end

      end

      # @return [LoadBalancer] Returns the load balancer this collection
      #   belongs to.
      attr_reader :load_balancer

      def register *instances

        client.register_instances_with_load_balancer(
          :load_balancer_name => load_balancer.name,
          :instances => instance_ids(instances))

        nil

      end
      alias_method :add, :register

      def deregister *instances

        client.deregister_instances_from_load_balancer(
          :load_balancer_name => load_balancer.name,
          :instances => instance_ids(instances))

        nil

      end
      alias_method :remove, :deregister

      protected
      def instance_ids instances
        instances.flatten.collect do |instance|
          case instance
          when EC2::Instance then { :instance_id => instance.id }
          else { :instance_id => instance }
          end
        end
      end

      protected
      def _each_item options = {}
        load_balancer.instance_descriptions.each do |instance|
          yield(self[instance[:instance_id]])
        end
      end

    end
  end
end
