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
      class IpPermission

        include Core::Model

        # @param protocol [:tcp, :udp, :icmp]
        #
        # @param [Integer,Range<Integer>] ports A port or port range to allow.
        #
        # @param [Hash] options
        #
        # @option options [Array] :ip_ranges An array of CIDR ip address
        #   to grant permission to.
        #
        # @option options [Array] :groups An array of SecurityGroup objects to
        #   grant permission to.
        #
        # @option options [Boolean] :egress (false) When true this IpPermission
        #   is assumed to be an egress permission.
        #
        def initialize security_group, protocol, ports, options = {}

          @security_group = security_group

          @protocol = protocol == '-1' ?  :any : protocol.to_s.downcase.to_sym

          @ip_ranges = Array(options[:ip_ranges])

          @groups = Array(options[:groups])

          @egress = options[:egress] || false

          # not all egress permissions require port ranges, depends on the
          # protocol
          if ports
            if ports.is_a?(Range)
              @port_range = ports
            else
              @port_range = Array(ports).first.to_i..Array(ports).last.to_i
            end
          end

          super

        end

        # @return [SecurityGroup] The security group this permission is
        #   authorized for.
        attr_reader :security_group

        # @return [Symbol] The protocol (:tcp, :udp, :icmp)
        attr_reader :protocol

        # @return [Range] The port range (e.g. 80..80, 4000..4010, etc)
        attr_reader :port_range

        # @return [Array] An array of string CIDR ip addresses.
        attr_reader :ip_ranges

        # @return [Array] An array of security groups that have been
        #   granted access with this permission.
        attr_reader :groups

        # @return [Boolean] True if this is an egress permission
        attr_reader :egress

        # @return [Boolean] Returns true if this is an egress permission.
        def egress?
          @egress ? true : false
        end

        # Authorizes this permission from its security group.
        # @return [IpPermission] Returns self
        def authorize
          update_sg(egress? ? :authorize_egress : :authorize_ingress)
        end

        # Revokes this permission from its security group.
        # @return [IpPermission] Returns self
        def revoke
          update_sg(egress? ? :revoke_egress : :revoke_ingress)
        end

        # @return [Boolean] Returns true if the other IpPermission matches
        #   this one.
        def eql? other
          other.is_a?(IpPermission) and
          other.security_group == security_group and
          other.protocol == protocol and
          other.port_range == port_range and
          other.ip_ranges.sort == ip_ranges.sort and
          other.groups.sort == groups.sort and
          other.egress? == egress?
        end
        alias_method :==, :eql?

        protected
        def update_sg method

          sources = []
          sources += ip_ranges
          sources += groups

          if egress?
            opts = {}
            opts[:protocol] = protocol
            opts[:ports] = port_range if port_range
            sources << opts
            security_group.send(method, *sources)
          else
            security_group.send(method, protocol, port_range, *sources)
          end

          self
        end

      end
    end
  end
end
