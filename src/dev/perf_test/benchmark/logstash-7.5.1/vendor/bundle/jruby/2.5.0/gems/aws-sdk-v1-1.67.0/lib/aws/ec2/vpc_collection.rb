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

    class VPCCollection < Collection

      include TaggedCollection
      include Core::Collection::Simple

      # Creates a VPC with the CIDR block you specify. The smallest VPC you
      # can create uses a /28 netmask (16 IP addresses), and the largest
      # uses a /16 netmask (65,536 IP addresses).
      #
      #     vpc = ec2.vpcs.create('10.0.0.0/16')
      #
      # @param [String] cidr_block The CIDR block you want the VPC to
      #   cover (e.g., 10.0.0.0/16).
      #
      # @param [Hash] options
      #
      # @option options [Symbol] :instance_tenancy (:default)
      #   The allowed tenancy of instances launched into the VPC. A value of
      #   `:default` means instances can be launched with any tenancy; a value
      #   of `:dedicated` means all instances launched into the VPC will be launched with
      #   dedicated tenancy regardless of the tenancy assigned to the instance at launch.
      #
      # @return [VPC]
      #
      def create cidr_block, options = {}

        tenancy = options.key?(:instance_tenancy) ?
          options[:instance_tenancy].to_s : 'default'

        client_opts = {}
        client_opts[:cidr_block] = cidr_block
        client_opts[:instance_tenancy] = tenancy

        resp = client.create_vpc(client_opts)

        VPC.new_from(:create_vpc, resp.vpc, resp.vpc.vpc_id, :config => config)

      end

      def [] vpc_id
        VPC.new(vpc_id, :config => config)
      end

      protected
      def _each_item options = {}, &block
        response = filtered_request(:describe_vpcs, options, &block)
        response.vpc_set.each do |v|
          yield(VPC.new_from(:describe_vpcs, v, v.vpc_id, :config => config))
        end
      end

    end
  end
end
