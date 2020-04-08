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

    class LoadBalancerCollection

      include ListenerOpts
      include Core::Collection::WithNextToken

      # Creates and returns a load balancer.  A load balancer requires:
      #
      # * a unique name
      # * at least one availability zone
      # * at least one listener
      #
      # An example that creates a load balancer in two availability zones
      # with a single listener:
      #
      #     load_balancer = elb.load_balancers.create('my-load-balancer',
      #       :availability_zones => %w(us-west-2a us-west-2b),
      #       :listeners => [{
      #         :port => 80,
      #         :protocol => :http,
      #         :instance_port => 80,
      #         :instance_protocol => :http,
      #       }])
      #
      # @param [String] name The name of your load balancer.  The name must
      #   be unique within your set of load balancers.
      #
      # @param [Hash] options
      #
      # @option options [required,Array] :availability_zones An array of
      #   one or more availability zones.  Values may be availability zone
      #   name strings, or {AWS::EC2::AvailabilityZone} objects.
      #
      # @option options [required,Array<Hash>] :listeners An array of load
      #   balancer listener options:
      #     * `:protocol` - *required* - (String) Specifies the LoadBalancer
      #       transport protocol to use for routing - HTTP, HTTPS, TCP or SSL.
      #       This property cannot be modified for the life of the
      #       LoadBalancer.
      #     * `:load_balancer_port` - *required* - (Integer) Specifies the
      #       external LoadBalancer port number. This property cannot be
      #       modified for the life of the LoadBalancer.
      #     * `:instance_protocol` - (String) Specifies the protocol to use for
      #       routing traffic to back-end instances - HTTP, HTTPS, TCP, or SSL.
      #       This property cannot be modified for the life of the
      #       LoadBalancer. If the front-end protocol is HTTP or HTTPS,
      #       InstanceProtocol has to be at the same protocol layer, i.e., HTTP
      #       or HTTPS. Likewise, if the front-end protocol is TCP or SSL,
      #       InstanceProtocol has to be TCP or SSL. If there is another
      #       listener with the same InstancePort whose InstanceProtocol is
      #       secure, i.e., HTTPS or SSL, the listener's InstanceProtocol has
      #       to be secure, i.e., HTTPS or SSL. If there is another listener
      #       with the same InstancePort whose InstanceProtocol is HTTP or TCP,
      #       the listener's InstanceProtocol must be either HTTP or TCP.
      #     * `:instance_port` - *required* - (Integer) Specifies the TCP port
      #       on which the instance server is listening. This property cannot
      #       be modified for the life of the LoadBalancer.
      #     * `:ssl_certificate_id` - (String) The ARN string of the server
      #       certificate. To get the ARN of the server certificate, call the
      #       AWS Identity and Access Management UploadServerCertificate API.
      #
      # @option options [Array] :subnets An list of VPC subets to attach the
      #   load balancer to.  This can be an array of subnet ids (strings) or
      #   {EC2::Subnet} objects. VPC only.
      #
      # @option options [Array] :security_groups The security groups assigned to
      #   your load balancer within your VPC.  This can be an array of
      #   security group ids or {EC2::SecurityGroup} objects. VPC only.
      #
      # @option options [String] :scheme ('internal' The type of a load
      #   balancer.  Accepts 'internet-facing' or 'internal'. VPC only.
      #
      def create name, options = {}

        if listeners = options[:listeners]
          options[:listeners] = [listeners].flatten.map do |listener|
            format_listener_opts(listener)
          end
        end

        if zones = options[:availability_zones]
          options[:availability_zones] = [zones].flatten.map do |zone|
            zone.is_a?(EC2::AvailabilityZone) ? zone.name : zone
          end
        end

        if groups = options[:security_groups]
          options[:security_groups] = [groups].flatten.map do |group|
            group.is_a?(EC2::SecurityGroup) ? group.id : group
          end
        end

        if subnets = options[:subnets]
          options[:subnets] = [subnets].flatten.map do |subnet|
            subnet.is_a?(EC2::Subnet) ? subnet.id : subnet
          end
        end

        options[:load_balancer_name] = name.to_s

        resp = client.create_load_balancer(options)

        LoadBalancer.new(name, :dns_name => resp[:dns_name], :config => config)

      end

      # @return [LoadBalancer] Returns the load balancer with the given
      #   name.  This does not make a request, just returns a reference.
      def [] name
        LoadBalancer.new(name, :config => config)
      end

      protected
      def _each_item marker, options = {}, &block
        options = options.merge(:marker => marker) if marker
        response = client.describe_load_balancers(options)
        response.data[:load_balancer_descriptions].each do |description|

          load_balancer = LoadBalancer.new_from(
            :describe_load_balancers,
            description,
            description[:load_balancer_name],
            :config => config)

          yield(load_balancer)

        end
        response[:next_marker]
      end

    end
  end
end
