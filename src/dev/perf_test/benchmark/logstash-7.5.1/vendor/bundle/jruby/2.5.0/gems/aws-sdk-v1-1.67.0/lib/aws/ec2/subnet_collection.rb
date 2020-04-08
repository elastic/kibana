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

    # Represents a collection of VPC subnets.  You can get a subnet collection
    # two ways.  You can get a collection that represents ALL subnets (across
    # all your VPCs).  You can also get a subnet collection that represents
    # subnets within a single vpc.
    #
    #     # represents all subnets
    #     subnets = ec2.subnets
    #
    #     # represents subnets within the named vpc
    #     subnets = ec2.vpcs['vpc-12345'].subnets
    #
    # ## Creating a Subnet
    #
    # To create a subnet, call {#create} on a subnet collection, passing in
    # a suitable CIDR block.
    #
    #     subnet = subnets.create('10.0.0.0/20')
    #
    # You can optionally pass the availability zone you want the subnet
    # created in.
    #
    # ## Getting a Subnet
    #
    # If you know the subnet id, you can get a subnet using {#[]}.
    #
    #     subnet = subnets['subnet-id-here']
    #
    # You can filter subnets as well.  See the EC2 API documentation
    # (http://docs.aws.amazon.com/AWSEC2/latest/APIReference/ApiReference-query-DescribeSubnets.html) for a complete list of accepted filters.
    #
    #     subnet = subnets.filter('state', 'available').first
    #
    class SubnetCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # Creates a Subnet.  Subnets require a valid CIDR block and are created
      # inside an existing VPC. If you do not set an AvailabilityZone, then
      # Amazon EC2 will select one for you (this is recommended).
      #
      # For complete information about creating subnets, see
      # {http://docs.aws.amazon.com/AWSEC2/latest/APIReference/ApiReference-query-CreateSubnet.html
      # CreateSubnet} in the Amazon EC2 API Reference.
      #
      # @param [String] cidr_block The CIDR block you want the subnet to
      #   cover (e.g., 10.0.0.0/24).
      #
      # @param [Hash] options
      #
      # @option options [VPC,String] :vpc The VPC (or VPC id string) to
      #   create the subnet in.
      #
      # @option options [String,AvailabilityZone] :availability_zone
      #   The Availability Zone you want the subnet in.
      #   AWS selects a default zone for you (recommended).
      #
      # @return [Subnet]
      #
      def create cidr_block, options = {}

        client_opts = {}
        client_opts[:vpc_id] = vpc_id_option(options)
        client_opts[:cidr_block] = cidr_block
        client_opts[:availability_zone] = az_option(options) if
          options[:availability_zone]

        resp = client.create_subnet(client_opts)

        Subnet.new_from(:create_subnet, resp.subnet,
          resp.subnet.subnet_id, :config => config)

      end

      # @param [String] subnet_id
      # @return [Subnet] Returns a subnet with the given id.
      def [] subnet_id
        Subnet.new(subnet_id, :config => config)
      end

      protected
      def az_option options
        options[:availability_zone].is_a?(AvailabilityZone) ?
          options[:availability_zone].name :
          options[:availability_zone]
      end

      protected
      def _each_item options = {}, &block
        response = filtered_request(:describe_subnets, options, &block)
        response.subnet_set.each do |s|

          subnet = Subnet.new_from(:describe_subnets,
            s, s.subnet_id, :config => config)

          yield(subnet)

        end
      end

    end
  end
end
