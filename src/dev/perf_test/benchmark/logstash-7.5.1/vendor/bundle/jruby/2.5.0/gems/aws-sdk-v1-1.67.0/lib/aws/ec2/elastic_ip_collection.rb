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
    class ElasticIpCollection < Collection

      # @param [Hash] options
      #
      # @option options [Boolean] :vpc (false) When true, the elastic ip
      #   address will be allocated to your VPC.
      #
      # @return [ElasticIp]
      #
      def create options = {}

        client_opts = {}
        client_opts[:domain] = 'vpc' if options[:vpc]

        response = client.allocate_address(client_opts)

        ElasticIp.new(response.public_ip, :config => config)

      end

      alias_method :allocate, :create

      # @param [String] public_ip The public IP address of an elastic ip.
      # @return [ElasticIp] The elastic IP with the given address.
      def [] public_ip
        super
      end

      # Specify one or more criteria to filter elastic IP addresses by.
      # A subsequent call to #each will limit the resutls returned
      # by provided filters.
      #
      #   * Chain multiple calls of #filter together to AND multiple conditions
      #     together.
      #   * Supply multiple values to a singler #filter call to OR those
      #     value conditions together.
      #   * '*' matches one or more characters and '?' matches any one
      #     character.
      #
      # ### Valid Filters
      #
      # * domain - Whether the address is a EC2 address, or a VPC address.
      #   Valid values include 'standard' and 'vpc'
      # * instance-id - Instance the address is associated with (if any).
      # * public-ip - The Elastic IP address.
      # * allocation-id - Allocation ID for the address. For VPC addresses
      #   only.
      # * association-id - Association ID for the address. For VPC addresses
      #   only.
      #
      # @return [ElasticIpCollection] A new collection that represents
      #   a subset of the elastic IP addresses associated with this account.
      #
      # @yield [elastic_ip]
      # @yieldparam [ElasticIp] elastic_ip
      def each &block
        response = filtered_request(:describe_addresses)
        response.addresses_set.each do |address|

          elastic_ip = ElasticIp.new_from(
            :describe_addresses,
            address,
            address.public_ip,
            :config => config)

          yield(elastic_ip)

        end
      end

      protected
      def member_class
        ElasticIp
      end

    end
  end
end
