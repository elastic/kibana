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

    class VPNConnectionCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # Creates a new VPN connection between an existing virtual private
      # gateway and a VPN customer gateway.
      #
      # @param [Hash] options
      #
      # @option options [CustomerGateway,String] :customer_gateway
      #   The {CustomerGateway} object or customer gateway id string.
      #
      # @option options [VPNGateway,String] :vpn_gateway
      #   The {VPNGateway} object or vpn gateway id string.
      #
      # @option options [String] :vpn_type ('ipsec.1')
      #   The type of VPN connection.
      #
      # @return [VPNConnection]
      #
      def create options = {}

        client_opts = {}
        client_opts[:customer_gateway_id] = customer_gateway_id(options)
        client_opts[:vpn_gateway_id] = vpn_gateway_id(options)
        client_opts[:type] = options[:vpn_type] || 'ipsec.1'

        resp = client.create_vpn_connection(client_opts)

        VPNConnection.new_from(:create_vpn_connection, resp,
          resp.vpn_connection.vpn_connection_id, :config => config)

      end

      # Returns a reference to the VPN connection with the given id.
      #
      #     vpn_connection = ec2.vpn_connections['vpn-connection-id']
      #
      # @param [String] vpn_connection_id
      #
      # @return [VPNConnection]
      #
      def [] vpn_connection_id
        VPNConnection.new(vpn_connection_id, :config => config)
      end

      protected

      def _each_item options = {}, &block
        response = filtered_request(:describe_vpn_connections, options, &block)
        response.vpn_connection_set.each do |c|

          vpn_connection = VPNConnection.new_from(:describe_vpn_connections,
            c, c.vpn_connection_id, :config => config)

          yield(vpn_connection)

        end
      end

      def customer_gateway_id options
        gateway_id = options.delete(:customer_gateway)
        gateway_id ||= options[:customer_gateway_id]
        gateway_id ||= filter_value_for('customer-gateway-id')
        gateway_id = gateway_id.id if gateway_id.is_a?(CustomerGateway)
        gateway_id
      end

      def vpn_gateway_id options
        gateway_id = options.delete(:vpn_gateway)
        gateway_id ||= options[:vpn_gateway_id]
        gateway_id ||= filter_value_for('vpn-gateway-id')
        gateway_id = gateway_id.id if gateway_id.is_a?(VPNGateway)
        gateway_id
      end

    end
  end
end
