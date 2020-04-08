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

    # @attr_reader [String] vpc_id
    #
    # @attr_reader [Symbol] state
    #
    # @attr_reader [String] cidr_block
    #
    # @attr_reader [Integer] available_ip_address_count
    #
    # @attr_reader [String] availability_zone_name
    #
    class Subnet < Resource

      include TaggedItem

      def initialize subnet_id, options = {}
        @subnet_id = subnet_id
        super
      end

      # @return [String]
      attr_reader :subnet_id

      alias_method :id, :subnet_id

      attribute :vpc_id, :static => true

      attribute :state, :to_sym => true

      attribute :cidr_block, :static => true

      attribute :available_ip_address_count, :integer => true, :static => true

      attribute :availability_zone_name,
        :from => :availability_zone, :static => true

      populates_from(:create_subnet) do |resp|
        resp.subnet if resp.subnet.subnet_id == subnet_id
      end

      populates_from(:describe_subnets) do |resp|
        resp.subnet_set.find{|s| s.subnet_id == subnet_id }
      end

      # @return [VPC] Returns the VPC this subnet belongs to.
      def vpc
        VPC.new(vpc_id, :config => config)
      end

      # @return [NetworkACL] Returns the network ACL currently assigned
      #   to this subnet.
      def network_acl
        network_acl_association.network_acl
      end

      # Replaces the currently assigned network ACL with the passed one.
      # @param [NetworkACL,String] network_acl A {NetworkACL} or network
      #   ACL id to assign to this subnet.
      def network_acl= network_acl
        network_acl_association.replace_network_acl(network_acl)
      end

      # @return [NetworkACL::Association] Returns the association between
      #   this subnet and its network ACL.
      def network_acl_association
        associations = AWS.memoize { vpc.network_acls.map(&:associations) }.flatten
        associations.find{|a| a.subnet == self }
      end

      # @return [RouteTable] Returns the route table currently associated
      #   with this subnet.
      def route_table
        route_table_association.route_table
      end

      # Sets the route table for this subnet.  If there is already a
      # route table associated with this subnet, that association
      # is replaced.
      #
      # @param [RouteTable,String] route_table A {RouteTable} object or
      #   a route table id string.
      #
      # @return [RouteTable::Association]
      #
      def set_route_table route_table

        unless route_table.is_a?(RouteTable)
          route_table = RouteTable.new(route_table, :config => config)
        end

        client_opts = {}
        client_opts[:route_table_id] = route_table.id

        assoc = route_table_association

        if assoc.main?
          client_opts[:subnet_id] = subnet_id
          response = client.associate_route_table(client_opts)
          association_id = response.association_id
        else
          client_opts[:association_id] = assoc.association_id
          resp = client.replace_route_table_association(client_opts)
          association_id = resp.new_association_id
        end

        RouteTable::Association.new(route_table, association_id, subnet_id)

      end
      alias_method :route_table=, :set_route_table

      # @return [RouteTable::Association] Returns the association between
      #   this subnet and its route table.
      def route_table_association
        assocs = AWS.memoize { vpc.route_tables.map(&:associations) }.flatten
        assocs.find{|a| a.subnet == self } || assocs.find{|a| a.main? }
      end

      # See also {#availability_zone_name}.
      # @return [AvailabilityZone]
      def availability_zone
        AvailabilityZone.new(availability_zone_name, :config => config)
      end

      # @return [InstanceCollection] Returns a filtered collection of
      #   instances launched in this subnet.
      def instances
        InstanceCollection.new(:config => config).filter('subnet-id', id)
      end

      # @return [NetworkInterfaceCollection] Returns a collection that
      #   represents all of the network interfaces for this subnet.
      def network_interfaces
        NetworkInterfaceCollection.new(:config => config).filter('subnet-id', id)
      end

      # Deletes the current subnet.  The subnet must be empty before it can
      # be deleted.
      # @return [nil]
      def delete
        client.delete_subnet(:subnet_id => subnet_id)
        nil
      end

    end
  end
end
