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

require 'aws/ec2/vpn_connection/telemetry'

module AWS
  class EC2

    # @attr_reader [Symbol] state
    #
    # @attr_reader [String] vpn_type
    #
    # @attr_reader [String] vpn_gateway_id
    #
    # @attr_reader [String] customer_gateway_id
    #
    # @attr_reader [String] customer_gateway_configuration
    #   Configuration XML for the VPN connection's customer gateway This
    #   attribute is always present after creating a vpn connection while
    #   the connection state is :pending or :available.
    #
    class VPNConnection < Resource

      include TaggedItem

      # @api private
      def initialize vpn_connection_id, options = {}
        @vpn_connection_id = vpn_connection_id
        super
      end

      # @return [String]
      attr_reader :vpn_connection_id

      alias_method :id, :vpn_connection_id

      attribute :state, :to_sym => true

      attribute :vpn_type, :static => true

      attribute :vpn_gateway_id, :static => true

      attribute :customer_gateway_id, :static => true

      attribute :customer_gateway_configuration, :static => true

      attribute :vgw_telemetry_details, :from => :vgw_telemetry

      protected :vgw_telemetry_details

      populates_from(:create_vpn_connection) do |resp|
        resp.vpn_connection if resp.vpn_connection.vpn_connection_id == id
      end

      populates_from(:describe_vpn_connections) do |resp|
        resp.vpn_connection_set.find do |vpn_connection|
          vpn_connection.vpn_connection_id == vpn_connection_id
        end
      end

      # @return [VPNGateway]
      def vpn_gateway
        VPNGateway.new(vpn_gateway_id, :config => config)
      end

      # @return [CustomerGateway]
      def customer_gateway
        CustomerGateway.new(customer_gateway_id, :config => config)
      end

      # @return [Array<Telemetry>]
      def vgw_telemetry
        vgw_telemetry_details.collect do |details|
          Telemetry.new(self, details)
        end
      end

      # Deletes this vpn connection.
      # @return [nil]
      def delete
        client_opts = {}
        client_opts[:vpn_connection_id] = vpn_connection_id
        client.delete_vpn_connection(client_opts)
        nil
      end

    end
  end
end
