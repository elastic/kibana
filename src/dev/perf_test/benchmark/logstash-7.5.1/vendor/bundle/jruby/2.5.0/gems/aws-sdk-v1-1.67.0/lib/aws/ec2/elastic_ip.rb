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

    # @attr_reader [String,nil] instance_id Returns the instance id if
    #   assigned to an EC2 instance, nil otherwise.
    #
    # @attr_reader [String,nil] allocation_id
    #   The ID representing the allocation of the address for use with Amazon
    #   VPC.
    #
    # @attr_reader [String] domain Indicates whether this elastic ip address
    #   is for EC2 instances ('standard') or VPC instances ('vpc').
    #
    # @attr_reader [String,nil] association_id The ID of the association
    #   between this elastic ip address and an EC2 VPC instance (VPC only).
    #
    # @attr_reader [String,nil] network_interface_id The ID of the network
    #   interface (VPC only).
    #
    # @attr_reader [String,nil] network_interface_owner_id
    #   The ID of the AWS account that owns the network interface (VPC only).
    #
    class ElasticIp < Resource

      def initialize public_ip, options = {}
        @public_ip = public_ip
        super
      end

      # @return [String] The public IP address.
      attr_reader :public_ip

      alias_method :ip_address, :public_ip

      attribute :instance_id

      # vpc related attributes

      attribute :allocation_id, :static => true

      attribute :domain, :static => true

      attribute :association_id

      attribute :network_interface_id

      attribute :network_interface_owner_id

      populates_from(:describe_addresses) do |resp|
        resp.address_index[public_ip]
      end

      # @return [Boolean] Returns true if this is an EC2 VPC Elastic IP.
      def vpc?
        domain == 'vpc'
      end

      # @return [Boolean] Returns true if this IP address is associated
      #   with an EC2 instance or a network interface.
      def associated?
        !!(instance_id || association_id)
      end

      alias_method :attached?, :associated?

      # @return [Instance,nil] If associated, returns the {Instance} this
      #   elastic IP address is associated to, nil otherwise.
      def instance
        if instance_id = self.instance_id
          Instance.new(instance_id, :config => config)
        end
      end

      # @return [NetworkInterface,nil] Returns the network interface this
      #   elastic ip is associated with.  Returns `nil` if this is not
      #   associated with an elastic ip address.
      def network_interface
        if nid = network_interface_id
          NetworkInterface.new(nid, :config => config)
        end
      end

      # Releases the elastic IP address.
      #
      # (For non-VPC elastic ips) Releasing an IP address automatically
      # disassociates it from any instance it's associated with.
      #
      # @return [nil]
      def delete
        if vpc?
          client.release_address(:allocation_id => allocation_id)
        else
          client.release_address(:public_ip => public_ip)
        end
        nil
      end
      alias_method :release, :delete

      # Associates this elastic IP address with an instance or a network
      # interface.  You may provide `:instance` or `:network_interface`
      # but not both options.
      #
      #     # associate with an instance
      #     eip.associate :instance => 'i-12345678'
      #
      #     # associate with a network interface
      #     eip.associate :network_interface => 'ni-12345678'
      #
      # @param [Hash] options
      #
      # @option options [String,Instance] :instance The id of an instance
      #   or an {Instance} object.
      #
      # @option options [String,NetworkInterface] :network_interface The id
      #   of a network interface or a {NetworkInterface} object.
      #
      # @return [String] Returns the resulting association id.
      #
      def associate options

        client_opts = {}

        [:instance,:network_interface,:private_ip_address].each do |opt|
          if value = options[opt]
            	key = ( opt.to_s=='instance' || opt.to_s=='network_interface' ? opt.to_s+"_id" : opt.to_s ) 
		client_opts[:"#{key}"] = value.is_a?(Resource) ? value.id : value
          end
        end

        if vpc?
          client_opts[:allocation_id] = allocation_id
        else
          client_opts[:public_ip] = public_ip
        end

        resp = client.associate_address(client_opts)
        resp.data[:association_id]

      end

      # Disassociates this elastic IP address from an EC2 instance.
      # Raises an exception if this elastic IP is not currently
      # associated with an instance.
      # @return [nil]
      def disassociate
        if vpc?
          client.disassociate_address(:association_id => association_id)
        else
          client.disassociate_address(:public_ip => public_ip)
        end
        nil
      end

      # @return [Boolean] Returns true the elastic ip address exists in
      #   your account.
      def exists?
        begin
          get_resource
          true
        rescue Errors::InvalidAddress::NotFound
          false
        end
      end

      # @return [String] Returns the public IP address
      def to_s
        public_ip.to_s
      end

      # @api private
      protected
      def resource_id_method
        :public_ip
      end

      # @api private
      protected
      def response_id_method
        :public_ip
      end

      # @api private
      protected
      def describe_call_name
        :describe_addresses
      end

      # @api private
      protected
      def self.describe_call_name
        :describe_addresses
      end

    end
  end
end
