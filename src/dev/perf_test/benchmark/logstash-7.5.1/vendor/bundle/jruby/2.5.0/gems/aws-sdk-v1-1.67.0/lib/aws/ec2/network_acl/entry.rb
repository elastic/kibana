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
    class NetworkACL < Resource

      # Represents a single entry (rule) for an EC2 network ACL.
      class Entry

        def initialize network_acl, details
          @network_acl = network_acl
          @rule_number = details[:rule_number]
          @protocol = details[:protocol].to_i
          @action = details[:rule_action].to_sym
          @egress = details[:egress]
          @ingress = !@egress
          @cidr_block = details[:cidr_block]
          if type_code = details[:icmp_type_code]
            @icmp_type = type_code[:type]
            @icmp_code = type_code[:code]
          end
          if range = details[:port_range]
            @port_range = (range[:from]..range[:to])
          end
        end

        # @return [NetworkACL]
        attr_reader :network_acl

        # @return [Integer]
        attr_reader :rule_number

        # @return [Integer] Returns the protocol number.  A value of -1
        #   means all protocols.  See
        #   http://www.iana.org/assignments/protocol-numbers/protocol-numbers.xml
        #   for a list of protocol numbers to names.
        attr_reader :protocol

        # @return [:allow,:deny] Whether to allow or deny the traffic that
        #   matches the rule.
        attr_reader :action

        # @return [Boolean] Indicate the rule is an egress rule (rule is
        #   applied to traffic leaving the subnet).
        attr_reader :egress

        # @return [Boolean] Indicate the rule is an ingress rule (rule is
        #   applied to traffic entering the subnet).
        attr_reader :ingress

        # @return [String] The network range to allow or deny, in CIDR notation.
        attr_reader :cidr_block

        # @return [nil,Range<Integer>] For the TCP or UDP protocols, the range
        #   of ports the rule applies to.
        attr_reader :port_range

        # @return [nil,Integer] A value of -1 means all codes for the given
        #  ICMP type.  Returns nil unless the protocol is ICMP.
        attr_reader :icmp_code

        # @return [nil,Integer] A value of -1 means all codes for the given
        #  ICMP type.  Returns nil unless the protocol is ICMP.
        attr_reader :icmp_type

        # @return [Boolean] Returns true if traffic matching this rule
        #   is allowed.
        def allow?
          @action == :allow
        end

        # @return [Boolean] Returns true if traffic matching this rule
        #   is denied.
        def deny?
          @action == :deny
        end

        # @return [Boolean] Returns true if the rule is applied to traffic
        #   entering the subnet.
        def ingress?
          @ingress
        end

        # @return [Boolean] Returns true if the rule is applied to traffic
        #   leaving the subnet.
        def egress?
          @egress
        end

        # Replaces the current network ACL entry with the options passed.
        #
        # @param [Hash] options
        #
        # @option options [required,:allow,:deny] :rule_action Whether to
        #   allow or deny traffic that matches the rule.
        #
        # @option options [required,Integer] :protocol IP protocol the rule
        #   applies to. You can use -1 to mean all protocols. You can see a
        #   list of #   supported protocol numbers here:
        #   http://www.iana.org/assignments/protocol-numbers/protocol-numbers.xml
        #
        # @option options [required,String] :cidr_block The CIDR range to
        #   allow or deny, in CIDR notation (e.g., 172.16.0.0/24).
        #
        # @option options [Boolean] :egress (false)
        #   Whether this rule applies to egress traffic from the subnet (true)
        #   or ingress traffic to the subnet (false).
        #
        # @option options [Range<Integer>] :port_range A numeric range
        #   of ports. Required if specifying TCP (6) or UDP (17) for the
        #   :protocol.
        #
        # @option options [Integer] :icmp_code For the ICMP protocol, the
        #   ICMP code. You can use -1 to specify all ICMP codes for the given
        #   ICMP type.
        #
        # @option options [Integer] :icmp_type For the ICMP protocol,
        #   the ICMP type. You can use -1 to specify all ICMP types.
        #
        # @return [nil]
        #
        def replace options = {}
          network_acl.replace_entry(options.merge(:rule_number => rule_number))
        end

        # Deletes the current network ACL entry.
        # @return [nil]
        def delete
          network_acl.delete_entry(egress? ? :egress : :ingress, rule_number)
        end

      end

    end
  end
end
