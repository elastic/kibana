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

    # Helps manage policies assigned to backend server instnace ports.
    #
    # ## Creating a Backend Server Policy
    #
    # Creating a backend server policy can be a bit tricky.  A
    # BackendServerAuthenticationPolicyType policy only has one
    # attribute, a list of public key policies.
    #
    # Before you can assign a policy to a backend server instance port you
    # must create on of the appropriate type:
    #
    #     # step 1, create one (or more) PublicKeyPolicyType policies
    #
    #     public_key1 = <<-KEY
    #     -----BEGIN CERTIFICATE-----
    #     MIICaTCCAdICCQDuvCF4erLGSjANBgkqhkiG9w0BAQUFADB5MQswCQYDVQQGEwJa
    #     ....
    #     o50MymfqtoVcebZcXbiDVAXW1cPEHKLBXecX6/LZ+GOzEsUOxgt7Xs9uabqp
    #     -----END CERTIFICATE-----
    #     KEY
    #
    #     public_key_policy = load_balancer.policies.create("pkp",
    #       'PublicKeyPolicyType', 'PublicKey' => public_key.strip)
    #
    #     # step 2, create the backend server policy, passing the public key policy
    #
    #     name = 'backend-policy'
    #     type = 'BackendServerAuthenticationPolicyType'
    #     attributes = {
    #       # note: you can pass more than one public key policy here
    #       'PublicKeyPolicyName' => [public_key_policy]
    #     }
    #
    #     backend_policy = @load_balancer.policies.create(name, type, attributes)
    #       'BackendServerAuthenticationPolicyType', attributes)
    #
    # Once you have created a backend server authentication policy, you
    # can assign it to a backend instance port:
    #
    #     load_balancer.backend_server_policies[80] = backend_policy
    #
    # If you want to remove the policy you can pass nil instead.
    #
    #     # removes the policy from instance port 80
    #     load_balancer.backend_server_policies[80] = nil
    #
    # You can also get the current policy:
    #
    #     load_balancer.backend_server_policies[80] # returns a policy or nil
    #
    class BackendServerPolicyCollection

      include Core::Collection::Simple

      def initialize load_balancer, options = {}
        @load_balancer = load_balancer
        super
      end

      # @return [LoadBalancer]
      attr_reader :load_balancer

      # Returns the policy currently assigned to the given instance port.
      #
      # @param [Integer] instance_port The backend server port to
      #   get the currently policy of.
      #
      # @return [LoadBalancerPolicy,nil] Returns the load balancer policy
      #   currently assigned to the given instance port.  Returns nil if
      #   no policy has been assigned.
      #
      def [] instance_port
        enum(:instance_port => instance_port).first
      end

      # Sets the policy for the given backend server instance port.
      #
      # @param [Integer] instance_port The instance port you want to set
      #   backend server policies for.
      #
      # @param [String,LoadBalancerPolicy,nil] policy Load balancer policy
      #   name or object.  Passing nil removes the current policy.
      #
      # @return [nil]
      #
      def []= instance_port, policy

        client.set_load_balancer_policies_for_backend_server(
          :load_balancer_name => load_balancer.name,
          :instance_port => instance_port.to_i,
          :policy_names => [policy_name(policy)].compact)

        nil

      end

      protected
      def policy_name policy
        case policy
        when nil then nil
        when LoadBalancerPolicy then policy.name
        else policy.to_s
        end
      end

      protected
      def _each_item options = {}

        instance_port = options[:instance_port]

        load_balancer.backend_server_descriptions.each do |desc|
          if instance_port.nil? or desc[:instance_port] == instance_port
            desc[:policy_names].each do |policy_name|
              yield(load_balancer.policies[policy_name])
            end
          end
        end

      end

    end
  end
end
