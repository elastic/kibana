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

    # Represents an Amazon EBS volume.
    #
    # @example Create an empty 15GiB volume and attach it to an instance
    #   volume = ec2.volumes.create(:size => 15,
    #                               :availability_zone => "us-west-2a")
    #   attachment = volume.attach_to(ec2.instances["i-123"], "/dev/sdf")
    #   sleep 1 until attachment.status != :attaching
    #
    # @example Remove all attachments from a volume and then delete it
    #   volume.attachments.each do |attachment|
    #     attachment.delete(:force => true)
    #   end
    #   sleep 1 until volume.status == :available
    #   volume.delete
    #
    # @attr_reader [Symbol] status The status of the volume.
    #   Possible values:
    #
    #     * `:creating`
    #     * `:available`
    #     * `:in_use`
    #     * `:deleting`
    #     * `:deleted`
    #     * `:error`
    #
    # @attr_reader [Integer] size The size of the volume in
    #   gigabytes.
    #
    # @attr_reader [String] availability_zone_name Name of the
    #   Availability Zone in which the volume was created.
    #
    # @attr_reader [Time] create_time The time at which the volume
    #   was created.
    #
    # @attr_reader [String] type The volume type.
    #
    # @attr_reader [Boolean] encrypted Returns `true` if the volume is
    #   encrypted.
    #
    # @attr_reader [String] iops
    #
    class Volume < Resource

      include TaggedItem

      # @api private
      def initialize(id, opts = {})
        @id = id
        super(opts)
      end

      # @return [String] Returns the volume ID.
      attr_reader :id

      attribute :status, :to_sym => true

      alias_method :state, :status

      attribute :snapshot_id, :static => true

      attribute :size, :static => true

      attribute :availability_zone_name, :from => :availability_zone,
        :static => true

      attribute :create_time, :static => true

      attribute :attachment_set

      attribute :iops, :static => true

      attribute :type, :from => :volume_type, :static => true

      attribute :encrypted, :static => true

      alias encrypted? encrypted

      populates_from(:create_volume) do |resp|
        resp if resp.volume_id == id
      end

      populates_from(:describe_volumes) do |resp|
        resp.volume_index[id]
      end

      # Deletes the volume.
      def delete
        client.delete_volume(:volume_id => id)
        nil
      end

      # @return [Snapshot] A new snapshot created from the volume.
      #
      # @param [String] description An optional description of the
      #   snapshot.  May be up to 255 characters in length.
      def create_snapshot description = nil
        opts = { :volume => self }
        opts[:description] = description if description
        SnapshotCollection.new(:config => config).create(opts)
      end

      # Attaches the volume to an instance.
      #
      # @param [Instance] instance The instance to which the volume
      #   attaches. The volume and instance must be within the same
      #   Availability Zone and the instance must be running.
      #
      # @param [String] device How the device is exposed to the
      #   instance (e.g., /dev/sdh, or xvdh).
      #
      # @return [Attachment] An object representing the attachment,
      #   which you can use to query the attachment status.
      def attach_to(instance, device)
        resp = client.attach_volume(
          :volume_id => id,
          :instance_id => instance.id,
          :device => device
        )
        instance = Instance.new(resp.instance_id, :config => config)
        Attachment.new(self, instance, resp.device, :config => config)
      end
      alias_method :attach, :attach_to

      # Detaches the volume from an instance.
      #
      # @param [Instance] instance The instance to detach from.
      # @param [String] device The device name.
      # @param [Hash] options
      # @option (see Attachment#delete)
      # @return [Attachment] Returns the no-longer valid attachment.
      def detach_from(instance, device, options = {})
        instance = Instance.new(instance.id, :config => config),
        a = Attachment.new(self, instance, device, :config => config)
        a.delete(options)
        a
      end

      # @return [Boolean] True if the volume exists.
      def exists?
        resp = client.describe_volumes(:filters => [
          { :name => 'volume-id', :values => [id] }
        ])
        resp.volume_index.key?(id)
      end

      # @return [Snapshot] Snapshot from which the volume was created
      #   (may be nil).
      def snapshot
        snapshot_id ? Snapshot.new(snapshot_id, :config => config) : nil
      end

      # @return [AvailabilityZone] Returns the Availability
      #   Zone in which the volume was created.
      def availability_zone
        if name = availability_zone_name
          AvailabilityZone.new(name, :config => config)
        end
      end

      # @return [AttachmentCollection] The collection of attachments
      #   that involve this volume.
      def attachments
        AttachmentCollection.new(self, :config => config)
      end

    end

  end
end
