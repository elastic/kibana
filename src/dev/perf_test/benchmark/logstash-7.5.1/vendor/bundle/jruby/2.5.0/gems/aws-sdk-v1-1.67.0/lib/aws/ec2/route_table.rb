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

require 'aws/ec2/route_table/route'
require 'aws/ec2/route_table/association'

module AWS
  class EC2

    class RouteTable < Resource

      include TaggedItem

      def initialize route_table_id, options = {}
        @route_table_id = route_table_id
        super
      end

      # @return [String]
      attr_reader :route_table_id

      alias_method :id, :route_table_id

      attribute :vpc_id, :static => true

      attribute :route_set

      protected :route_set

      attribute :association_set

      protected :association_set

      populates_from(:create_route_table) do |resp|
        resp.route_table if resp.route_table.route_table_id == route_table_id
      end

      populates_from(:describe_route_tables) do |resp|
        resp.route_table_set.find{|t| t.route_table_id == route_table_id }
      end

      # @return [Boolean] Returns true if this is the main (default)
      #   route table.
      def main?
        @main = !!associations.find{|a| a.main? } if @main.nil?
        @main
      end

      # @return [VPC] Returns the VPC this route table belongs to.
      def vpc
        VPC.new(vpc_id, :config => config)
      end

      # @return [Array<Subnet>] Returns an array of subnets ({Subnet})
      #   that currently associated to this route table.
      def subnets

        subnets = associations.map(&:subnet)

        # The default route table has a single association where #subnet
        # returns nil (the main association).  If this is not the main
        # route table we can safely return the subnets.
        return subnets unless subnets.include?(nil)

        subnets.compact!

        # This is the default route table and to get the complete list of
        # subnets we have to find all subnets without an association
        AWS.memoize do

          # every subnet
          all_subnets = vpc.subnets.to_a

          # subnets assigned directly to a route table
          associated_subnets = vpc.route_tables.
            map(&:associations).flatten.
            map(&:subnet).flatten.
            compact

          # subnets NOT assigned to a route table, these default as
          # belonging to the default route table through the "main"
          # association
          unassociated_subnets = all_subnets.inject([]) do |list,subnet|
            unless associated_subnets.include?(subnet)
              list << subnet
            end
            list
          end

          subnets + unassociated_subnets

        end

      end

      # @return [Array<RouteTable::Association>] Returns an array of
      #   {RouteTable::Association} objects (association to subnets).
      def associations
        association_set.collect do |details|
          Association.new(self,
            details[:route_table_association_id],
            details[:subnet_id])
        end
      end

      # @return [Array<Route>] Returns an array of routes ({Route} objects)
      #   belonging to this route table.
      def routes
        route_set.map do |route_details|
          Route.new(self, route_details)
        end
      end

      # Creates a new route in this route route.  The route must be attached
      # to a gateway, instance or network interface.
      #
      # @param [String] destination_cidr_block The CIDR address block
      #   used for the destination match. For example: 0.0.0.0/0.
      #   Routing decisions are based on the most specific match.
      #
      # @param [Hash] options
      #
      # @option options [InternetGateway,String] :internet_gateway
      #   An {InternetGateway} object or an internet gateway id string to
      #   attach the route to.
      #
      # @option options [Instance,String] :instance An {Instance} object
      #   or instance id string to attach the route to.
      #
      # @option options [NetworkInterface,String] :network_interface
      #   A {NetworkInterface} object or network interface id string to
      #   attach the route to.
      #
      # @return [nil]
      #
      def create_route destination_cidr_block, options = {}
        client.create_route(route_options(destination_cidr_block, options))
        nil
      end

      # Replaces an existing route within a route table in a VPC.
      # @param (see #create_route)
      # @option (see #create_route)
      # @return [nil]
      def replace_route destination_cidr_block, options = {}
        client.replace_route(route_options(destination_cidr_block, options))
        nil
      end

      # @param [String] destination_cidr_block The CIDR block address of the
      #   route to delete.
      # @return [nil]
      def delete_route destination_cidr_block
        client.delete_route(route_options(destination_cidr_block))
        nil
      end

      # Deletes this route table.  The route table must not be
      # associated with a subnet. You can't delete the main route table.
      # @return [nil]
      def delete
        client.delete_route_table(:route_table_id => route_table_id)
        nil
      end

      protected

      def route_options destination_cidr_block, options = {}

        client_opts = {}
        client_opts[:route_table_id] = route_table_id
        client_opts[:destination_cidr_block] = destination_cidr_block

        if gateway = options[:internet_gateway]
          gateway = gateway.id if gateway.is_a?(InternetGateway)
          client_opts[:gateway_id] = gateway
        end

        if instance = options[:instance]
          instance = instance.id if instance.is_a?(Instance)
          client_opts[:instance_id] = instance
        end

        if interface = options[:network_interface]
          interface = interface.id if interface.is_a?(NetworkInterface)
          client_opts[:network_interface_id] = interface
        end

        if vpc_peering_connection = options[:vpc_peering_connection]
          vpc_peering_connection = vpc_peering_connection.id if vpc_peering_connection.is_a?(VPCPeeringConnection)
          client_opts[:vpc_peering_connection_id] = vpc_peering_connection
        end

        client_opts

      end

    end
  end
end
