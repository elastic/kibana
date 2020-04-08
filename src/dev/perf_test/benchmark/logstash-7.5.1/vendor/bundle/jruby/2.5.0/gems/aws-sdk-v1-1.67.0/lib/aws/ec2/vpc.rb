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

    # @attr_reader [Symbol] state
    # @attr_reader [String] cidr_block
    # @attr_reader [String] dhcp_options_id
    # @attr_reader [Symbol] instance_tenancy
    class VPC < Resource

      include TaggedItem

      def initialize vpc_id, options = {}
        @vpc_id = vpc_id
        super
      end

      # @return [String]
      attr_reader :vpc_id

      alias_method :id, :vpc_id

      attribute :state, :to_sym => true

      attribute :cidr_block, :static => true

      attribute :dhcp_options_id

      attribute :instance_tenancy, :static => true, :to_sym => true

      attribute :is_default, :alias => :is_default?, :static => true, :boolean => true

      populates_from(:create_vpc) do |resp|
        resp.vpc if resp.vpc.vpc_id == vpc_id
      end

      populates_from(:describe_vpcs) do |resp|
        resp.vpc_set.find{|v| v.vpc_id == vpc_id }
      end

      # @return [Boolean] Returns `true` if the resource exists.
      def exists?
        get_resource
        true
      rescue Errors::InvalidVpcID::NotFound
        false
      end

      # Deletes the current VPC.  The VPC must be empty before it can
      # be deleted.
      # @return [nil]
      def delete
        client.delete_vpc(:vpc_id => vpc_id)
        nil
      end

      # @return [InstanceCollection] Returns a filtered collection of
      #   instances that are in this VPC.
      def instances
        InstanceCollection.new(:config => config).filter('vpc-id', vpc_id)
      end

      # @return [SecurityGroupCollection] Returns a filtered collection of
      #   security groups that are in this VPC.
      def security_groups
        SecurityGroupCollection.new(:config => config).filter('vpc-id', vpc_id)
      end

      # @return [SubnetCollection] Returns a filtered collection of
      #   subnets that are in this VPC.
      def subnets
        SubnetCollection.new(:config => config).filter('vpc-id', vpc_id)
      end

      # @return [NetworkACLCollection] Returns a filtered collection of
      #   network ACLs that are in this VPC.
      def network_acls
        NetworkACLCollection.new(:config => config).filter('vpc-id', vpc_id)
      end

      # @return [RouteTableCollection] Returns a filtered collection of
      #   route tables that are in this VPC.
      def route_tables
        RouteTableCollection.new(:config => config).filter('vpc-id', vpc_id)
      end

      # @return [NetworkInterfaceCollection] Returns a filtered collection of
      #   network interfaces that are in this VPC.
      def network_interfaces
        NetworkInterfaceCollection.new(:config => config).filter('vpc-id', id)
      end

      # @return [VPCPeeringConnectionCollection] Returns a filtered collection
      #   of VPC peering connection from this VPC.
      def peering_connections
        VPCPeeringConnectionCollection.new(:config => config).filter('requester-vpc-info.vpc-id', vpc_id)
      end

      # @return [VPCPeeringConnectionCollection] Returns a filtered collection
      #   of VPC peering connection to this VPC.
      def peering_connections
        VPCPeeringConnectionCollection.new(:config => config).filter('accepter-vpc-info.vpc-id', vpc_id)
      end

      # @return [InternetGateway,nil] Returns the internet gateway attached to
      #   this VPC.  If no internet gateway has been attached, then
      #   nil is returned.
      def internet_gateway
        gateways = InternetGatewayCollection.new(:config => config)
        gateways.filter('attachment.vpc-id', vpc_id).first
      end

      # Attaches the given internet gateway to this VPC.  If there is already
      # an internet gateway attached, it will be detached from this VPC first.
      # If you pass nil, this will leave the current VPC without an attached
      # internet gateway.
      #
      #   vpc.internet_gateway = gateway_1
      #   vpc.internet_gateway = gateway_2 # detaches gateway_1 first
      #   vpc.internet_gateway = nil # detaches gateway_2
      #
      # @param [InternetGateway,String] internet_gateway An {InternetGateway}
      #   object or internet gateway id string.
      #
      def internet_gateway= internet_gateway

        # remove currently attached internet gateway
        gateway = self.internet_gateway
        gateway.detach(self) if gateway

        if internet_gateway
          unless internet_gateway.is_a?(InternetGateway)
            internet_gateway = InternetGateway.new(internet_gateway,
              :config => config)
          end
          internet_gateway.attach(self)
        end

      end

      # @return [VPNGateway,nil] Returns the vpn gateway attached to
      #   this VPC.  If no vpn gateway has been attached, then
      #   nil is returned.
      def vpn_gateway
        gateways = VPNGatewayCollection.new(:config => config)
        gateways.filter('attachment.vpc-id', vpc_id).first
      end

      # @return [DHCPOptions] Returns the dhcp options associated with
      #   this VPC.
      def dhcp_options
        DHCPOptions.new(dhcp_options_id, :config => config)
      end

      # Associates the given dhcp options with this VPC.
      #
      #   vpc.dhcp_optinos = ec2.dhcp_options['dopt-a1234abc']
      #
      # You can also specify the string 'default' to use Amazon's
      # default dhcp options.
      #
      #   vpc.dhcp_optinos = 'default'
      #
      # @param [DHCPOptions,String] dhcp_options A {DHCPOptions} object
      #   or a dhcp options id string.
      #
      def dhcp_options= dhcp_options
        unless dhcp_options.is_a?(DHCPOptions)
          dhcp_options = DHCPOptions.new(dhcp_options, :config => config)
        end
        dhcp_options.associate(self)
      end

      # Create a VPC peering connection between this VPC and another
      #   VPC owned by the same user, and accept it.
      # @return [VPCPeeringConnection] Returns the VPC peering connection
      #   that was created
      def peer_to vpc
        peering_connection = peering_connections.create(self, vpc)
        peering_connection.accept
        peering_connection
      end

      # @return [Boolean] Returns true if DNS resolution is supported for
      #   this VPC
      def dns_support
        resp = client.describe_vpc_attribute(:vpc_id => vpc_id, :attribute => 'enableDnsSupport')
        resp.enable_dns_support
      end

      # Enables DNS resolution support for this VPC
      def dns_support= enable_dns_support
        client.modify_vpc_attribute(:vpc_id => vpc_id, :enable_dns_support => { :value => enable_dns_support } )
        enable_dns_support
      end

      # @return [Boolean] Returns true if instances launched in the VPC get
      #   DNS hostnames in this VPC
      def dns_hostnames
        resp = client.describe_vpc_attribute(:vpc_id => vpc_id, :attribute => 'enableDnsHostnames')
        resp.enable_dns_hostnames
      end

      # Enables DNS hostnames for this VPC
      def dns_hostnames= enable_dns_hostnames
        client.modify_vpc_attribute(:vpc_id => vpc_id, :enable_dns_hostnames => { :value => enable_dns_hostnames } )
        enable_dns_hostnames
      end

    end
  end
end
