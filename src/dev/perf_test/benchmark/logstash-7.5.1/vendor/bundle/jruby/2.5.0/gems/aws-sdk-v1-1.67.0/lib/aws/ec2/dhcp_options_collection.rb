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

    class DHCPOptionsCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # @param [Hash] options
      #
      # @option options [required,String] :domain_name A domain name of your
      #   choice (e.g., example.com).
      #
      # @option options [Array<String>] :domain_name_servers
      #   The IP addresses of domain name servers. You can specify up to
      #   four addresses.
      #
      # @option options [Array<String>] :ntp_servers
      #   The IP addresses of Network Time Protocol (NTP) servers. You can
      #   specify up to four addresses.
      #
      # @option options [Array<String>] :netbios_name_servers
      #   The IP addresses of NetBIOS name servers. You can specify up to
      #   four addresses.
      #
      # @option options [String] :netbios_node_type Value indicating the
      #   NetBIOS node type (1, 2, 4, or 8). For more information about the
      #   values, go to RFC 2132. We recommend you only use 2 at this time
      #   (broadcast and multicast are currently not supported).
      #
      def create options = {}

        configurations = []
        options.each_pair do |opt,values|
          opt = opt.to_s.gsub(/_/, '-')
          values = values.is_a?(Array) ? values : [values]
          configurations << { :key => opt, :values => values.map(&:to_s) }
        end

        client_opts = {}
        client_opts[:dhcp_configurations] = configurations

        resp = client.create_dhcp_options(client_opts)

        DHCPOptions.new_from(:create_dhcp_options,
          resp.dhcp_options,
          resp.dhcp_options.dhcp_options_id,
          :config => config)

      end

      # @param [String] dhcp_options_id
      # @return [DHCPOptions]
      def [] dhcp_options_id
        DHCPOptions.new(dhcp_options_id, :config => config)
      end

      protected

      def _each_item options = {}, &block
        response = filtered_request(:describe_dhcp_options, options, &block)
        response.dhcp_options_set.each do |opts|

          options = DHCPOptions.new_from(:describe_dhcp_options, opts,
            opts.dhcp_options_id, :config => config)

          yield(options)

        end
      end

    end
  end
end
