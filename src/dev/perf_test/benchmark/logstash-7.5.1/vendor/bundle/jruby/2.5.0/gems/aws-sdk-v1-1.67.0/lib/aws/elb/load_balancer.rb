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
  class ELB

    # @attr_reader [String] name The name of the load balancer.
    #
    # @attr_reader [Array<String>] availability_zone_names Return the names of
    #   the availability zones this load balancer routes traffic to.
    #
    # @attr_reader [String] canonical_hosted_zone_name Provides the name of
    #   the Amazon Route 53 hosted zone that is associated with the load
    #   balancer.  For more information: [using-domain-names-with-elb.html](http://docs.aws.amazon.com/ElasticLoadBalancing/latest/DeveloperGuide/index.html?using-domain-names-with-elb.html).
    #
    # @attr_reader [String] canonical_hosted_zone_name_id Provides the ID of
    #   the Amazon Route 53 hosted zone name that is associated with the
    #   load balancer.  For more information: [using-domain-names-with-elb.html](http://docs.aws.amazon.com/ElasticLoadBalancing/latest/DeveloperGuide/index.html?using-domain-names-with-elb.html).
    #
    # @attr_reader [String] dns_name Specifies the external DNS name
    #   associated with this load balancer.
    #
    # @attr_reader [Hash] policy_descriptions Returns a hash of
    #   `:app_cookie_stickiness_policies`, `:lb_cookie_stickiness_policies`
    #   and `:other_policies`.  See also {#policies}.
    #
    # @attr_reader [String,nil] scheme Specifies the type of LoadBalancer.
    #   This attribute it set only for LoadBalancers attached to an Amazon VPC.
    #   If the Scheme is 'internet-facing', the LoadBalancer has a publicly
    #   resolvable DNS name that resolves to public IP addresses.
    #   If the Scheme is 'internal', the LoadBalancer has a publicly
    #   resolvable DNS name that resolves to private IP addresses.
    #
    # @attr_reader [Array<String>] subnet_ids Provides a list of VPC subnet IDs
    #   for the LoadBalancer.
    #
    # @attr_reader [Hash] health_check
    #   Returns a hash of the various health probes conducted on the
    #   load balancer instances.  The following entries are returned:
    #   * `:healthy_threshold`
    #   * `:unhealthy_threshold`
    #   * `:interval`
    #   * `:target`
    #   * `:timeout`
    #   See {#configure_health_check} for more details on what each of the
    #   configuration values mean.
    #
    # @return [Hash]
    #
    #
    class LoadBalancer < Core::Resource

      def initialize name, options = {}
        super(options.merge(:name => name.to_s))
      end

      attribute :name, :from => :load_balancer_name, :static => true

      # see #availability_zones
      attribute :availability_zone_names, :from => :availability_zones

      # see #backend_server_policies
      attribute :backend_server_descriptions

      attribute :canonical_hosted_zone_name, :static => true

      attribute :canonical_hosted_zone_name_id, :static => true

      attribute :created_time, :static => true

      attribute :dns_name, :static => true

      attribute :health_check, :alias => :health_check_configuration

      # see #instances
      attribute :instance_descriptions, :from => :instances

      # see #listeners
      attribute :listener_descriptions

      attribute :policy_descriptions, :from => :policies

      attribute :scheme, :static => true

      attribute :subnet_ids, :from => :subnets, :static => true

      attribute :security_group_ids, :from => :security_groups, :static => true

      attribute :source_security_group_owner_alias,
        :from => [:source_security_group, :owner_alias],
        :static => true

      attribute :source_security_group_name,
        :from => [:source_security_group, :group_name],
        :static => true

      populates_from(:describe_load_balancers) do |resp|
        resp.data[:load_balancer_descriptions].find do |lb|
          lb[:load_balancer_name] == name
        end
      end

      # A collection that help maanage the availability zones for
      # this load balancer.
      #
      # @example enable an availability zone
      #
      #   load_balancer.availability_zones.enable('us-west-2b')
      #
      # @example disable an availability zone
      #
      #   load_balancer.availability_zones.disable('us-west-2b')
      #
      # @example list enabled availability zoens
      #
      #   load_balancer.availability_zones.each do |zone|
      #     puts zone.name
      #   end
      #
      # @return [AvailabilityZoneCollection] Returns a collection that
      #   represents this load balancer's availability zones.  You can
      #   use this collection to enable and disable availability zones.
      def availability_zones
        AvailabilityZoneCollection.new(self)
      end

      # @return [ListenerCollection]
      def listeners
        ListenerCollection.new(self)
      end

      # @return [PolicyCollection]
      def policies
        LoadBalancerPolicyCollection.new(self)
      end

      # @return [InstanceCollection]
      def instances
        InstanceCollection.new(self)
      end

      # @return [BackendServerPolicyCollection]
      def backend_server_policies
        BackendServerPolicyCollection.new(self)
      end

      # Updates the configuration that drives the instance health checks.
      #
      # You only need to pass the options you want to change.  You can
      # call {#health_check} if you want to see what the
      # current configuration values are.
      #
      # @param [Hash] options
      #
      # @option options [Integer] :healthy_threshold Specifies the number of
      #   consecutive health probe successes required before moving the
      #   instance to the Healthy state.
      #
      # @option options [Integer] :unhealthy_threshold Specifies the number
      #   of consecutive health probe failures required before moving the
      #   instance to the Unhealthy state.
      #
      # @option options [Integer] :interval Specifies the approximate
      #   interval, in seconds, between health checks of an individual
      #   instance.
      #
      # @option options [Integer] :timeout Specifies the amount of time, in
      #   seconds, during which no response means a failed health probe.
      #   This value must be less than the `:interval` value.
      #
      # @option options [String] :target Specifies the instance being checked.
      #
      #   This option should be formatted like: "TCP:80"
      #
      #   * The protocol is either TCP, HTTP, HTTPS, or SSL.
      #   * The range of valid ports is one (1) through 65535.
      #
      #   TCP is the default, specified as a TCP: port pair, for example
      #   "TCP:5000". In this case a healthcheck simply attempts to open a
      #   TCP connection to the instance on the specified port. Failure to
      #   connect within the configured timeout is considered unhealthy.
      #
      #   SSL is also specified as SSL: port pair, for example, SSL:5000.
      #   For HTTP or HTTPS protocol, the situation is different. You have
      #   to include a ping path in the string. HTTP is specified as a
      #   HTTP:port;/;PathToPing; grouping, for example
      #   "HTTP:80/weather/us/wa/seattle". In this case, a HTTP GET request
      #   is issued to the instance on the given port and path. Any answer
      #   other than "200 OK" within the timeout period is considered
      #   unhealthy.
      #
      #   The total length of the HTTP ping target needs to be 1024 16-bit
      #   Unicode characters or less.
      #
      def configure_health_check options = {}

        new_config = health_check.merge(options)

        response = client.configure_health_check(
          :load_balancer_name => name,
          :health_check => new_config)

        new_config

      end

      # @note VPC only
      # @return [Array<EC2::Subnet>] Returns an array of VPC subnets
      #   for this load balancer.
      def subnets
        subnet_ids.map{|id| EC2::Subnet.new(id, :config => config) }
      end

      # @note VPC only
      # Returns the VPC security groups assigned to this load balancer.
      # @return [Array<EC2::SecurityGroup>]
      def security_groups
        security_group_ids.collect do |id|
          EC2::SecurityGroup.new(id, :config => config)
        end
      end

      # Generally you don't need to call this method, rather you can
      # just pass the load balancer as a source to the various
      # authorize and revoke methods of {EC2::SecurityGroup}:
      #
      #     security_group.authorize_ingress(load_balancer)
      #     security_group.revoke_ingress(load_balancer)
      #
      # @return [Hash] Returns a hash that can be passed to the following
      #   {EC2::SecurityGroup} methods as a source:
      #
      #   * {EC2::SecurityGroup#authorize_ingress}
      #   * {EC2::SecurityGroup#authorize_egress}
      #
      def source_security_group
        {
          :group_name => source_security_group_name,
          :user_id => source_security_group_owner_alias,
        }
      end

      # @return [Boolean] Returns true if the load balancer exists.
      def exists?
        client.describe_load_balancers(:load_balancer_names => [name])
        true
      rescue Errors::LoadBalancerNotFound
        false
      end

      # Deletes the load balancer.
      # @return [nil]
      def delete
        client.delete_load_balancer(:load_balancer_name => name)
        nil
      end

      protected

      def resource_identifiers
        [[:load_balancer_name, name]]
      end

      def get_resource attr_name
        client.describe_load_balancers(:load_balancer_names => [name])
      end

    end
  end
end
