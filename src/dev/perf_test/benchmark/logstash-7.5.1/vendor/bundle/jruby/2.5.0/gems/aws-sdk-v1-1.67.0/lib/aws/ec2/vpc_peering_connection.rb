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

    class VPCPeeringConnection < Resource

      include TaggedItem

      # @api private
      def initialize vpc_peering_connection_id, options = {}
        @vpc_peering_connection_id = vpc_peering_connection_id
        super
      end
      
      attr_reader :vpc_peering_connection_id

      alias_method :id, :vpc_peering_connection_id
      
      # Accept a requested VPC peering connection
      def accept
        client_opts = {}
        client_opts[:vpc_peering_connection_id] = vpc_peering_connection_id
        resp = client.accept_vpc_peering_connection(client_opts)
      end
      
      # Deletes this VPC peering connection.
      # @return [nil]
      def delete
        client_opts = {}
        client_opts[:vpc_peering_connection_id] = vpc_peering_connection_id
        client.delete_vpc_peering_connection(client_opts)
        nil
      end

    end
  end
end
