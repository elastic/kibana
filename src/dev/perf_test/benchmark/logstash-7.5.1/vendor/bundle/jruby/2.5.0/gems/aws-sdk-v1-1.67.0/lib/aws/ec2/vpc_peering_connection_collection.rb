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

    class VPCPeeringConnectionCollection < Collection
      include TaggedCollection
      include Core::Collection::Simple

      # Requests a new VPC peering connection between the "local" VPC and
      # the "remote" VPC
      def create local_vpc, remote_vpc, options = {}
        client_opts = {}
        client_opts[:vpc_id] = local_vpc.id
        client_opts[:peer_vpc_id] = remote_vpc.id
        
        resp = client.create_vpc_peering_connection(client_opts)
        VPCPeeringConnection.new_from(:create_vpc_peering_connection, resp.vpc_peering_connection, resp.vpc_peering_connection.vpc_peering_connection_id, :config => config)
      end

      #  Returns a reference to the VPC peering connection with the given id.
      #
      #     vpc_peering_connection = vpc.peering_connections['vpc-peering-connection-id']
      #
      # @param [String] vpc_peering_connection_id
      #
      # @return [VPCPeeringConnection]
      #
      def [] vpc_peering_connection_id
        VPCPeeringConnection.new(vpc_peering_connection_id, :config => config)
      end

      protected

      def _each_item options = {}, &block
        response = filtered_request(:describe_vpc_peering_connections, options, &block)
        response.vpc_peering_connection_set.each do |c|

          vpc_peering_connection = VPCPeeringConnection.new_from(:describe_vpc_peering_connections,
            c, c.vpc_peering_connection_id, :config => config)

          yield(vpc_peering_connection)

        end
      end
    end
  end
end
