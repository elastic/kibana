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

    # Represents all EC2 security groups in an AWS account.
    class SecurityGroupCollection < Collection

      include TaggedCollection

      # Creates a new
      # @param [String] name The name of the security group to create.
      # @param [Hash] options
      # @option options [String] :description An informal description
      #   of this security group.  Accepts alphanumeric characters, spaces,
      #   dashes, and underscores. If left blank the description will be set
      #   to the name.
      #
      # @option options [VPC,String] :vpc (nil) A VPC or VPC id string to
      #   create the security group in.  When specified a VPC security
      #   group is created.
      #
      # @return [SecurityGroup]
      #
      def create name, options = {}

        description = options[:description] || name

        create_opts = {}
        create_opts[:group_name] = name
        create_opts[:description] = description

        vpc_id = options[:vpc]
        vpc_id ||= options[:vpc_id] # for backwards compatability
        vpc_id ||= filter_value_for('vpc-id')
        vpc_id = vpc_id.id if vpc_id.is_a?(VPC)

        create_opts[:vpc_id] = vpc_id if vpc_id

        response = client.create_security_group(create_opts)

        SecurityGroup.new(response.group_id, {
          :name => name,
          :description => description,
          :vpc_id => create_opts[:vpc_id],
          :config => config })

      end

      # @param [String] group_id The group id of a security group.
      # @return [SecurityGroup] The group with the given id.
      def [] group_id
        SecurityGroup.new(group_id, :config => config)
      end

      # Specify one or more criteria to filter security groups by.
      # A subsequent call to #each will limit the security groups returned
      # by the set of filters.
      #
      # If you supply multiple values to #filter then these values are
      # treated as an OR condition.  To return security groups named
      # 'test' or 'fake':
      #
      #     security_groups.filter('group-name', 'test', 'fake')
      #
      # If you want to and conditions together you need to chain calls to
      # filter.  To limit security groups to those with a name like
      # 'test' and like 'ruby':
      #
      #     security_groups.
      #       filter('group-name', '*test*').
      #       filter('group-name', '*ruby*').each do |group|
      #       #...
      #     end
      #
      # Note that * matches one or more characters and ? matches any one
      # character.
      #
      # ### Valid Filters
      #
      # * description - Description of the security group.
      # * group-id - ID of the security group.
      # * group-name - Name of the security group.
      # * ip-permission.cidr - CIDR range that has been granted the
      #   permission.
      # * ip-permission.from-port - Start of port range for the TCP and UDP
      #    protocols, or an ICMP type number.
      # * ip-permission.group-name - Name of security group that has been
      #   granted the permission.
      # * ip-permission.protocol - IP protocol for the permission. Valid
      #   values include 'tcp', 'udp', 'icmp' or a protocol number.
      # * ip-permission.to-port - End of port range for the TCP and UDP
      #   protocols, or an ICMP code.
      # * ip-permission.user-id - ID of AWS account that has been granted
      #   the permission.
      # * owner-id - AWS account ID of the owner of the security group.
      # * tag-key - Key of a tag assigned to the security group.
      # * tag-value - Value of a tag assigned to the security group.
      #
      # @return [SecurityGroupCollection] A new collection that represents
      #   a subset of the security groups associated with this account.
      #
      # @yield [group]
      # @yieldparam [SecurityGroup] group
      # @return [nil]
      def each &block

        response = filtered_request(:describe_security_groups)
        response.security_group_info.each do |info|

          group = SecurityGroup.new_from(:describe_security_groups, info,
            info.group_id, :config => config)

          yield(group)

        end
        nil
      end

    end
  end
end
