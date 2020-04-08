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
  class EC2

    class CustomerGatewayCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # @param [Integer] bgp_asn The customer gateway's Border Gateway
      #   Protocol (BGP) Autonomous System Number (ASN).
      #
      # @param [String] ip_address The Internet-routable IP address for the
      #   customer gateway's outside interface. The address must be static.
      #
      # @param [Hash] options
      #
      # @option options [String] :vpn_type ('ipsec.1') The type of VPN
      #   connection this customer gateway supports.
      #
      # @return [CustomerGateway]
      #
      def create bgp_asn, ip_address, options = {}

        client_opts = {}
        client_opts[:bgp_asn] = bgp_asn
        client_opts[:public_ip] = ip_address
        client_opts[:type] = options[:vpn_type] || 'ipsec.1'

        resp = client.create_customer_gateway(client_opts)

        CustomerGateway.new_from(:create_customer_gateway,
          resp.customer_gateway,
          resp.customer_gateway.customer_gateway_id,
          :config => config)

      end

      # @param [String] customer_gateway_id
      # @return [CustomerGateway]
      def [] customer_gateway_id
        CustomerGateway.new(customer_gateway_id, :config => config)
      end

      protected

      def _each_item options = {}, &block
        response = filtered_request(:describe_customer_gateways, options, &block)
        response.customer_gateway_set.each do |g|

          gateway = CustomerGateway.new_from(:describe_customer_gateways, g,
            g.customer_gateway_id, :config => config)

          yield(gateway)

        end
      end

    end
  end
end
