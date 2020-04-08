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

    # Represents a security group in EC2.
    #
    # @attr_reader [String] description The short informal description
    #   given when the group was created.
    #
    # @attr_reader [String] name The name of the security group.
    #
    # @attr_reader [String] owner_id The security group owner's id.
    #
    # @attr_reader [String,nil] vpc_id If this is a VPC security group,
    #   vpc_id is the ID of the VPC this group was created in.
    #   Returns false otherwise.
    #
    class SecurityGroup < Resource

      autoload :IpPermission, 'aws/ec2/security_group/ip_permission'
      autoload :IpPermissionCollection, 'aws/ec2/security_group/ip_permission_collection'
      autoload :IngressIpPermissionCollection, 'aws/ec2/security_group/ip_permission_collection'
      autoload :EgressIpPermissionCollection, 'aws/ec2/security_group/ip_permission_collection'

      include TaggedItem

      def initialize security_group_id, options = {}
        @security_group_id = security_group_id
        super
      end

      # @return [String]
      attr_reader :security_group_id

      alias_method :group_id, :security_group_id

      alias_method :id, :security_group_id

      attribute :name, :from => :group_name, :static => true

      attribute :owner_id, :static => true

      attribute :vpc_id, :static => true

      attribute :description, :from => :group_description, :static => true

      attribute :ip_permissions_list, :from => :ip_permissions

      attribute :ip_permissions_list_egress, :from => :ip_permissions_egress

      populates_from(:describe_security_groups) do |resp|
        resp[:security_group_index][id]
      end

      # @return [InstanceCollection] Returns an instance collection that will
      #   only enumerate instances in this security group.
      def instances
        instances = InstanceCollection.new(:config => config)
        if vpc?
          instances.filter('instance.group-id', [group_id])
        else
          instances.filter('group-id', [group_id])
        end
      end

      # @return [Boolean] True if the security group exists.
      def exists?
        client.describe_security_groups(:filters => [
          { :name => "group-id", :values => [id] }
        ]).security_group_index.key?(id)
      end

      # Returns true if this security group is a VPC security group and
      # not an EC2 security group.  VPC security groups belong to a VPC
      # subnet and can have egress rules.
      # @return [Boolean] Returns true if this is a VPC security group and
      #   false if this is an EC2 security group.
      def vpc?
        vpc_id ? true : false
      end

      # @return [VPC,nil] Returns the VPC this security group belongs to,
      #   or nil if this is not a VPC security group.
      def vpc
        if vpc_id
          VPC.new(vpc_id, :config => config)
        end
      end

      # @return [SecurityGroup::IngressIpPermissionCollection] Returns a
      #   collection of {IpPermission} objects that represents all of
      #   the (ingress) permissions this security group has
      #   authorizations for.
      def ingress_ip_permissions
        IngressIpPermissionCollection.new(self, :config => config)
      end
      alias_method :ip_permissions, :ingress_ip_permissions

      # @return [SecurityGroup::EgressIpPermissionCollection] Returns a
      #   collection of {IpPermission} objects that represents all of
      #   the egress permissions this security group has authorizations for.
      def egress_ip_permissions
        EgressIpPermissionCollection.new(self, :config => config)
      end

      # Adds ingress rules for ICMP pings.  Defaults to 0.0.0.0/0 for
      # the list of allowed IP ranges the ping can come from.
      #
      #   security_group.allow_ping # anyone can ping servers in this group
      #
      #   # only allow ping from a particular address
      #   security_group.allow_ping('123.123.123.123/0')
      #
      # @param [String] sources One or more IP ranges to allow ping from.
      #   Defaults to 0.0.0.0/0
      #
      # @return [nil]
      #
      def allow_ping *sources
        sources << '0.0.0.0/0' if sources.empty?
        authorize_ingress('icmp', -1, *sources)
      end

      # Removes ingress rules for ICMP pings.  Defaults to 0.0.0.0/0 for
      # the list of IP ranges to revoke.
      #
      # @param [String] sources One or more IP ranges to disallow ping from.
      #   Defaults to 0.0.0.0/0
      #
      # @return [nil]
      #
      def disallow_ping *sources
        sources << '0.0.0.0/0' if sources.empty?
        revoke_ingress('icmp', -1, *sources)
      end

      # Add an ingress rules to this security group.
      # Ingress rules permit inbound traffic over a given protocol for
      # a given port range from one or more source ip addresses.
      #
      # This example grants the whole internet (0.0.0.0/0) access to port 80
      # over TCP (HTTP web traffic).
      #
      #     security_group.authorize_ingress(:tcp, 80)
      #
      # You can specify port ranges as well:
      #
      #     # ftp
      #     security_group.authorize_ingress(:tcp, 20..21)
      #
      # ## Sources
      #
      # Security groups accept ingress trafic from:
      #
      # * CIDR IP addresses
      # * security groups
      # * load balancers
      #
      # ### Ip Addresses
      #
      # In the following example allow incoming SSH from a list of
      # IP address ranges.
      #
      #     security_group.authorize_ingress(:tcp, 22,
      #       '111.111.111.111/0', '222.222.222.222/0')
      #
      # ### Security Groups
      #
      # To autohrize ingress traffic from all EC2 instance in another
      # security group, just pass the security group:
      #
      #     web = security_groups.create('webservers')
      #     db = security_groups.create('database')
      #     db.authorize_ingress(:tcp, 3306, web)
      #
      # You can also pass a hash of security group details instead of
      # a {SecurityGroup} object.
      #
      #     # by security group name
      #     sg.authorize_ingress(:tcp, 80, { :group_name => 'other-group' })
      #
      #     # by security group id
      #     sg.authorize_ingress(:tcp, 80, { :group_id => 'sg-1234567' })
      #
      # If the security group belongs to a different account, just make
      # sure it has the correct owner ID populated:
      #
      #     not_my_sg = SecurityGroup.new('sg-1234567', :owner_id => 'abcxyz123')
      #     my_sg.authorize_ingress(:tcp, 80, not_my_sg)
      #
      # You can do the same with a hash as well (with either `:group_id`
      # or `:group_name`):
      #
      #     sg.authorize_ingress(:tcp, 21..22, { :group_id => 'sg-id', :user_id => 'abcxyz123' })
      #
      # ### Load Balancers
      #
      # If you use ELB to manage load balancers, then you need to add
      # ingress permissions to the security groups they route traffic into.
      # You can do this by passing the {ELB::LoadBalancer} into
      # authorize_ingress:
      #
      #     load_balancer = AWS::ELB.new.load_balancers['web-load-balancer']
      #
      #     sg.authorize_ingress(:tcp, 80, load_balancer)
      #
      # ### Multiple Sources
      #
      # You can provide multiple sources each time you call authorize
      # ingress, and you can mix and match the source types:
      #
      #     sg.authorize_ingress(:tcp, 80, other_sg, '1.2.3.4/0', load_balancer)
      #
      # @param [String, Symbol] protocol Should be :tcp, :udp or :icmp
      #   or the string equivalent.
      #
      # @param [Integer, Range] ports The port (or port range) to allow
      #   traffic through.  You can pass a single integer (like 80)
      #   or a range (like 20..21).
      #
      # @param [Mixed] sources One or more CIDR IP addresses,
      #   security groups, or load balancers.  Security groups
      #   can be specified as hashes.
      #
      #   A security group hash must provide either `:group_id` or
      #   `:group_name` for the security group.  If the security group
      #   does not belong to you aws account then you must also
      #   provide `:user_id` (which can be an AWS account ID or alias).
      #
      # @return [nil]
      #
      def authorize_ingress protocol, ports, *sources
        client.authorize_security_group_ingress(
          :group_id => id,
          :ip_permissions => [ingress_opts(protocol, ports, sources)]
        )
        nil
      end

      # Revokes an ingress (inbound) ip permission.  This is the inverse
      # operation to {#authorize_ingress}.  See {#authorize_ingress}
      # for param and option documentation.
      #
      # @see #authorize_ingress
      #
      # @return [nil]
      #
      def revoke_ingress protocol, ports, *sources
        client.revoke_security_group_ingress(
          :group_id => id,
          :ip_permissions => [ingress_opts(protocol, ports, sources)]
        )
        nil
      end

      # Authorize egress (outbound) traffic for a VPC security group.
      #
      #     # allow traffic for all protocols/ports from the given sources
      #     security_group.authorize_egress('10.0.0.0/16', '10.0.0.1/16')
      #
      #     # allow tcp traffic outband via port 80
      #     security_group.authorize_egress('10.0.0.0/16',
      #       :protocol => :tcp, :ports => 80..80)
      #
      # @note Calling this method on a non-VPC security group raises an error.
      #
      # @overload authorize_egress(*sources, options = {})
      #
      #   @param [Mixed] sources One or more CIDR IP addresses,
      #     security groups or load balancers.  See {#authorize_ingress}
      #     for more information on accepted formats for sources.
      #
      #   @param [Hash] options
      #
      #   @option options [Symbol] :protocol (:any) The protocol name or number
      #     to authorize egress traffic for.  For a complete list of protocols
      #     see: [protocol-numbers.xml](http://www.iana.org/assignments/protocol-numbers/protocol-numbers.xml)
      #
      #   @option options [Range<Integer>,Integer] :ports (nil) An optional
      #     port or range of ports.  This option is required depending on
      #     the protocol.
      #
      # @return [nil]
      #
      def authorize_egress *sources
        client.authorize_security_group_egress(
          :group_id => id,
          :ip_permissions => [egress_opts(sources)])
        nil
      end

      # Revokes an egress (outound) ip permission.  This is the inverse
      # operation to {#authorize_egress}.  See {#authorize_egress}
      # for param and option documentation.
      #
      # @see #authorize_egress
      #
      # @return [nil]
      #
      def revoke_egress *sources
        client.revoke_security_group_egress(
          :group_id => id,
          :ip_permissions => [egress_opts(sources)])
        nil
      end

      # Deletes this security group.
      #
      # If you attempt to delete a security group that contains
      # instances, or attempt to delete a security group that is referenced
      # by another security group, an error is raised. For example, if
      # security group B has a rule that allows access from security
      # group A, security group A cannot be deleted until the rule is
      # removed.
      # @return [nil]
      def delete
        client.delete_security_group(:group_id => id)
        nil
      end

      # @api private
      def <=> other
        self.id <=> other.id
      end

      # @api private
      def resource_type
        'security-group'
      end

      # @api private
      def inflected_name
        "group"
      end

      # @api private
      def self.describe_call_name
        :describe_security_groups
      end
      def describe_call_name; self.class.describe_call_name; end

      # @api private
      protected
      def ingress_opts protocol, ports, sources

        opts = {}
        opts[:ip_protocol] = protocol == :any ? '-1' : protocol.to_s.downcase

        unless ports.is_a?(Range)
          ports = Array(ports)
        end
        opts[:from_port] = ports.first.to_i
        opts[:to_port] = ports.last.to_i

        ips, groups = parse_sources(sources)

        opts[:ip_ranges] = ips unless ips.empty?
        opts[:user_id_group_pairs] = groups unless groups.empty?

        opts

      end

      # @api private
      protected
      def egress_opts args
        ensure_vpc do

          last = args.last

          if last.is_a?(Hash) and (last.key?(:protocol) or last.key?(:ports))
            # hashes at the end of egress methods could be a hash intedned
            # to be a source, like:
            #
            #     { :group_id => ..., :user_id => ... }
            #
            options = args.pop
          else
            options = {}
          end

          opts = {}

          opts[:ip_protocol] = [nil,:any, '-1'].include?(options[:protocol]) ?
            '-1' : options[:protocol].to_s.downcase

          if options[:ports]
            if options[:ports].is_a?(Range)
              ports = options[:ports]
            else
              ports = Array(options[:ports])
            end

            opts[:from_port] = ports.first.to_i
            opts[:to_port] = ports.last.to_i
          end

          ips, groups = parse_sources(args)

          opts[:ip_ranges] = ips unless ips.empty?
          opts[:user_id_group_pairs] = groups unless groups.empty?

          opts

        end
      end

      # @api private
      protected
      def parse_sources sources

        ips = []
        groups = []

        sources.each do |source|
          case source

          when String
            ips << { :cidr_ip => source }

          when SecurityGroup
            groups << { :group_id => source.id, :user_id => source.owner_id }

          when ELB::LoadBalancer
            groups << source.source_security_group

          when Hash

            # group name or id required
            unless source.has_key?(:group_id) or source.has_key?(:group_name)
              raise ArgumentError, 'invalid ip permission hash, ' +
                'must provide :group_id or :group_name'
            end

            # prevent typos
            unless source.keys - [:group_id, :group_name, :user_id] == []
              raise ArgumentError, 'invalid ip permission hash, ' +
                'only accepts the following keys, :group_id, :group_name, :user_id'
            end

            groups << source

          else
            raise ArgumentError, 'invalid ingress ip permission, ' +
              'expected CIDR IP address or SecurityGroup'
          end
        end

        ips << { :cidr_ip => '0.0.0.0/0' } if ips.empty? and groups.empty?

        [ips, groups]

      end

      # @api private
      protected
      def ensure_vpc &block
        raise 'operation permitted for VPC security groups only' unless vpc?
        yield
      end

      # @api private
      protected
      def find_in_response(resp)
        resp.security_group_index[id]
      end

    end
  end
end
