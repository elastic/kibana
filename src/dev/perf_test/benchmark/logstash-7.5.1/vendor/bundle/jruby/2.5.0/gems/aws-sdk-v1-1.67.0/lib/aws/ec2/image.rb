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

    # Represents an Amazon Machine Image (AMI).
    #
    # @attr_reader [String] name The name of the AMI that was provided
    #   during image creation.
    #
    # @attr [String] description A description of the image.
    #
    # @attr_reader [String] location The location of the AMI.
    #
    # @attr_reader [Symbol] state Current state of the AMI. If the
    #   state is `:available`, the image is successfully registered
    #   and available for launching.  Valid values:
    #
    #     * `:available`
    #     * `:pending`
    #     * `:failed`
    #
    # @attr_reader [String] owner_id The AWS account ID of the image owner.
    #
    # @attr_reader [String] owner_alias The AWS account alias (e.g.,
    #   `"amazon"`) or AWS account ID that owns the AMI.
    #
    # @attr_reader [Symbol] architecture The architecture of the
    #   image (e.g. `:i386`).
    #
    # @attr_reader [Symbol] type The type of image.
    #   Valid values are:
    #
    #     * `:machine`
    #     * `:kernel`
    #     * `:ramdisk`
    #
    # @attr_reader [String] kernel_id The kernel ID associated with
    #   the image, if any. Only applicable for machine images.
    #
    # @attr_reader [String] ramdisk_id The RAM disk ID associated
    #   with the image, if any. Only applicable for machine images.
    #
    # @attr_reader [String] platform Value is `windows` for Windows
    #   AMIs; otherwise blank.
    #
    # @attr_reader [Object] state_reason The reason for the image's
    #   most recent state change.  The return value is an object with
    #   the following methods:
    #
    #     * `code` - Reason code for the state change.
    #     * `message` - A textual description of the state change.
    #
    # @attr_reader [Symbol] root_device_type The root device type
    #   used by the AMI. Possible values:
    #
    #     * `:ebs`
    #     * `:instance_store`
    #
    # @attr_reader [String] root_device_name The root device name
    #   (e.g., `"/dev/sda1"`, or `"xvda"`).
    #
    # @attr_reader [Symbol] virtualization_type The type of
    #   virtualization of the AMI.  Possible values:
    #
    #     * `:paravirtual`
    #     * `:hvm`
    #
    # @attr_reader [Symbol] hypervisor The image's hypervisor type.
    #   Possible values are:
    #
    #     * `:ovm`
    #     * `:xen`
    #
    # @attr_reader [Array<String>] product_codes Returns an array of
    #   product codes attached to this instance.
    #
    # @attr_reader [String] creation_date The date and time the image was created in ISO-8601 format
    #
    class Image < Resource

      include TaggedItem
      include HasPermissions

      # @param [String] image_id
      def initialize image_id, options = {}
        @image_id = image_id
        super
      end

      # @return [String] The ID of the AMI.
      attr_reader :image_id

      alias_method :id, :image_id

      attribute :name, :static => true

      mutable_attribute :description

      attribute :location, :from => :image_location, :static => true

      attribute :state, :from => :image_state, :to_sym => true

      attribute :owner_id, :from => :image_owner_id, :static => true

      attribute :owner_alias, :from => :image_owner_alias, :static => true

      attribute :architecture, :to_sym => true, :static => true

      attribute :type, :from => :image_type, :to_sym => true, :static => true

      attribute :kernel_id, :static => true

      attribute :ramdisk_id, :static => true

      attribute :platform, :static => true

      attribute :state_reason

      attribute :root_device_type, :to_sym => true, :static => true

      attribute :root_device_name, :static => true

      attribute :virtualization_type, :to_sym => true, :static => true

      attribute :hypervisor, :to_sym => true, :static => true

      attribute :block_device_mapping

      protected :block_device_mapping

      attribute :product_codes, :static => true do
        translates_output do |list|
          (list || []).collect{|item| item.product_code }
        end
      end
      
      attribute :creation_date, :static => true

      populates_from(:describe_images) do |resp|
        resp.image_index[id]
      end

      alias_method :launch_permissions, :permissions

      # @note This method will not return data for ephemeral volumes.
      # @return [Hash] Returns a hash of block
      #   device mappings for the image.  In each entry, the key is
      #   the device name (e.g. `"/dev/sda1"`) and the value is an
      #   hash with the following keys that return information
      #   about the block device:
      #
      #     * `:snapshot_id` - The ID of the snapshot that will be used to
      #       create this device (may be `nil`).
      #     * `:volume_size` - The size of the volume, in GiBs.
      #     * `:delete_on_termination` - True if the Amazon EBS volume is
      #       deleted on instance termination.
      #
      # @see {#block_devices}
      def block_device_mappings
        (block_device_mapping || []).inject({}) do |h, mapping|
          if ebs = mapping[:ebs]
            h[mapping[:device_name]] = ebs
          end
          h
        end
      end

      # @return [Array<Hash>] Returns a list of all block device mappings.
      #   This list may contain ephemeral volumes.
      def block_devices
        block_device_mapping.to_a
      end

      # Deregisters this AMI. Once deregistered, the AMI cannot be
      # used to launch new instances.
      # @return [nil]
      def deregister
        client.deregister_image(:image_id => id)
        nil
      end

      alias_method :delete, :deregister

      # Runs a single instance of this image.
      #
      # @param [Hash] options
      # @option (see InstanceCollection#create)
      # @return (see InstanceCollection#create)
      def run_instance options = {}
        instances = InstanceCollection.new(:config => config)
        instances.create(options.merge(:image => self))
      end

      # Runs multiple instances of this image.
      #
      # @param [Integer] count How many instances to request.  You can specify
      #   this either as an integer or as a Range, to indicate the
      #   minimum and maximum number of instances to run.  Note that
      #   for a new account you can request at most 20 instances at
      #   a time.
      # @param [Hash] options
      # @option (see InstanceCollection#create)
      # @return [Array<Instance>] An array containing an {Instance} object for
      #   each instance that was run.
      def run_instances count, options = {}
        run_instance(options.merge(:count => count))
      end

      # @return [Boolean] Returns `true` if the AMI exists (is returned by
      #   the DescribeImages action).
      def exists?
        resp = client.describe_images(:filters => [
          { :name => "image-id", :values => [id] }
        ])
        !resp.images_set.empty?
      end

      # @return [Image] The kernel associated with the image, if
      #   any. Only applicable for machine images.
      def kernel
        if id = kernel_id
          Image.new(id, :config => config)
        end
      end

      # @return [Image] The RAM disk associated with the image, if
      #   any. Only applicable for machine images.
      def ramdisk
        if id = ramdisk_id
          Image.new(id, :config => config)
        end
      end

      # Adds one or more product codes:
      #
      #     image.add_product_codes 'ABCXYZ', 'MNOPQR'
      #
      # You can also pass an array of product codes:
      #
      #     image.add_product_codes ['ABCXYZ', 'MNOPQR']
      #
      # @param [Array<String>] product_codes
      #
      # @return [nil]
      #
      def add_product_codes *product_codes
        client_opts = {}
        client_opts[:image_id] = self.id
        client_opts[:product_codes] = product_codes.flatten
        client.modify_image_attribute(client_opts)
        nil
      end

      # @api private
      def __permissions_attribute__
        "launchPermission"
      end

    end

  end
end
