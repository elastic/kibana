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
    class SecurityGroup < Resource

      class IpPermissionCollection

        include Core::Collection::Simple

        def initialize security_group, options = {}
          @security_group = security_group
          @egress = !!options[:egress]
          super
        end

        # @return [SecurityGroup]
        attr_reader :security_group

        # @return [Boolean]
        attr_reader :egress

        alias_method :egress?, :egress

        private

        def _each_item options = {}

          list_method = 'ip_permissions_list'
          list_method += '_egress' if egress?

          security_group.send(list_method).each do |p|

            # egress permissions don't always have ports
            ports = p[:from_port] ? [p[:from_port], p[:to_port]] : nil

            ip_ranges = p[:ip_ranges].collect{|ip| ip[:cidr_ip] }

            groups = p[:groups].collect do |group|
              SecurityGroup.new(group[:group_id],
                :owner_id => group[:user_id],
                :vpc_id => security_group.vpc_id,
                :config => config)
            end

            permission = IpPermission.new(security_group, p[:ip_protocol], ports,
              :ip_ranges => ip_ranges,
              :groups => groups,
              :egress => egress?,
              :config => config)

            yield(permission)

          end
        end

      end

      class IngressIpPermissionCollection < IpPermissionCollection; end

      class EgressIpPermissionCollection < IpPermissionCollection

        def initialize security_group, options = {}
          super(security_group, options.merge(:egress => true))
        end

      end

    end
  end
end
