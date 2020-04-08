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

    class DHCPOptions < Resource

      include TaggedItem

      # @api private
      def initialize dhcp_options_id, options = {}
        @dhcp_options_id = dhcp_options_id
        super
      end

      # @return [String]
      attr_reader :dhcp_options_id

      alias_method :id, :dhcp_options_id

      attribute :dhcp_configuration_set, :static => true

      protected :dhcp_configuration_set

      populates_from(:create_dhcp_options) do |resp|
        resp.dhcp_options if resp.dhcp_options.dhcp_options_id == id
      end

      populates_from(:describe_dhcp_options) do |resp|
        resp.dhcp_options_set.find do |dhcp_options|
          dhcp_options.dhcp_options_id == dhcp_options_id
        end
      end

      # @return [Hash]
      def configuration
        dhcp_configuration_set.to_a.inject({}) do |config,opt|
          key = opt[:key].gsub(/-/, '_').to_sym
          values = opt[:value_set].map{|v| v[:value] }
          values = values.first if key == :domain_name
          values = values.first.to_i if key == :netbios_node_type
          config.merge(key => values)
        end
      end

      # Associates this set of options to the given VPC.
      # @param [VPC,String] vpc A {VPC} object or a vpc id string.
      # @return [nil]
      def associate vpc
        client_opts = {}
        client_opts[:dhcp_options_id] = dhcp_options_id
        client_opts[:vpc_id] = vpc_id_option(vpc)
        client.associate_dhcp_options(client_opts)
        nil
      end

      # Deletes these DHCP options.  An error will be raised if these
      # options are currently associated to a VPC.  To disassociate this
      # set of options from a VPC, associate a different set of options
      # with the VPC.
      #
      # @return [nil]
      #
      def delete
        client_opts = {}
        client_opts[:dhcp_options_id] = dhcp_options_id
        client.delete_dhcp_options(client_opts)
        nil
      end

      # @return [VPCCollection] Returns a collection that represents
      #   all VPCs currently using this dhcp options.
      def vpcs
        vpcs = VPCCollection.new(:config => config)
        vpcs.filter('dhcp-options-id', dhcp_options_id)
      end

      # @return [Boolean] Returns true if the dhcp options exists.
      def exists?
        begin
          get_resource
          true
        rescue Errors::InvalidDhcpOptionID::NotFound
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
