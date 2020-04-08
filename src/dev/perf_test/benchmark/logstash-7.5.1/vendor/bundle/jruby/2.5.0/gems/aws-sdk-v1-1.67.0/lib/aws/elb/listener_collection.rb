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

    class ListenerCollection

      include ListenerOpts
      include Core::Collection::Simple

      def initialize load_balancer, options = {}
        @load_balancer = load_balancer
        super
      end

      # @return [LoadBalancer]
      attr_reader :load_balancer

      # @param [Hash] options
      #
      # @option options [Integer] :port Specifies the external
      #   load balancer port number. This property cannot be modified for
      #   the life of the LoadBalancer.
      #
      # @option options [String,Symbol] :protocol Specifies the load balancer
      #   transport protocol to use for routing.  Valid values include:
      #
      # @option options [Integer] :instance_port Specifies the TCP port on
      #   which the instance server is listening. This property cannot be
      #   modified for the life of the load balancer.
      #
      # @option options [String,Symbol] :instance_protocol Specifies the
      #   protocol to use for routing traffic to back-end instances.  Valid
      #   values include:
      #
      #   * :http, 'HTTP'
      #   * :https, 'HTTPS'
      #   * :tcp, 'TCP'
      #   * :ssl, 'SSL'
      #
      #   This property cannot be modified for the life of the load balacner.
      #
      #   NOTE: If the front-end protocol is HTTP or HTTPS, `:instance_protocol`
      #   has to be at the same protocol layer, i.e., HTTP or HTTPS. Likewise,
      #   if the front-end protocol is TCP or SSL, `:instance_protocol` has
      #   to be TCP or SSL.
      #
      #   NOTE: If there is another listener with the same `:instance_port`
      #   whose `:instance_protocol` is secure, i.e., HTTPS or SSL, the
      #   listener's `:instance_protocol` has to be secure, i.e., HTTPS
      #   or SSL. If there is another listener with the same `:instance_port`
      #   whose `:instance_protocol` is HTTP or TCP, the listener's
      #   `:instance_protocol` must be either HTTP or TCP.
      #
      #   * :tcp, 'TCP'
      #   * :http, 'HTTP'
      #
      #   This property cannot be modified for the life of the load balancer.
      #
      # @option options [String,IAM::ServerCertificate] :server_certificate The
      #   ARN string of an IAM::ServerCertifcate or an IAM::ServerCertificate
      #   object.  Reqruied for HTTPs listeners.
      #
      # @return [Listener]
      def create options = {}

        format_listener_opts(options)

        client.create_load_balancer_listeners(
          :load_balancer_name => load_balancer.name,
          :listeners => [options])

        Listener.new(load_balancer,
          options[:load_balancer_port],
          options.merge(:config => config))

      end

      # @return [Listener]
      def [] port
        Listener.new(load_balancer, port, :config => config)
      end

      protected
      def _each_item options = {}
        load_balancer.listener_descriptions.each do |description|

          port = description[:listener][:load_balancer_port]

          options = {}
          options[:config] = config
          options.merge!(description[:listener])

          yield(Listener.new(load_balancer, port, options))

        end
      end

    end

  end
end
