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
    class RouteTable < Resource

      # Represents the association between a {RouteTable} and a {Subnet}.
      #
      # You can get a route table association 2 ways:
      #
      # * enumerating associations from a route table
      # * Asking a subnet for its route table association
      #
      # ## Enumerating Associations
      #
      # Given a route table:
      #
      #     route_table.associations.each do |assoc|
      #       if assoc.main? # main association does not have a subnet
      #         puts "#{assoc.id} : main association"
      #       else
      #         puts "#{assoc.id} : #{assoc.subnet.id}"
      #       end
      #     end
      #
      # ## Getting a Subnet Route Table Association
      #
      # All subnets are associated with a route table.  If the association
      # was never explicitly created, then they are associated by default
      # with the main route table.
      #
      #     subnet.route_table_association #=> AWS::EC2::RouteTable::Association
      #
      #     subnet.route_table_association.main? #=> true/false
      #
      # ## Creating and Replacing a Route Table Association
      #
      # To replace a route table association start at the subnet end:
      #
      #     subnet.route_table = some_other_route_table
      #
      # If this route table is associated (by default) to the main route
      # table via the main (default) association a new association is created.
      # If it was previously associated directly to a different route table
      # then that association will be repalced.
      #
      # ## Deleting an Association
      #
      # You can delete all but the main route table association.  When you
      # delete an association, the subnet becomes associated with the
      # main route table.
      #
      #     # delete all explicit route table associations -- as a result
      #     # all subnets will default to the main route table
      #     vpc.subnets.each do |subnet|
      #       assoc = subnet.route_table_association
      #       assoc.delete unless assoc.main?
      #     end
      #
      class Association

        # @api private
        def initialize route_table, association_id, subnet_id
          @route_table = route_table
          @association_id = association_id
          if subnet_id
            @main = false
            @subnet = Subnet.new(subnet_id,
              :config => route_table.config)
          else
            @main = true
          end
        end

        # @return [String] An identifier representing the association
        #   between the network ACL and subnet.
        attr_reader :association_id

        alias_method :id, :association_id

        # @return [RouteTable]
        attr_reader :route_table

        # @return [Subnet,nil] Returns the subnet this association belongs.
        #   If this is the main (default) association, then this method
        #   returns nil.
        attr_reader :subnet

        # @return [Boolean] Returns true if this association is the main
        #   (default) association for all subnets within this route table's
        #   VPC.
        attr_reader :main

        alias_method :main?, :main

        # Deletes the association between the route table and the subnet
        # @return [nil]
        def delete
          route_table.client.disassociate_route_table(
            :association_id => association_id)
          nil
        end
        alias_method :disassociate, :delete

      end
    end
  end
end
