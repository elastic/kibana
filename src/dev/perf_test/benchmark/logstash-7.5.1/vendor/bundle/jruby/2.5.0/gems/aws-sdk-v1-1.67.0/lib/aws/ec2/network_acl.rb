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

require 'aws/ec2/network_acl/entry'
require 'aws/ec2/network_acl/association'

module AWS
  class EC2

    # Represents a network ACL in EC2.
    #
    # @attr_reader [String] vpc_id
    #
    # @attr_reader [Boolean] default Returns true if this is the default
    #   network ACL.
    #
    class NetworkACL < Resource

      include TaggedItem

      def initialize network_acl_id, options = {}
        @network_acl_id = network_acl_id
        super
      end

      # @return [String]
      attr_reader :network_acl_id

      alias_method :id, :network_acl_id

      attribute :vpc_id, :static => true

      attribute :default, :static => true

      alias_method :default?, :default

      attribute :entry_set

      protected :entry_set

      attribute :association_set

      protected :association_set

      populates_from(:create_network_acl) do |resp|
        resp.network_acl if resp.network_acl.network_acl_id == network_acl_id
      end

      populates_from(:describe_network_acls) do |resp|
        resp.network_acl_set.find{|acl| acl.network_acl_id == network_acl_id }
      end

      # @return [VPC] Returns the VPC this network ACL belongs to.
      def vpc
        VPC.new(vpc_id, :config => config)
      end

      # @return [Array<Subnet>] Returns an array of subnets ({Subnet})
      #   that currently use this network ACL.
      def subnets
        associations.map(&:subnet)
      end

      # @return [Array<NetworkACL::Association>] Returns an array of
      #   {NetworkACL::Association} objects (association to subnets).
      def associations
        association_set.map do |assoc|

          subnet = Subnet.new(assoc.subnet_id,
            :vpc_id => vpc_id,
            :config => config)

          Association.new(assoc.network_acl_association_id, self, subnet)

        end
      end

      # @return [Array<NetworkACL::Entry>] Returns an array of
      #   all entries for this network ACL.
      def entries
        entry_set.map do |entry_details|
          Entry.new(self, entry_details)
        end
      end

      # Adds an entry to this network ACL.
      #
      # @param [Hash] options
      #
      # @option options [required,Integer] :rule_number Rule number to
      #   assign to the entry (e.g., 100). ACL entries are processed in
      #   ascending order by rule number.
      #
      # @option options [required,:allow,:deny] :action Whether to
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
      def create_entry options = {}
        client.create_network_acl_entry(entry_options(options))
        nil
      end

      # Replaces the network ACL entry with the given :rule_number.
      #
      # @param [Hash] options
      #
      # @option options [required,Integer] :rule_number Rule number to
      #   assign to the entry (e.g., 100). ACL entries are processed in
      #   ascending order by rule number.
      #
      # @option options [required,:allow,:deny] :action Whether to
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
      def replace_entry options = {}
        client.replace_network_acl_entry(entry_options(options))
        nil
      end

      # Deletes an entry from this network ACL. To delete an entry
      # you need to know its rule number and if it is an egress or ingress
      # rule.
      #
      #     # delete ingress rule 10
      #     network_acl.delete_entry :egress, 10
      #
      #     # delete egress rules 5
      #     network_acl.delete_entry :ingress, 5
      #
      # @param [:ingress,:egress] egress_or_ingress Specifies if you want to
      #   delete an ingress or an egress rule.
      #
      # @param [Integer] rule_number Which rule to delete.
      #
      # @return [nil]
      #
      def delete_entry egress_or_ingress, rule_number

        unless [:ingress, :egress].include?(egress_or_ingress)
          msg = "expected :ingress or :egress for egress_or_ingress param"
          raise ArgumentError, msg
        end

        client_opts = {}
        client_opts[:network_acl_id] = network_acl_id
        client_opts[:egress] = egress_or_ingress == :egress
        client_opts[:rule_number] = rule_number

        client.delete_network_acl_entry(client_opts)

        nil

      end

      # Deletes the current network ACL.  You can not delete the default
      # network ACL.
      # @return [nil]
      def delete
        client.delete_network_acl(:network_acl_id => network_acl_id)
        nil
      end

      protected

      def entry_options options

        unless [true,false].include?(options[:egress])
          msg = "expected :egress option to be set to true or false"
          raise ArgumentError, msg
        end

        entry_opts = {}
        entry_opts[:network_acl_id] = network_acl_id
        entry_opts[:rule_number] = options[:rule_number]
        entry_opts[:protocol] = options[:protocol].to_s.downcase
        entry_opts[:rule_action] = options[:action].to_s
        entry_opts[:egress] = options[:egress] if options.key?(:egress)
        entry_opts[:cidr_block] = options[:cidr_block]

        if options[:icmp_code] or options[:icmp_type]
          entry_opts[:icmp_type_code] = {}
          entry_opts[:icmp_type_code][:type] = options[:icmp_type]
          entry_opts[:icmp_type_code][:code] = options[:icmp_code]
        end

        if options[:port_range]
          entry_opts[:port_range] = {}
          entry_opts[:port_range][:from] = options[:port_range].first
          entry_opts[:port_range][:to] = options[:port_range].last
        end

        entry_opts

      end

    end
  end
end
