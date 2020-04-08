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
    class LoadBalancerPolicy < Core::Resource

      # @api private
      def initialize load_balancer, name, options = {}
        @load_balancer = load_balancer
        super(load_balancer, options.merge(:name => name.to_s))
      end

      # @return [LoadBalancer] Returns the load balancer this policy belongs to.
      attr_reader :load_balancer

      attribute :name, :static => true, :from => :policy_name

      attribute :type, :static => true, :from => :policy_type_name

      attribute :policy_attribute_descriptions, :static => true

      protected :policy_attribute_descriptions

      populates_from(:describe_load_balancer_policies) do |resp|
        if resp.request_options[:load_balancer_name] == load_balancer.name
          resp.policy_descriptions.find do |desc|
            desc.policy_name == name
          end
        end
      end

      # @return [Hash] Returns a hash of policy attributes.  Keys are
      #   policy attribute names, and values are arrays one or more policy
      #   attribute values.
      def attributes
        attributes = {}
        policy_attribute_descriptions.each do |desc|
          attributes[desc.attribute_name] ||= []
          attributes[desc.attribute_name] << desc.attribute_value
        end
        attributes
      end

      # Deletes this load balancer policy.
      # @return [nil]
      def delete

        client.delete_load_balancer_policy(
          :load_balancer_name => load_balancer.name,
          :policy_name => name)

        nil

      end

      # Useful for determining if a policy with the given name exists:
      #
      #     load_balancer.policies['my-policy-name'].exists?  # => true/false
      #
      # @return [Boolean] Returns true this policy's load balancer has a
      #   policy with this name.
      def exists?
        r = get_resource
        r.policy_descriptions.find{|d| d.policy_name == name } ? true : false
      rescue AWS::ELB::Errors::LoadBalancerNotFound
        false
      end

      protected
      def resource_identifiers
        [[:load_balancer_name, load_balancer.name],[:policy_name, name]]
      end

      protected
      def get_resource attr_name = nil
        client.describe_load_balancer_policies(
          :load_balancer_name => load_balancer.name)
      end

    end
  end
end
