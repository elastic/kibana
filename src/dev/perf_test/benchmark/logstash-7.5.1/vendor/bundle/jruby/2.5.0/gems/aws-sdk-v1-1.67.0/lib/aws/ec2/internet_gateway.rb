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

require 'aws/ec2/internet_gateway/attachment'

module AWS
  class EC2

    class InternetGateway < Resource

      include TaggedItem

      def initialize internet_gateway_id, options = {}
        @internet_gateway_id = internet_gateway_id
        super
      end

      # @return [String]
      attr_reader :internet_gateway_id

      alias_method :id, :internet_gateway_id

      attribute :vpc_id

      attribute :attachment_set

      protected :attachment_set

      populates_from(:describe_internet_gateways) do |resp|
        resp.internet_gateway_set.find do |gateway|
          gateway.internet_gateway_id == internet_gateway_id
        end
      end

      # @return [Array<InternetGateway::Attachment>]
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

      # Attaches this internet gateway to the given VPC.  If this
      # gateway is already attached to a different VPC, it will
      # be detached from that one first.  If you pass nil, then
      # this internet gateway will
      #
      #     internet_gateway.vpc = 'vpc-123'
      #
      # @param [VPC,String] vpc A {VPC} object or a vpc id string.
      #
      def vpc= vpc
        if attachment = attachments.first
          attachment.delete
        end
        attach(vpc) if vpc
      end

      # Attaches this internet gateway to the given VPC.
      # @param [VPC,String] vpc A {VPC} object or a vpc id string.
      # @return [nil]
      def attach vpc
        client_opts = {}
        client_opts[:internet_gateway_id] = internet_gateway_id
        client_opts[:vpc_id] = vpc_id_option(vpc)
        client.attach_internet_gateway(client_opts)
        nil
      end

      # Detaches this internet gateway from the given VPC.
      # @param [VPC,String] vpc A {VPC} object or a vpc id string.
      # @return [nil]
      def detach vpc
        client_opts = {}
        client_opts[:internet_gateway_id] = internet_gateway_id
        client_opts[:vpc_id] = vpc_id_option(vpc)
        client.detach_internet_gateway(client_opts)
        nil
      end

      # Deletes this internet gateway.
      # @return [nil]
      def delete
        client_opts = {}
        client_opts[:internet_gateway_id] = internet_gateway_id
        client.delete_internet_gateway(client_opts)
        nil
      end

      # @return [Boolean] Returns true if the gateway exists.
      def exists?
        begin
          get_resource
          true
        rescue Errors::InvalidInternetGatewayID::NotFound
          false
        end
      end

      protected
      def vpc_id_option vpc
        vpc.is_a?(VPC) ? vpc.vpc_id : vpc
      end

    end
  end
end
