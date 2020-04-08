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

    # Represents a single route in a {RouteTable}.
    #
    #     # enumerating routes within a route table
    #     ec2 = AWS::EC2.new
    #     route_table = ec2.route_tables.first
    #     route_table.routes.each do |route|
    #       # ...
    #     end
    #
    class RouteTable < Resource
      class Route

        def initialize route_table, details

          @route_table = route_table

          if details[:destination_cidr_block]
            @destination_cidr_block = details.destination_cidr_block
          end

          if details[:gateway_id]
            @internet_gateway = InternetGateway.new(
              details[:gateway_id],
              :config => route_table.config)
          end

          if details[:instance_id]
            @instance = Instance.new(details[:instance_id],
              :vpc_id => route_table.vpc_id,
              :owner_id => details[:instance_owner_id],
              :config => route_table.config)
          end

          if details[:network_interface_id]
            @network_interface = NetworkInterface.new(
              details[:network_interface_id],
              :vpc_id => route_table.vpc_id,
              :config => route_table.config)
          end

          @target = (internet_gateway || instance || network_interface)

          @origin = { 'CreateRoute' => :create_route, 'CreateRouteTable' => :create_route_table, 'EnableVgwRoutePropagation' => :enable_vgw_route_propagation }[details.origin]

          @state = details.state.to_sym

        end

        # @return [RouteTable]
        attr_reader :route_table

        # @return [String] destination_cidr_block
        attr_reader :destination_cidr_block

        alias_method :cidr_block, :destination_cidr_block

        # @return [InternetGateway,nil]
        attr_reader :internet_gateway

        # @return [Instance,nil]
        attr_reader :instance

        # @return [NetworkInterface,nil]
        attr_reader :network_interface

        # @return [Gateway,Instance,NetworkInterface] Returns the target
        #   of this route table.  It will be a gateway id, instance or a
        #   network interface.
        attr_reader :target

        # @return [Symbol] Returns the origin (:create_route,
        # :create_route_table or :enable_vgw_route_propagation)
        attr_reader :origin

        # @return [Symbol] Returns the state (:active or :blackhole).
        attr_reader :state

        # @param [Hash] options
        #
        # @option options [Gateway,String] :gateway A gateway (object or
        #   string id) to attach the route to.
        #
        # @option options [Instance,String] :instance An instance (object
        #   or string id) to attach the route to.
        #
        # @option options [NetworkInterface,String] :network_interface
        #   A network interface (object or string id) to attach the route
        #   to.
        #
        # @return [nil]
        #
        def replace options = {}
          route_table.replace_route(destination_cidr_block, options)
        end

        # Deletes this route.
        # @return [nil]
        def delete
          route_table.delete_route(destination_cidr_block)
        end

      end
    end
  end
end
