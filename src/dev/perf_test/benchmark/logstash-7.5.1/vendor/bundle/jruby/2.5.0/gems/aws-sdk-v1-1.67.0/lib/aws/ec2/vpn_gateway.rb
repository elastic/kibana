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

require 'aws/ec2/vpn_gateway/attachment'

module AWS
  class EC2

    class VPNGateway < Resource

      include TaggedItem

      def initialize vpn_gateway_id, options = {}
        @vpn_gateway_id = vpn_gateway_id
        super
      end

      # @return [String]
      attr_reader :vpn_gateway_id

      alias_method :id, :vpn_gateway_id

      attribute :state, :to_sym => true

      attribute :vpn_type, :static => true

      attribute :attachment_set, :from => :attachments

      protected :attachment_set

      populates_from(:create_vpn_gateway) do |resp|
        resp.vpn_gateway if resp.vpn_gateway.vpn_gateway_id == id
      end

      populates_from(:describe_vpn_gateways) do |resp|
        resp.vpn_gateway_set.find do |gateway|
          gateway.vpn_gateway_id == vpn_gateway_id
        end
      end

      # @return [Array<VPNGateway::Attachment>]
      def attachments
        attachment_set.map {|details| Attachment.new(self, details) }
      end

      # @return [VPC,nil] Returns the currently attached VPC, or nil
      #   if this gateway has not been attached.
      def vpc
        if attachment = attachments.first
          attachment.vpc
        end
      end

      # Attaches this vpn gateway to the given VPC.
      # @param [VPC,String] vpc A {VPC} object or a vpc id string.
      # @return [Attachment]
      def attach vpc

        client_opts = {}
        client_opts[:vpn_gateway_id] = vpn_gateway_id
        client_opts[:vpc_id] = vpc_id(vpc)

        resp = client.attach_vpn_gateway(client_opts)

        Attachment.new(self, resp.attachment)

      end

      # Detaches this vpn gateway from the given VPC.
      # @param [VPC,String] vpc A {VPC} object or a vpc id string.
      # @return [nil]
      def detach vpc
        client_opts = {}
        client_opts[:vpn_gateway_id] = vpn_gateway_id
        client_opts[:vpc_id] = vpc_id(vpc)
        client.detach_vpn_gateway(client_opts)
        nil
      end

      # @return [VPNConnectionCollection] Returns a collection
      #   of VPC connections for this gateway.
      def vpn_connections
        connections = VPNConnectionCollection.new(:config => config)
        connections.filter('vpn-gateway-id', id)
      end

      # Deletes this vpn gateway.
      # @return [nil]
      def delete
        client_opts = {}
        client_opts[:vpn_gateway_id] = vpn_gateway_id
        client.delete_vpn_gateway(client_opts)
        nil
      end

      # @return [Boolean] Returns true if the gateway exists.
      def exists?
        begin
          client.describe_vpn_gateways(:vpn_gateway_ids => [id])
          true
        rescue Errors::InvalidVPNGatewayID::NotFound
          false
        end
      end

      protected
      def vpc_id vpc
        vpc.is_a?(VPC) ? vpc.vpc_id : vpc
      end

    end
  end
end
