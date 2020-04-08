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

    class NetworkACLCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # Creates a network ACL.
      #
      # @param [Hash] options
      #
      # @option options [VPC,String] :vpc The vpc or vpc id of where you want
      #   to create the subnet.
      #
      # @return [NetworkACL]
      #
      def create options = {}

        client_opts = {}
        client_opts[:vpc_id] = vpc_id_option(options)

        resp = client.create_network_acl(client_opts)

        NetworkACL.new_from(:create_network_acl, resp.network_acl,
          resp.network_acl.network_acl_id, :config => config)

      end

      # @param [String] network_acl_id
      # @return [NetworkACL]
      def [] network_acl_id
        NetworkACL.new(network_acl_id, :config => config)
      end

      protected
      def _each_item options = {}, &block
        response = filtered_request(:describe_network_acls, options, &block)
        response.network_acl_set.each do |a|

          network_acl = NetworkACL.new_from(:describe_network_acls, a,
            a.network_acl_id, :config => config)

          yield(network_acl)

        end
      end

    end
  end
end
