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

    class LoadBalancerPolicyCollection

      include Core::Collection::Simple

      def initialize load_balancer, options = {}
        @load_balancer = load_balancer
        super
      end

      attr_reader :load_balancer

      # Creates a new load balancer policy that contains the necessary
      # attributes depending on the policy type. Policies are settings
      # that are saved for your load balancer and that can be applied to
      # the front-end listener, or the back-end application server,
      # depending on your policy type.
      #
      # ## Applying Policies
      #
      # To apply a policy to a front-end listener:
      #
      #     # each listener may only have a single policy
      #     load_balancer.listener[80].policy = listener_policy
      #
      # To apply a policy to backend instance port
      #
      #     # back end servers can have multiple policies per instance port
      #     load_balancer.backend_server_policies.add(80, back_end_policy)
      #
      # @param [String] name The name of the policy being created.  The name
      #   must be unique within the set of policies for this load balancer.
      #
      # @param [String] type The policy type name.  Valid values inlucde:
      #
      #   * 'PublicKeyPolicyType'
      #   * 'AppCookieStickinessPolicyType'
      #   * 'LBCookieStickinessPolicyType'
      #   * 'SSLNegotiationPolicyType'
      #   * 'BackendServerAuthenticationPolicyType'
      #
      # @param [Hash] attributes A hash of policy attributes.  Each policy
      #   type accepts a different list of hash options.  Below each
      #   policy type name is listed with its list of accepted options.
      #   Attributes that accept more than one value should be provided
      #   as an array of values.
      #
      #   Hash keys should be attribute names, values may be single
      #   values or arrays of values.
      #
      #   PublicKeyPolicyType
      #
      #     Policy containing a list of public keys to accept when authenticating the back-end server(s). This policy cannot be applied directly to back-end servers or listeners but must be part of a BackendServerAuthenticationPolicyType.
      #
      #     * 'PublicKey', String, one
      #
      #   AppCookieStickinessPolicyType
      #
      #     Stickiness policy with session lifetimes controlled by the lifetime of the application-generated cookie. This policy can be associated only with HTTP/HTTPS listeners.
      #
      #     * 'CookieName', String, one
      #
      #   LBCookieStickinessPolicyType
      #
      #     Stickiness policy with session lifetimes controlled by the browser (user-agent) or a specified expiration period. This policy can be associated only with HTTP/HTTPS listeners.
      #
      #     * 'CookieExpirationPeriod', Long, zero or one
      #
      #   SSLNegotiationPolicyType
      #
      #     Listener policy that defines the ciphers and protocols that will be accepted by the load balancer. This policy can be associated only with HTTPS/SSL listeners.
      #
      #     * 'Protocol-SSLv2', Boolean, zero or one
      #     * 'Protocol-TLSv1', Boolean, zero or one
      #     * 'Protocol-SSLv3', Boolean, zero or one
      #     * 'DHE-RSA-AES256-SHA', Boolean, zero or one
      #     * 'DHE-DSS-AES256-SHA', Boolean, zero or one
      #     * 'DHE-RSA-CAMELLIA256-SHA', Boolean, zero or one
      #     * 'DHE-DSS-CAMELLIA256-SHA', Boolean, zero or one
      #     * 'ADH-AES256-SHA', Boolean, zero or one
      #     * 'ADH-CAMELLIA256-SHA', Boolean, zero or one
      #     * 'AES256-SHA', Boolean, zero or one
      #     * 'CAMELLIA256-SHA', Boolean, zero or one
      #     * 'PSK-AES256-CBC-SHA', Boolean, zero or one
      #     * 'EDH-RSA-DES-CBC3-SHA', Boolean, zero or one
      #     * 'EDH-DSS-DES-CBC3-SHA', Boolean, zero or one
      #     * 'ADH-DES-CBC3-SHA', Boolean, zero or one
      #     * 'DES-CBC3-SHA', Boolean, zero or one
      #     * 'DES-CBC3-MD5', Boolean, zero or one
      #     * 'PSK-3DES-EDE-CBC-SHA', Boolean, zero or one
      #     * 'KRB5-DES-CBC3-SHA', Boolean, zero or one
      #     * 'KRB5-DES-CBC3-MD5', Boolean, zero or one
      #     * 'DHE-RSA-AES128-SHA', Boolean, zero or one
      #     * 'DHE-DSS-AES128-SHA', Boolean, zero or one
      #     * 'DHE-RSA-SEED-SHA', Boolean, zero or one
      #     * 'DHE-DSS-SEED-SHA', Boolean, zero or one
      #     * 'DHE-RSA-CAMELLIA128-SHA', Boolean, zero or one
      #     * 'DHE-DSS-CAMELLIA128-SHA', Boolean, zero or one
      #     * 'ADH-AES128-SHA', Boolean, zero or one
      #     * 'ADH-SEED-SHA', Boolean, zero or one
      #     * 'ADH-CAMELLIA128-SHA', Boolean, zero or one
      #     * 'AES128-SHA', Boolean, zero or one
      #     * 'SEED-SHA', Boolean, zero or one
      #     * 'CAMELLIA128-SHA', Boolean, zero or one
      #     * 'RC2-CBC-MD5', Boolean, zero or one
      #     * 'PSK-AES128-CBC-SHA', Boolean, zero or one
      #     * 'ADH-RC4-MD5', Boolean, zero or one
      #     * 'IDEA-CBC-SHA', Boolean, zero or one
      #     * 'RC4-SHA', Boolean, zero or one
      #     * 'RC4-MD5', Boolean, zero or one
      #     * 'PSK-RC4-SHA', Boolean, zero or one
      #     * 'KRB5-RC4-SHA', Boolean, zero or one
      #     * 'KRB5-RC4-MD5', Boolean, zero or one
      #     * 'EDH-RSA-DES-CBC-SHA', Boolean, zero or one
      #     * 'EDH-DSS-DES-CBC-SHA', Boolean, zero or one
      #     * 'ADH-DES-CBC-SHA', Boolean, zero or one
      #     * 'DES-CBC-SHA', Boolean, zero or one
      #     * 'DES-CBC-MD5', Boolean, zero or one
      #     * 'KRB5-DES-CBC-SHA', Boolean, zero or one
      #     * 'KRB5-DES-CBC-MD5', Boolean, zero or one
      #     * 'EXP-EDH-RSA-DES-CBC-SHA', Boolean, zero or one
      #     * 'EXP-EDH-DSS-DES-CBC-SHA', Boolean, zero or one
      #     * 'EXP-ADH-DES-CBC-SHA', Boolean, zero or one
      #     * 'EXP-DES-CBC-SHA', Boolean, zero or one
      #     * 'EXP-RC2-CBC-MD5', Boolean, zero or one
      #     * 'EXP-KRB5-RC2-CBC-SHA', Boolean, zero or one
      #     * 'EXP-KRB5-DES-CBC-SHA', Boolean, zero or one
      #     * 'EXP-KRB5-RC2-CBC-MD5', Boolean, zero or one
      #     * 'EXP-KRB5-DES-CBC-MD5', Boolean, zero or one
      #     * 'EXP-ADH-RC4-MD5', Boolean, zero or one
      #     * 'EXP-RC4-MD5', Boolean, zero or one
      #     * 'EXP-KRB5-RC4-SHA', Boolean, zero or one
      #     * 'EXP-KRB5-RC4-MD5', Boolean, zero or one
      #
      #   BackendServerAuthenticationPolicyType
      #
      #     Policy that controls authentication to back-end server(s) and contains one or more policies, such as an instance of a PublicKeyPolicyType. This policy can be associated only with back-end servers that are using HTTPS/SSL.
      #
      #     * 'PublicKeyPolicyName', PolicyName, one or more
      #
      # @return [nil]
      #
      def create name, type, attributes = {}

        attribute_list = []

        attributes.each do |attr_name,values|
          [values].flatten.each do |value|
            attribute_list << {
              :attribute_name => attr_name,
              :attribute_value => value.to_s
            }
          end
        end

        client.create_load_balancer_policy(
          :load_balancer_name => load_balancer.name,
          :policy_name => name.to_s,
          :policy_type_name => type.to_s,
          :policy_attributes => attribute_list)

        LoadBalancerPolicy.new(load_balancer, name, :type => type.to_s)

      end

      # @param [String] policy_name The name of the policy to return.
      # @return [LoadBalancerPolicy] Returns a reference to the load balancer
      #   policy with the given name.
      def [] policy_name
        LoadBalancerPolicy.new(load_balancer, policy_name)
      end

      protected
      def _each_item options = {}, &block

        options[:load_balancer_name] = load_balancer.name

        response = client.describe_load_balancer_policies(options)
        response.policy_descriptions.each do |desc|

          load_balancer_policy = LoadBalancerPolicy.new_from(
            :describe_load_balancer_policies,
            desc, load_balancer, desc.policy_name)

          yield(load_balancer_policy)

        end

      end

    end
  end
end
