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

    # @attr_reader [Symbol] state Returns the gateway state (e.g.
    #   :pending, :available, :deleting, :deleted)
    #
    # @attr_reader [String] type The type of VPN connection the customer
    #   gateway supports (e.g. 'ipsec.1').
    #
    # @attr_reader [String] ip_address The Internet-routable IP address of
    #   the customer gateway's outside interface.
    #
    # @attr_reader [Integer] bgp_asn The customer gateway's Border Gateway
    #   Protocol (BGP) Autonomous System Number (ASN).
    #
    class CustomerGateway < Resource

      include TaggedItem

      # @api private
      def initialize customer_gateway_id, options = {}
        @customer_gateway_id = customer_gateway_id
        super
      end

      # @return [String]
      attr_reader :customer_gateway_id

      alias_method :id, :customer_gateway_id

      attribute :state, :to_sym => true

      attribute :vpn_type, :static => true

      attribute :ip_address, :static => true

      attribute :bgp_asn, :static => true

      populates_from(:create_customer_gateway) do |resp|
        resp.customer_gateway if resp.customer_gateway.customer_gateway_id == id
      end

      populates_from(:describe_customer_gateways) do |resp|
        resp.customer_gateway_set.find do |gateway|
          gateway.customer_gateway_id == customer_gateway_id
        end
      end

      # @return [VPNConnectionCollection] Returns a collection
      #   of VPC connections for this gateway.
      def vpn_connections
        connections = VPNConnectionCollection.new(:config => config)
        connections.filter('customer-gateway-id', id)
      end

      # Deletes this customer gateway.
      # @return [nil]
      def delete
        client_opts = {}
        client_opts[:customer_gateway_id] = customer_gateway_id
        client.delete_customer_gateway(client_opts)
        nil
      end

      # @return [Boolean] Returns true if the gateway exists.
      def exists?
        begin
          client.describe_customer_gateways(:customer_gateway_ids => [id])
          true
        rescue Errors::InvalidCustomerGatewayID::NotFound
          false
        end
      end

    end
  end
end
