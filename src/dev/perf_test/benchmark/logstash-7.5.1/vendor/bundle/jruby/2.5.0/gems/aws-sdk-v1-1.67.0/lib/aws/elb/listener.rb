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

    class Listener

      include Core::Model

      # @param [LoadBalancer] load_balancer The load balancer this listener
      #   belongs to.
      #
      # @param [Integer] port The external load balancer port number.
      #
      # @param [Hash] options
      #
      # @option (see ListenerCollection#create)
      #
      def initialize load_balancer, port, options = {}

        @load_balancer = load_balancer
        @port = port.to_i
        @protocol = options[:protocol]
        @instance_port = options[:instance_port]
        @instance_protocol = options[:instance_protocol]

        super

      end

      # @return [LoadBalancer]
      attr_reader :load_balancer

      # @return [Integer]
      attr_reader :port

      # @return [Symbol] Returns the protocl for this listener.
      def protocol
        proto = @protocol ||= _description[:listener][:protocol]
        proto.to_s.downcase.to_sym
      end

      # @return [Integer]
      def instance_port
        @instance_port ||= _description[:listener][:instance_port]
      end

      # @return [Symbol]
      def instance_protocol
        proto = @instance_protocol ||= _description[:listener][:instance_protocol]
        proto.to_s.downcase.to_sym
      end

      # Sets the certificate that terminates the specified listener's SSL
      # connections. The specified certificate replaces any prior
      # certificate for this listener.
      #
      # @param [String,IAM::ServerCertificate] server_certificate The ARN
      #   of an IAM::ServerCertificate or an IAM::ServerCertificate object.
      #
      # @return [nil]
      #
      def server_certificate= server_certificate

        arn = server_certificate.is_a?(IAM::ServerCertificate) ?
          server_certificate.arn : server_certificate

        client.set_load_balancer_listener_ssl_certificate(
          :load_balancer_name => load_balancer.name,
          :load_balancer_port => port,
          :ssl_certificate_id => arn)

        nil

      end

      # @return [IAM::ServerCertificate,nil] Returns the IAM::ServerCertificate
      #   associated with this listener, or nil if there is none.
      def server_certificate
        desc = _description
        if desc[:listener][:ssl_certificate_id]
          AWS.memoize do
            arn = desc[:listener][:ssl_certificate_id]
            iam = IAM.new(:config => config)
            iam.server_certificates.find{|cert| cert.arn == arn }
          end
        else
          nil
        end
      end

      # @return [LoadBalancerPolicy,nil] Returns the current policy for this
      #   listener.  Returns nil if no load balancer policy has been
      #   associated with it.
      def policy
        policy_name = _description[:policy_names].first
        policy_name ? load_balancer.policies[policy_name] : nil
      end

      # @param [String,LoadBalancerPolicy] policy_or_policy_name Sets
      #   the policy for this listener.
      # @return [LoadBalancerPolicy]
      def policy= policy_or_policy_name

        policy_name = policy_or_policy_name.is_a?(LoadBalancerPolicy) ?
          policy_or_policy_name.name : policy_or_policy_name.to_s

        client.set_load_balancer_policies_of_listener(
          :load_balancer_name => load_balancer.name,
          :load_balancer_port => port,
          :policy_names => [policy_name])

        LoadBalancerPolicy.new(load_balancer, policy_name, :config => config)

      end

      # Removes the current policy from this listener.
      # @return [nil]
      def remove_policy

        client.set_load_balancer_policies_of_listener(
          :load_balancer_name => load_balancer.name,
          :load_balancer_port => port,
          :policy_names => [])

        nil

      end

      # Returns true if this listener exists.
      #
      #     load_balancer = ELB.new.load_balancers['my-load-balancer']
      #     listener = load_balancer.listeners[80] # port 80
      #     listener.exists?
      #
      # @return [Boolean] Returns true if the load balancer has a listener
      #   on this port.
      def exists?
        !_description.nil?
      rescue AWS::Core::Resource::NotFound
        false
      end

      # Deletes the listener from its load balancer.
      # @return [nil]
      def delete

        client.delete_load_balancer_listeners(
          :load_balancer_name => load_balancer.name,
          :load_balancer_ports => [port])

        nil

      end

      # @api private
      def inspect
        "#{self.class.name} port:#{port}>"
      end

      # @api private
      def eql? other
        other.is_a?(Listener) and
        other.load_balancer == load_balancer and
        other.port == port
      end
      alias_method :==, :eql?

      protected

      def _description
        load_balancer.listener_descriptions.find do |desc|
          desc[:listener][:load_balancer_port] == port
        end
      end

    end
  end
end
