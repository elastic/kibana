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
    class NetworkInterfaceCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # Creates a network interface.
      #
      # @param [Hash] options
      #
      # @option options [Subnet,String] :subnet The subnet or subnet id
      #   to associate with the network interface.
      #
      # @option options [String] :private_ip_address The private IP address
      #   of the network interface.
      #
      # @option options [String] :description The description of the
      #   network interface.
      #
      # @option options [Array<SecurityGroup>,Array<String>] :security_groups
      #   A list of security groups (or security group id strings) that
      #   should be used by this network interface.
      #
      # @return [NetworkInterface]
      #
      def create options = {}

        client_opts = {}

        client_opts[:subnet_id] = subnet_id_option(options)

        client_opts[:private_ip_address] = options[:private_ip_address] if
          options.key?(:private_ip_address)

        client_opts[:description] = options[:description] if
          options.key?(:description)

        groups = groups_options(options)
        client_opts[:groups] = groups if groups

        resp = client.create_network_interface(client_opts)

        NetworkInterface.new_from(:create_network_interface,
          resp.network_interface,
          resp.network_interface.network_interface_id,
          :config => config)

      end

      # @param [String] network_interface_id
      # @return [NetworkInterface]
      def [] network_interface_id
        NetworkInterface.new(network_interface_id, :config => config)
      end

      protected
      def groups_options options

        # accept this option a variety of different ways
        groups = options[:security_groups]
        groups ||= options[:security_group_ids]
        groups ||= options[:security_group]
        groups ||= options[:security_group_id]

        if groups
          [groups].flatten.map{|sg| sg.is_a?(SecurityGroup) ? sg.id : sg }
        else
          nil
        end

      end

      protected
      def _each_item options = {}, &block
        resp = filtered_request(:describe_network_interfaces, options, &block)
        resp.network_interface_set.each do |n|

          network_interface = NetworkInterface.new_from(
            :describe_network_interfaces, n,
            n.network_interface_id, :config => config)

          yield(network_interface)

        end
      end

    end
  end
end
