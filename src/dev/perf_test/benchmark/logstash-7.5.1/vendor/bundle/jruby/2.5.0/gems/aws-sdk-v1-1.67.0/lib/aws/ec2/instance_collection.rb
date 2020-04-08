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

    # Represents a collection of EC2 instances.  Typically you
    # should get an instance of this class by calling
    # {EC2#instances}.
    #
    # To run an instance:
    #
    #     ec2.instances.create(:image_id => "ami-1b814f72")
    #
    # To get an instance by ID:
    #
    #     i = ec2.instances["i-12345678"]
    #     i.exists?
    #
    # To get a map of instance IDs to instance status:
    #
    #      ec2.instances.inject({}) { |m, i| m[i.id] = i.status; m }
    #     # => { "i-12345678" => :running, "i-87654321" => :shutting_down }
    #
    class InstanceCollection < Collection

      include TaggedCollection
      include BlockDeviceMappings

      # Runs one or more EC2 instances.
      #
      # @example Running a single instance
      #   i = ec2.instances.create(:image_id => "ami-8c1fece5")
      #   sleep 10 while i.status == :pending
      #
      # @example Running multiple instances with the same parameters
      #
      #   instances = ec2.instances.create(
      #     :image_id => "ami-8c1fece5",
      #     :count => 10)
      #
      #   sleep 1 while instances.any? {|i| i.status == :pending }
      #
      # @example Specifying block device mappings
      #
      #   ec2.instances.create({
      #     :image_id => "ami-8c1fece5",
      #     :block_device_mappings => [{
      #       :device_name => "/dev/sda2",
      #       :ebs => {
      #         :volume_size => 15, # 15 GiB
      #         :delete_on_termination => true
      #       }
      #     }]
      #   })
      #
      # @example Launching in an Amazon VPC subnet
      #
      #   ec2.instances.create(
      #     :image_id => "ami-8c1fece5",
      #     :subnet => "subnet-abc123ef")
      #
      # @param [Hash] options Options for new instance.  `:image_id` is
      #   the only required option.
      #
      # @option options [Integer] :count How many instances to request.  By
      #   default one instance is requested.  You can specify this
      #   either as an integer or as a Range, to indicate the
      #   minimum and maximum number of instances to run.  Note that
      #   for a new account you can request at most 20 instances at
      #   once.
      #
      # @option options [String] :iam_instance_profile The name or
      #   ARN of an IAM instance profile.  This provides credentials
      #   to the EC2 instance(s) via the instance metadata service.
      #
      #
      # @option options [Array<Hash>] :block_device_mappings Specifies how block
      #   devices are exposed to the instance. Each mapping is made up of a
      #   virtualName and a deviceName.
      #
      #     * `:virtual_name` - (String) Specifies the virtual device name.
      #     * `:device_name` - (String) Specifies the device name (e.g.,
      #       /dev/sdh).
      #     * `:ebs` - (Hash) Specifies parameters used to automatically setup
      #       Amazon EBS volumes when the instance is launched.
      #       * `:snapshot_id` - (String) The ID of the snapshot from which the
      #         volume will be created.
      #       * `:volume_size` - (Integer) The size of the volume, in
      #         gigabytes.
      #       * `:delete_on_termination` - (Boolean) Specifies whether the
      #         Amazon EBS volume is deleted on instance termination.
      #       * `:volume_type` - (String) Valid values include:
      #         * `standard`
      #         * `io1`
      #         * `gp2`
      #       * `:iops` - (Integer)
      #     * `:no_device` - (String) Specifies the device name to suppress
      #       during instance launch.
      #
      # @option options [Boolean] :monitoring_enabled Setting this to
      #   `true` enables CloudWatch monitoring on the instances once they
      #   are started.
      #
      # @option options [String] :availability_zone Specifies the
      #   availability zone where the instance should run.  Without
      #   this option, EC2 will choose an availability zone for you.
      #
      # @option options [String] :placement_group Specifies the
      #   cluster placement group where the instance should run.
      #
      # @option options [String] :image_id ID of the AMI you want to
      #   launch.
      #
      # @option options [String] :key_name The name of the key pair to
      #   use.  Note: Launching public images without a key pair ID
      #   will leave them inaccessible.
      #
      # @option options [KeyPair] :key_pair A {KeyPair} that should
      #   be used when launching an instance.
      #
      # @option options [Array] :security_groups Security groups are used
      #   to determine network access rules for the instances.
      #   `:security_groups` can be a single value or an array of values.
      #   Values should be group name strings or {SecurityGroup} objects.
      #
      # @option options [Array<String>] :security_group_ids Security groups
      #   are used to determine network access rules for the instances.
      #   `:security_group_ids` accepts a single ID or an array of security
      #   group IDs.
      #
      # @option options [String] :user_data Arbitrary user data.  You
      #   do not need to encode this value.
      #
      # @option options [String] :instance_type The type of instance to
      #   launch, for example "m1.small".
      #
      # @option options [String] :kernel_id The ID of the kernel with
      #   which to launch the instance.
      #
      # @option options [String] :ramdisk_id The ID of the RAM disk to
      #   select. Some kernels require additional drivers at
      #   launch. Check the kernel requirements for information on
      #   whether you need to specify a RAM disk. To find kernel
      #   requirements, refer to the Resource Center and search for
      #   the kernel ID.
      #
      # @option options [Boolean] :disable_api_termination Specifies
      #   whether you can terminate the instance using the EC2
      #   API. A value of true means you can't terminate the
      #   instance using the API (i.e., the instance is "locked"); a
      #   value of false means you can. If you set this to true, and
      #   you later want to terminate the instance, you must first
      #   enable API termination.  For example:
      #
      #       i = ec2.instances.create(:image_id => "ami-8c1fece5",
      #                                :disable_api_termination => true)
      #       i.api_termination_disabled?        # => true
      #       i.terminate                        # raises an exception
      #       i.api_termination_disabled = false
      #       i.terminate                        # terminates the instance
      #
      # @option options [String] :instance_initiated_shutdown_behavior
      #   Determines whether the instance stops or terminates on
      #   instance-initiated shutdown.
      #
      # @option options [Subnet,String] :subnet (nil) The VPC Subnet (or
      #   subnet id string) to launch the instance in.
      #
      # @option options [String] :private_ip_address (nil) If you're using VPC,
      #   you can optionally use this option to assign the instance a
      #   specific available IP address from the subnet (e.g., '10.0.0.25').
      #   This option is not valid for instances launched outside a VPC (i.e.
      #   those launched without the :subnet option).
      #
      # @option options [Boolean] :dedicated_tenancy (false) Instances
      #   with dedicated tenancy will not share physical hardware with
      #   instances outside their VPC.  *NOTE:* Dedicated tenancy
      #   incurs an additional service charge.  This option is not
      #   valid for instances launched outside a VPC (e.g. those
      #   launched without the :subnet option).
      #
      # @option options [Boolean] :ebs_optimized (false) EBS-Optimized instances
      #   enable Amazon EC2 instances to fully utilize the IOPS provisioned on
      #   an EBS volume. EBS-optimized instances deliver dedicated throughput
      #   between Amazon EC2 and Amazon EBS, with options between 500 Mbps and
      #   1000 Mbps depending on the instance type used. When attached to
      #   EBS-Optimized instances, Provisioned IOPS volumes are designed
      #   to deliver within 10% of their provisioned performance 99.9% of the time.
      #   *NOTE:* EBS Optimized instances incur an additional service charge. This
      #   optional is only valid for certain instance types.
      #
      # @option options [Boolean] :associate_public_ip_address (false)
      #
      # @return [Instance or Array] If a single instance is being created,
      #   this returns an {EC2::Instance} to represent the newly
      #   created instance.  Otherwise it returns an array of instance
      #   objects.
      #
      def create options = {}

        if profile = options.delete(:iam_instance_profile)
          profile = case profile
          when /^arn:aws:iam::/ then { :arn => profile }
          when String then { :name => profile }
          when Hash then profile
          else
            msg = "expected a name or ARN string for :iam_instance_profile"
          end
          options[:iam_instance_profile] = profile
        end

        if image = options.delete(:image)
          options[:image_id] = image.id
        end

        if kernel = options.delete(:kernel)
          options[:kernel_id] = kernel.id
        end

        if ramdisk = options.delete(:ramdisk)
          options[:ramdisk_id] = ramdisk.id
        end

        if key_pair = options.delete(:key_pair)
          options[:key_name] = key_pair.name
        end

        options = count_options(options).merge(options)
        options.delete(:count)

        options[:user_data] = Base64.encode64(options[:user_data]).strip if
          options[:user_data]

        if options[:block_device_mappings].is_a?(Hash)
          options[:block_device_mappings] =
            translate_block_device_mappings(options[:block_device_mappings])
        end

        options[:monitoring] = { :enabled => true } if
          options[:monitoring_enabled]
        options.delete(:monitoring_enabled)

        placement = {}

        if options[:availability_zone]
          placement[:availability_zone] = options[:availability_zone].to_s
          options.delete(:availability_zone)
        end

        if options[:placement_group]
          placement[:group_name] = options[:placement_group].to_s
          options.delete(:placement_group)
        end

        if options[:dedicated_tenancy]
          placement[:tenancy] = 'dedicated'
          options.delete(:dedicated_tenancy)
        end

        options[:placement] = placement unless placement.empty?

        network_interface = {}

        if options[:associate_public_ip_address]
          if subnet_id = subnet_id_option(options)
            network_interface[:subnet_id] = subnet_id
            options.delete(:subnet)
            options.delete(:subnet_id)
          end
          if private_ip_address = options.delete(:private_ip_address)
            network_interface[:private_ip_address] = private_ip_address
          end
          if security_group_ids = options.delete(:security_group_ids)
            network_interface[:groups] = Array(security_group_ids)
          end
          network_interface[:associate_public_ip_address] = true
          network_interface[:device_index] = 0
        end
        options.delete(:associate_public_ip_address)

        options[:network_interfaces] = [network_interface] unless network_interface.empty?

        if subnet_id = subnet_id_option(options)
          options[:subnet_id] = subnet_id
        end

        security_group_opts(options)
        
        options[:client_token] = SecureRandom.uuid unless options[:client_token]

        resp = client.run_instances(options)

        if options[:min_count] == options[:max_count] and
            options[:min_count] == 1
          self[resp.instances_set.first.instance_id]
        else
          resp[:instances_set].map {|i| self[i[:instance_id]] }
        end
      end

      alias_method :run, :create

      # @yield [Instance] Yields each instance in the collection.
      def each(&block)
        response = filtered_request(:describe_instances)
        response.reservation_set.each do |reservation|
          reservation.instances_set.each do |i|
            instance = Instance.new_from(:describe_instances, i,
              i.instance_id, :config => config)
            yield(instance)
          end
        end
      end

      # @return [Instance] Returns an object representing the EC2 instance
      #   with the given ID.
      def [] id
        super
      end

      # @api private
      protected
      def member_class
        Instance
      end

      # @api private
      private
      def count_options options
        min = max = 1
        count = options[:count]
        case count
        when Range
          min = count.begin
          max = (count.exclude_end? ? count.end - 1 : count.end)
        when Integer
          min = max = count
        end
        { :min_count => min, :max_count => max }
      end

      # @api private
      private
      def security_group_opts options

        ids = []
        names = []

        Array(options.delete(:security_group_ids)).each do |g|
          ids << g
        end

        # this may be security group objects or names
        Array(options.delete(:security_groups)).each do |g|
          case g
          when String        then names << g
          when SecurityGroup then ids << g.id
          else
            raise ArgumentError, ':security_groups may only contain ' +
              'security group names, ids or objects'
          end
        end

        return if ids.empty? and names.empty?

        if options[:subnet_id]

          # vpc instances only accepts security group ids, so any group
          # names must be converted to ids, which requires a service
          # request
          unless names.empty?
            ec2 = EC2.new(:config => config)
            groups = ec2.security_groups.filter('group-name', names)
            ids += groups.collect{|g| g.id }
          end
          options[:security_group_ids] = ids

        else

          # non-vpc instances accept both group names and ids, so
          # we accept whichever
          options[:security_groups] = names unless names.empty?
          options[:security_group_ids] = ids unless ids.empty?

        end
      end

    end
  end
end
