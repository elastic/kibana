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

    # Represents an EC2 region.  You can use this to find the
    # endpoint for a given region:
    #
    #     ec2.regions["us-west-1"].endpoint
    #
    # Region also responds to all of the methods of {EC2} except
    # {EC2#regions}; for example, to list instance IDs by region,
    # you can do:
    #
    #     ec2.regions.inject({}) do |h,region|
    #       h[region.name] = region.instances.map(&:id)
    #       h
    #     end
    #
    # @attr_reader [String] endpoint The endpoint to use for this region
    #   (e.g. "ec2.eu-west-1.amazonaws.com").
    #
    class Region

      def initialize name, options = {}
        @name = name
        @endpoint = options[:endpoint] || "ec2.#{name}.amazonaws.com"
        @client = Client.new(options.merge(:endpoint => endpoint))
        @config = @client.config
      end

      # @return [String] The name of the region (e.g. "us-west-2").
      attr_reader :name

      # @return [String]
      attr_reader :endpoint

      # @return [Client]
      attr_reader :client

      # @return [Core::Configuration]
      attr_reader :config

      # @return [Boolean] True if the region is available for this
      #   account.
      def exists?
        client.describe_regions(:region_names => [name])
        true
      rescue Errors::InvalidParameterValue
        false
      end

      # @param [Region] other
      # @return [Boolean]
      def eql? other
        other.is_a?(Region) and
        other.name == name and
        other.endpoint == endpoint
      end
      alias_method :==, :eql?

      PROXIED_METHODS = [
        :instances,
        :security_groups,
        :key_pairs,
        :elastic_ips,
        :tags,
        :availability_zones,
        :images,
        :volumes,
        :snapshots,
        :reserved_instances,
        :reserved_instances_offerings,
        :vpcs,
        :subnets,
        :network_acls,
        :route_tables,
        :network_interfaces,
        :internet_gateways,
        :customer_gateways,
        :vpn_gateways,
        :dhcp_options,
        :vpn_connections,
        :export_tasks,
      ]

      PROXIED_METHODS.each do |method|
        define_method(method) do
          EC2.new(:config => config).send(method)
        end
      end

    end
  end
end
