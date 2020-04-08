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

    # Represents a collection of EC2 images.  You can use this to
    # find out which images exist with the characteristics you are
    # interested in:
    #
    #     ec2 = EC2.new
    #     all_images = ec2.images
    #     amazon_owned_images = all_images.with_owner('amazon')
    #     my_images = all_images.with_owner('self')
    #     tagged_amis = all_images.tagged('mytag')
    #     tagged_amis.map(&:id)   # => ["ami-123", ...]
    #
    # You can also use it to create new images.  For example:
    #
    #     ec2.images.create(:instance_id => "i-123", :name => "my-image")
    #
    class ImageCollection < Collection

      include TaggedCollection
      include BlockDeviceMappings

      # @api private
      def initialize(options = {})
        @owners = options[:owners] || []
        @executable_users = options[:executable_users] || []
        super(options)
      end

      # @return [Image] image_id The ID of the image.
      def [] image_id
        super
      end

      # @return [ImageCollection] A new collection that only includes
      #   images owned by one or more of the specified AWS accounts.
      #   The IDs `:amazon` and `:self` can be used to include AMIs
      #   owned by Amazon or AMIs owned by you, respectively.
      #
      # @param [Array of Strings] owners The AWS account IDs by
      #   which the new collection should be filtered.
      def with_owner(*owners)
        collection_with(:owners => @owners + owners)
      end

      # @return [ImageCollection] A new collection that only includes
      #   images for which the specified user ID has explicit launch
      #   permissions. The user ID can be an AWS account ID, `:self`
      #   to return AMIs for which the sender of the request has
      #   explicit launch permissions, or `:all` to return AMIs with
      #   public launch permissions.
      #
      # @param [Array of Strings] users The AWS account IDs by which
      #   the new collection should be filtered.
      def executable_by(*users)
        collection_with(:executable_users => @executable_users + users)
      end

      # @yield [image] Each image in the collection.
      # @return [nil]
      def each(opts = {}, &block)
        opts[:owners] = @owners.map { |id| id.to_s } unless @owners.empty?
        opts[:executable_users] = @executable_users.map { |id| id.to_s } unless
          @executable_users.empty?
        response = filtered_request(:describe_images, opts)
        response.images_set.each do |i|
          image = Image.new_from(:describe_images, i, i.image_id, :config => config)
          yield(image)
        end
        nil
      end

      # Creates an AMI.  There are several ways to create an AMI
      # using this method; for detailed information on each strategy
      # see [the EC2 Developer Guide](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami.html).
      #
      # @param [Hash] options Options for creating the image.
      #   `:name` is required, and you must also specify one of the
      #   following options:
      #
      #     * `:instance_id`
      #     * `:image_location`
      #     * `:root_device_name`
      #
      # @option options [String] :instance_id The ID of a running
      #   instance.  This instance will be rebooted unless
      #   `:no_reboot` is set to `true`.
      #
      # @option options [String] :description A description of the
      #   new image.
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
      #   *Note*: This option is only valid when used with
      #   `:instance_id`.
      #
      # @option options [String] :image_location Full path to your
      #   AMI manifest in Amazon S3 storage.  This must be of the
      #   form "bucket_name/key".
      #
      # @option options [String] :architecture The architecture of
      #   the image.  Valid values:
      #
      #     * `:i386`
      #     * `:x86_64`
      #
      #   *Note*: This option is only valid with `:image_location`
      #   or `:root_device_name`
      #
      # @option options [String] :kernel_id The ID of the kernel to
      #   select.
      #
      #   *Note*: This option is only valid with `:image_location`
      #   or `:root_device_name`
      #
      # @option options [Image] :kernel The kernel image to use.
      #   Equivalent to passing `:kernel_id` with the ID of the
      #   image.
      #
      #   *Note*: This option is only valid with `:image_location`
      #   or `:root_device_name`
      #
      # @option options [String] :ramdisk_id The ID of the RAM disk
      #   to select. Some kernels require additional drivers at
      #   launch. Check the kernel requirements for information on
      #   whether you need to specify a RAM disk. To find kernel
      #   requirements, refer to the Resource Center and search for
      #   the kernel ID.
      #
      #   *Note*: This option is only valid with `:image_location`
      #   or `:root_device_name`
      #
      # @option options [Image] :ramdisk The ramdisk image to use.
      #   Equivalent to passing `:ramdisk_id` with the ID of the
      #   image.
      #
      #   *Note*: This option is only valid with `:image_location`
      #   or `:root_device_name`
      #
      # @option options [String] :root_device_name The root device
      #   name (e.g., /dev/sda1, or xvda).
      #
      # @option options [Hash] :block_device_mappings This must be a
      #   hash; the keys are device names to map, and the value for
      #   each entry determines how that device is mapped.  Valid
      #   values include:
      #
      #     * A string, which is interpreted as a virtual device name.
      #     * A hash with any of the following options.  One of
      #       `:snapshot`, `:snapshot_id` or `:volume_size` is
      #       required.
      #
      #         * `:snapshot` - A snapshot to use when creating the block device.
      #         * `:snapshot_id` - The ID of a snapshot to use when creating
      #           the block device.
      #         * `:volume_size` -] The size of volume to create, in gigabytes.
      #         * `:delete_on_termination` - Setting this to true causes EC2
      #           to delete the volume when the instance is terminated.
      # @return [Image]
      def create options = {}
        resp = case
        when options[:instance_id]
          client.create_image(options)
        when options[:image_location] || options[:root_device_name]
          if kernel = options.delete(:kernel)
            options[:kernel_id] = kernel.id
          end
          if ramdisk = options.delete(:ramdisk)
            options[:ramdisk_id] = ramdisk.id
          end
          options[:block_device_mappings] =
            translate_block_device_mappings(options[:block_device_mappings]) if
            options[:block_device_mappings]
          client.register_image(options)
        else
          raise(ArgumentError,
                "expected instance_id, image_location, " +
                "or root_device_name")
        end
        Image.new(resp.image_id, :config => config)
      end

      # @api private
      protected
      def member_class
        Image
      end

      # @api private
      protected
      def preserved_options
        super.merge(:owners => @owners, :executable_users => @executable_users)
      end

    end

  end
end
