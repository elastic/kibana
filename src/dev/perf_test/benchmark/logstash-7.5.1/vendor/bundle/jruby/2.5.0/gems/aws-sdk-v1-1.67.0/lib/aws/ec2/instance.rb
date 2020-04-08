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

require 'base64'

module AWS
  class EC2

    # Represents an EC2 instance.
    #
    # @attr [String] user_data Arbitrary metadata that is available
    #   to the instance while it is running.  This interface handles
    #   the details of encoding the user data for transmission; you
    #   should set the user data exactly as you want it to be made
    #   available to the instance.
    #
    #   The instance must be in a stopped state to change user data;
    #   for example:
    #
    #       i.user_data             # => "HELLO"
    #       i.status                # => :running
    #       i.user_data = "GOODBYE" # raises an exception
    #       i.stop; sleep 1 until i.status == :stopped
    #       i.user_data = "GOODBYE" # => "GOODBYE"
    #
    # @attr [String] instance_type The instance type,
    #   e.g. "m1.small".  The instance must be in a stopped state to
    #   change the instance type.
    #
    # @attr [Boolean] ebs_optimized The instance must be in a stopped state to
    #   change the ebs_optimized state.
    #
    # @attr [Boolean] api_termination_disabled? True if the instance
    #   cannot be terminated using the {#terminate} method.  This
    #   attribute can be changed at any time.
    #
    # @attr [String] instance_initiated_shutdown_behavior Valid
    #   values are:
    #
    #     * "stop"] When the instance shuts down, it will go into a
    #       "stopped" state.
    #     * "terminate"] When the instance shuts down, it will be
    #       terminated.
    #
    # @attr [Boolean] source_dest_check
    #
    # @attr_reader [String] image_id Image ID of the AMI used to
    #   launch the instance.
    #
    # @attr_reader [String] key_name The name of the key pair with
    #   which this instance was associated at launch.
    #
    # @attr [String] kernel_id The ID of the kernel that the image
    #   currently uses.  The instance must be in a stopped state to
    #   change this attribute.
    #
    # @attr [String] ramdisk_id The ID of the RAM disk that the
    #   image currently uses.  The instance must be in a stopped
    #   state to change this attribute.
    #
    # @attr_reader [Symbol] root_device_type The root device type
    #   used by the AMI. The AMI can use an Amazon EBS or instance
    #   store root device.  Valid values:
    #
    #     * `:ebs`
    #     * `:instance_store`
    #
    # @attr_reader [String] root_device_name The name of the root
    #   device.
    #
    # @attr_reader [String] private_dns_name The DNS name of the
    #   instance within the EC2 network.
    #
    # @attr_reader [String] dns_name The DNS name of the instance on
    #   the internet.
    #
    # @attr_reader [Integer] ami_launch_index The AMI launch index,
    #   which can be used to find this instance within the launch
    #   group.
    #
    # @attr_reader [String] private_ip_address The private IP
    #   address assigned to the instance.
    #
    # @attr_reader [String] ip_address The IP address of the
    #   instance.
    #
    # @attr_reader [Symbol] status The instance status.
    #   Valid values are:
    #
    #     * `:pending`
    #     * `:running`
    #     * `:shutting_down`
    #     * `:terminated`
    #     * `:stopping`
    #     * `:stopped`
    #
    # @attr_reader [Integer] status_code The numeric instance status code.
    #
    # @attr_reader [Symbol] architecture The architecture of the image.
    #
    # @attr_reader [Symbol] virtualization_type The instance's
    #   virtualization type.  Valid values:
    #
    #     * `:paravirtual`
    #     * `:hvm`
    #
    # @attr_reader [String] reservation_id The ID of the reservation
    #   in which this instance was launched.
    #
    # @attr_reader [String] requester_id ID of the requester that
    #   launched the instance on your behalf (e.g., AWS Management
    #   Console, Auto Scaling).
    #
    # @attr_reader [String] owner_id ID of the AWS account that owns
    #   the reservation in which the instance was launched.
    #
    # @attr_reader [Symbol] monitoring The status of CloudWatch
    #   monitoring for the instance.  Valid values:
    #
    #     * `:enabled`
    #     * `:disabled`
    #     * `:pending`
    #
    # @attr_reader [String] state_transition_reason A string
    #   describing the reason for the last state transition.
    #
    # @attr_reader [Time] launch_time The time at which the instance
    #   was launched.
    #
    # @attr_reader [String] platform A string describing the
    #   platform of the image (e.g. "windows").
    #
    # @attr_reader [Symbol] hypervisor The instance's hypervisor
    #   type.  Valid values:
    #
    #     * `:ovm`
    #     * `:xen`
    #
    # @attr_reader [String] client_token Idempotency token you
    #   provided when you launched the instance.
    #
    # @attr_reader [String,nil] vpc_id Instances launched in a VPC have
    #   a vpc_id.  Normal EC2 instances return nil.
    #
    # @attr_reader [String,nil] subnet_id Instances launched in a VPC have
    #   a subnet_id.  Normal EC2 instances return nil.
    #
    # @attr_reader [String,nil] iam_instance_profile_id
    #
    # @attr_reader [String,nil] iam_instance_profile_arn
    #
    class Instance < Resource

      include TaggedItem

      # Creates an object that represents the instance with the
      # given ID.  It's usually easier to get an instance of this
      # class by calling {InstanceCollection#[]} or
      # {InstanceCollection#each}.
      def initialize(instance_id, opts = {})
        super
        @id = instance_id
      end

      # @return [String] Returns the instance id.
      attr_reader :id
      alias_method :instance_id, :id

      # @api private
      def self.reservation_attributes
        @reservation_attributes ||= {}
      end

      # @api private
      def self.reservation_attribute name, options = {}, &block
        attr = attribute(name, options, &block)
        reservation_attributes[attr.name] = attr
      end

      # @api private
      def self.describe_call_attributes
        @describe_call_attributes ||= {}
      end

      # @api private
      def self.mutable_describe_attributes
        @mutable_describe_attributes ||= {}
      end

      # @api private
      def self.describe_call_attribute name, options = {}, &block
        attr = attribute(name, options, &block)
        describe_call_attributes[attr.name] = attr
      end

      # @api private
      def self.mutable_describe_call_attribute name, options = {}, &block
        attr = mutable_attribute(name, options, &block)
        describe_call_attributes[attr.name] = attr
      end

      # @api private
      def self.mutable_describe_attribute name, options = {}, &block
        attr = mutable_attribute(name, options, &block)
        mutable_describe_attributes[attr.name] = attr
      end

      reservation_attribute :reservation_id, :static => true

      reservation_attribute :owner_id, :static => true

      reservation_attribute :requester_id, :static => true

      describe_call_attribute :private_dns_name

      describe_call_attribute :dns_name

      alias_method :public_dns_name, :dns_name

      describe_call_attribute :product_codes, :static => true

      describe_call_attribute :ami_launch_index, :static => true

      describe_call_attribute :monitoring do
        translates_output {|v| v.state.to_sym }
      end

      describe_call_attribute :private_ip_address

      describe_call_attribute :ip_address

      alias_method :public_ip_address, :ip_address

      describe_call_attribute :architecture, :to_sym => true, :static => true

      describe_call_attribute :root_device_type, :to_sym => true, :static => true

      describe_call_attribute :root_device_name, :static => true

      describe_call_attribute :block_device_mapping

      protected :block_device_mapping

      describe_call_attribute :instance_lifecycle, :to_sym => true

      describe_call_attribute :virtualization_type, :to_sym => true, :static => true

      describe_call_attribute :hypervisor, :to_sym => true, :static => true

      describe_call_attribute :placement, :static => true

      describe_call_attribute :state_transition_reason, :from => :reason

      describe_call_attribute :launch_time, :static => true

      describe_call_attribute :platform, :static => true

      describe_call_attribute :client_token

      describe_call_attribute :image_id, :static => true

      describe_call_attribute :key_name, :static => true

      describe_call_attribute :vpc_id, :static => true

      describe_call_attribute :subnet_id, :static => true

      describe_call_attribute :iam_instance_profile_id,
        :from => :iam_instance_profile,
        :static => true do
        translates_output{|profile| profile[:id] }
      end

      describe_call_attribute :iam_instance_profile_arn,
        :from => :iam_instance_profile,
        :static => true do
        translates_output{|profile| profile[:arn] }
      end

      attribute :status do
        translates_output{|state| state.name.tr("-","_").to_sym }
      end

      attribute :status, :from => [:instance_state, :name], :to_sym => true

      attribute :status_code, :from => [:instance_state, :code]

      mutable_describe_call_attribute :instance_type

      mutable_describe_call_attribute :ebs_optimized

      mutable_describe_call_attribute :kernel_id, :set_as => :kernel

      mutable_describe_call_attribute :ramdisk_id, :set_as => :ramdisk

      mutable_describe_attribute :source_dest_check do
        translates_output{|bool| bool.to_s == "true" }
      end

      alias_method :source_dest_check?, :source_dest_check

      mutable_describe_call_attribute :group_set

      describe_call_attribute :network_interface_set

      mutable_describe_attribute(:user_data) do
        translates_output {|v| Base64.decode64(v) if v }
        translates_input {|v| Base64.encode64(v).strip }
      end

      mutable_describe_attribute :api_termination_disabled?,
        :from => :disable_api_termination

      mutable_describe_attribute :instance_initiated_shutdown_behavior

      provider(:describe_instances) do |provider|
        provider.find {|resp| resp.reservation_index[id] }
        provider.provides *reservation_attributes.keys
      end

      provider(:describe_instances) do |provider|
        provider.find {|resp| resp.instance_index[id] }
        provider.provides *describe_call_attributes.keys
        provider.provides :status
        provider.provides :status_code
      end

      provider(:run_instances) do |provider|
        provider.find {|resp| resp.instances_set.find{|i| i.instance_id == id } }
        provider.provides *describe_call_attributes.keys
        provider.provides :status
        provider.provides :status_code
      end

      provider(:run_instances) do |provider|
        provider.find {|resp| resp if resp.instances_set.find{|i| i.instance_id == id } }
        provider.provides *reservation_attributes.keys
      end

      # These are the few attributes that are only returned by
      # :desribe_instance_attribute and are *NOT* returned by
      # :describe_instances.  To make matters worse, only one of
      # them is returned per :describe_instance_attribute call.
      mutable_describe_attributes.values.each do |attr|

        attr_opt_name = Core::Inflection.class_name(attr.from.to_s)
        attr_opt_name = attr_opt_name[0,1].downcase + attr_opt_name[1..-1]

        provider(:describe_instance_attribute) do |provider|
          provider.find do |resp|
            if
              resp.request_options[:instance_id] == id and
              resp.request_options[:attribute] == attr_opt_name
            then
              return resp
            end
          end
          provider.provides(attr.name, :value_wrapped => true)
        end

      end

      provider(:terminate_instances, :start_instances, :stop_instances) do |provider|
        provider.find do |resp|
          resp.instances_set.find {|i| i.instance_id == id }
        end
        provider.provides :status, :from => [:current_state, :name]
        provider.provides :status_code, :from => [:current_state, :code]
      end

      provider(:monitor_instances, :unmonitor_instances) do |provider|
        provider.find do |resp|
          resp.instances_set.find {|i| i.instance_id == id }
        end
        provider.provides :monitoring
      end

      # @return [Boolean] Returns true if this is an EC2 VPC instance.
      def vpc?
        !!vpc_id
      end

      # @return [VPC,nil] Returns the VPC this instance was launched in.
      #   If this instance was not launched inside a VPC, nil is returned.
      def vpc
        if vpc_id
          VPC.new(vpc_id, :config => config)
        end
      end

      # @return [Subnet,nil] Returns the VPC subnet this instance was
      #   launched in.  Returns nil if this was not launched in a VPC.
      def subnet
        if subnet_id
          Subnet.new(subnet_id, :vpc_id => vpc_id, :config => config)
        end
      end

      # @return [Array<NetworkInterface>] Returns a list of elastic network
      #   interfaces attached to this instance (VPC only).  Non-vpc
      #   instance may not have attached network interfaces.
      def network_interfaces
        network_interface_set.collect do |ni|
          NetworkInterface.new_from(:describe_network_interfaces, ni,
            ni.network_interface_id, :config => config)
        end
      end

      # Attaches a network interface to this instance (VPC only).
      #
      # @param [NetworkInterface,String] network_interface A network interface
      #   (or network interface id string) to attach to this vpc instance.
      #
      # @param [Hash] options
      #
      # @option (see NetworkInterface#attach)
      #
      # @return [nil]
      #
      def attach_network_interface network_interface, options = {}
        if network_interface.is_a?(NetworkInterface)
          network_interface.attach(self, options)
        else
          i = NetworkInterface.new(network_interface, :config => config)
          i.attach(self, options)
        end
        nil
      end

      # @return [Array<SecurityGroup>] Returns a list of security
      #   groups the instance belongs to.
      def security_groups
        (group_set || []).collect do |g|
          SecurityGroup.new(g.group_id, :name => g.group_name, :config => config)
        end
      end
      alias_method :groups, :security_groups

      # @return [Hash<String,Attachment>] Returns a hash of attachments.
      #   The keys are device name strings (e.g. '/dev/sda') and the values
      #   are {Attachment} objects.
      # @note This method will not return data for ephemeral volumes.
      # @see {#block_devices}
      def attachments
        (block_device_mapping || []).inject({}) do |m, mapping|
          if mapping[:ebs]
            device = mapping[:device_name]
            volume = Volume.new(mapping[:ebs][:volume_id], :config => config)
            attachment = Attachment.new(volume, self, device, :config => config)
            m[device] = attachment
          end
          m
        end
      end
      alias_method :block_device_mappings, :attachments

      # Returns a list of block device mappings.
      #
      #     instance.block_devices
      #     #=>
      #     [
      #       {
      #         :device_name => "/dev/sda2",
      #         :ebs => {
      #           :volume_id => "vol-123",
      #           :status => "attaching",
      #           :attach_time => time,
      #           :delete_on_termination => true
      #         }
      #       }, {
      #         :device_name => "/dev/sdb",
      #         :virtual_name => "ephemeral0",
      #       }
      #     ]
      #
      # @return [Array<Hash>] Returns a list of block device mappings.  This
      #   list may contain ephemeral volumes.
      def block_devices
        block_device_mapping.to_a
      end

      # Enables monitoring for this instance.
      # @return [nil]
      def enable_monitoring
        client.monitor_instances(:instance_ids => [id])
        nil
      end

      # Disables monitoring for this instance.
      # @return [nil]
      def disable_monitoring
        client.unmonitor_instances(:instance_ids => [id])
        nil
      end

      # Enables or disables monitoring for this instance.
      # @param [Boolean] state A true or false value.  Enables monintoring
      #   for a true value, disables it for a false value.
      def monitoring_enabled= state
        state ? enable_monitoring : disable_monitoring
      end

      # @return [Booelan] Returns `true` if CloudWatch monitoring is
      #   enabled for this instance.
      def monitoring_enabled?
        monitoring == :enabled
      end

      # @return [Boolean] true if the instance is a Spot instance.
      def spot_instance?
        instance_lifecycle == :spot
      end

      # @return [String] The availability zone where the instance is
      #   running.
      def availability_zone
        if p = placement
          p.availability_zone
        end
      end

      # @return [Boolean] Returns true if the instance has dedicated tenancy.
      #   This will be false for all non-VPC instances.  Dedicated Tenancy
      #   comes at extra cost.
      def dedicated_tenancy?
        if p = placement
          p.tenancy == 'dedicated'
        else
          false
        end
      end

      # @return [Image] The AMI used to launch the instance.
      def image
        Image.new(image_id, :config => config)
      end

      # @return [KeyPair] The key pair with which this instance was
      #   associated at launch.
      def key_pair
        KeyPair.new(key_name, :config => config) if key_name
      end

      # Creates an AMI from this instance.
      #
      # @param [String] name A name for the new image you're
      #   creating.  Constraints: 3-128 alphanumeric characters,
      #   parenthesis (()), commas (,), slashes (/), dashes (-), or
      #   underscores(_)
      #
      # @param [Hash] options Additional options for creating the image.
      #
      # @option options [String] :description A description of the new image.
      #
      # @option options [Boolean] :no_reboot By default this
      #   option is set to `false`, which means Amazon EC2
      #   attempts to cleanly shut down the instance before image
      #   creation and reboots the instance afterwards. When the
      #   option is set to `true`, Amazon EC2 does not shut down
      #   the instance before creating the image. When this option
      #   is used, file system integrity on the created image cannot
      #   be guaranteed.
      #
      # @return [Image] The newly created image.
      def create_image name, options = {}
        images = ImageCollection.new(:config => config)
        images.create(options.merge(:instance_id => id, :name => name))
      end

      # Retrieves the console output for the instance, returning +nil+ if it
      # is not available yet.
      # @return [String] the console output
      # @return [nil] if no output is available
      def console_output
        output = client.get_console_output(:instance_id => self.id)[:output]
        Base64.decode64(output) if output
      end

      # Associates the elastic IP address with this instance.
      #
      # @overload associate_elastic_ip(elastic_ip)
      #   @param [ElasticIp,String] elastic_ip An Elastic ip address
      #     (VPC or non-VPC) or a public ip address string (non-VPC only).
      #
      # @overload associate_elastic_ip(allocation_id)
      #   @param [String] allocation_id The allocation id of a
      #     VPC elastic ip address.
      #
      # @return [nil]
      #
      def associate_elastic_ip elastic_ip

        client_opts = {}
        client_opts[:instance_id] = self.id

        if vpc?
          client_opts[:allocation_id] = elastic_ip.is_a?(ElasticIp) ?
            elastic_ip.allocation_id :
            elastic_ip.to_s
        else
          client_opts[:public_ip] = elastic_ip.to_s
        end

        client.associate_address(client_opts)
        nil

      end

      alias_method :ip_address=, :associate_elastic_ip

      # Disassociates an attached elastic IP address from this instance.
      # Raises an exception if there is no elastic IP address associated
      # with this instance.
      def disassociate_elastic_ip
        if ip = self.elastic_ip
          ip.disassociate
        else
          raise "instance #{id} does not have an associated elastic ip"
        end
      end

      # @return [ElasticIp,nil] Returns an elastic IP address if one
      #   is associated with this instance, nil otherwise.
      def elastic_ip
        ips = ElasticIpCollection.new(:config => config)
        ips.filter('instance-id', id).first
      end

      # @return [Boolean] Returns true if an elastic IP address is
      #   associated with this instance, false otherwise.
      def has_elastic_ip?
        !elastic_ip.nil?
      end

      # @return [Boolean] Returns true if the instance exists according to
      #   EC2.
      def exists?
        client.describe_instances(:filters => [
          { :name => "instance-id", :values => [id] }
        ]).instance_index.key?(id)
      end

      # Resets the kernel to its default value.
      def reset_kernel_id
        client.reset_instance_attribute(
          :instance_id => id, :attribute => "kernel").return
      end

      # Resets the RAM disk to its default value.
      def reset_ramdisk_id
        client.reset_instance_attribute(
          :instance_id => id, :attribute => "ramdisk").return
      end

      # Terminates the instance.
      # @return [nil]
      def terminate
        instance_action :terminate
      end
      alias_method :delete, :terminate

      # Reboots the instance.
      # @return [nil]
      def reboot
        instance_action :reboot
      end

      # Starts the instance, assuming it is in a stopped state.
      # @see stop
      # @return [nil]
      def start
        instance_action :start
      end

      # Stops the instance, eventually putting it into a stopped state.
      # @return [nil]
      def stop
        instance_action :stop
      end

      # This produces an image of an EC2 instance for use in another
      # virtualization environment and then writes the image to a
      # S3 bucket.
      #
      # ## Granting EC2 write access to your bucket
      #
      # Before you can export an image to an S3 bucket, you must modify
      # the bucket ACL.  You only need to do this once per bucket.
      #
      #     s3.buckets['bucket-name'].acl.change do |acl|
      #       acl.grant(:read_acp).to(:amazon_customer_email => 'vm-import-export@amazon.com')
      #       acl.grant(:write).to(:amazon_customer_email => 'vm-import-export@amazon.com')
      #     end
      #
      # ## Performing the export
      #
      # Simply call #export_to_s3 on your instance.   Only instances
      # derived from your own ImportInstance tasks may be exported.
      #
      #      task = ec2.instances['i-12345678'].export_to_s3('bucket-name')
      #
      # ## Downloading the results
      #
      # Given a completed export task you can download the final image:
      #
      #     File.open('image.ova', 'wb') {|f| f.write(task.s3_object.read) }
      #
      # @param [S3::Bucket,String] bucket The destination bucket.  May
      #   be the name of the bucket (string) or a {S3::Bucket} object. The
      #   bucket must exist and grant write permissiosn to the AWS account
      #   'vm-import-export@amazon.com.'.
      #
      # @param [Hash] options
      #
      # @option options [String] :target_environment ('vmware') The target
      #   virtualization environment.  Valid values include: 'vmware', 'citrix'
      #   and 'microsoft'.
      #
      # @option options [String] :disk_image_format The format for the exported
      #    image.  Defaults to 'vmdk' if `:target_environemnt` is 'vmware',
      #    otherwise, 'vhd'.
      #
      # @option options [String] :container_format The container format used to
      #   combine disk images with metadata (such as OVF). If absent, only
      #   the disk image will be exported.  Defaults to 'ova' if
      #   `:target_environment` is 'vmware', otherwise ommited.
      #
      # @option options [String] :description Description of the conversion
      #   task or the resource being exported.
      #
      # @option options [String] :prefix (nil) The image is written to a
      #   single object in the bucket at the key:
      #
      #       "#{prefix}#{export_task_id}.#{disk_image_format}"
      #
      # @return [ExportTask]
      #
      def export_to_s3 bucket, options = {}

        bucket_name = bucket.is_a?(S3::Bucket) ? bucket.name : bucket.to_s

        opts = {}
        opts[:instance_id] = instance_id
        opts[:description] = options[:description] if options[:description]
        opts[:target_environment] = options[:target_environment] || 'vmware'
        opts[:export_to_s3] = {}
        opts[:export_to_s3][:s3_bucket] = bucket_name
        [:disk_image_format, :container_format, :s3_prefix].each do |opt|
          opts[:export_to_s3][opt] = options[opt] if options.key?(opt)
        end

        resp = client.create_instance_export_task(opts)

        ExportTask.new_from(
          :create_instance_export_task,
          resp[:export_task],
          resp[:export_task][:export_task_id],
          :config => config)

      end

      protected

      def find_in_response resp
        resp.instance_index[id]
      end

      def instance_action name
        client.send("#{name}_instances", :instance_ids => [id])
        nil
      end

      def get_resource attribute
        if self.class.mutable_describe_attributes.include?(attribute.name)
          describe_attribute_call(attribute)
        else
          describe_call
        end
      end

      def attributes_from_response_object(obj)
        if atts = super(obj)
          if obj[:instance_state]
            atts[:status] = obj[:instance_state].name.tr("-","_").to_sym
          end
          atts
        end
      end

    end

  end
end
