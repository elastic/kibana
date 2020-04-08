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

    # Represents an attachment of an Amazon EBS volume to an instance.
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
    class Attachment < Resource

      # @api private
      def initialize volume, instance, device, options = {}
        @volume = volume
        @instance = instance
        @device = device
        super
      end

      # @return [Volume] Returns the volume that is attached.
      attr_reader :volume

      # @return [Instance] Returns the EC2 instance the volume is attached to.
      attr_reader :instance

      # @return [String] Returns how the device is exposed to the instance
      #   (e.g. '/dev/sdh')
      attr_reader :device

      # @overload status
      # Returns the attachment status.  Possible values are:
      #
      #   * `:attaching`
      #   * `:attached`
      #   * `:detaching`
      #   * `:detached`
      # @return [Symbol] Returns the attachment status.
      attribute :status, :to_sym => true

      # @overload attach_time
      # @return [Time] Returns the time at which this attachment was created.
      attribute :attach_time

      # @overload delete_on_termination?
      # @return [Boolean] Returns `true` if the volume will be deleted
      #   on instance termination.
      attribute :delete_on_termination, :boolean => true

      populates_from(:describe_volumes) do |resp|
        find_attachment(resp)
      end

      populates_from(:attach_volume, :detach_volume) do |resp|
        if
          resp.volume_id == volume.id and
          resp.instance_id == instance.id and
          resp.device == device
        then
          resp
        end
      end

      # @return [Boolean] Returns true if the attachment exists.
      def exists?
        !describe_attachment.nil?
      end

      # Detaches the volume from its instance.
      # @option options [Boolean] :force Forces detachment if the
      #   previous detachment attempt did not occur cleanly (logging
      #   into an instance, unmounting the volume, and detaching
      #   normally). This option can lead to data loss or a
      #   corrupted file system. Use this option only as a last
      #   resort to detach a volume from a failed instance. The
      #   instance will not have an opportunity to flush file system
      #   caches or file system metadata. If you use this option,
      #   you must perform file system check and repair procedures.
      def delete options = {}
        client.detach_volume(options.merge(resource_options))
      end

      protected
      def resource_identifiers
        [
          [:volume_id, volume.id],
          [:instance_id, instance.id],
          [:device, device],
        ]
      end

      protected
      def describe_call
        client.describe_volumes(:volume_ids => [self.volume.id])
      end

      private
      def describe_attachment
        find_attachment(describe_call)
      end

      def find_attachment(resp)
        vol = resp.volume_index[volume.id] and
        attachments = vol.attachment_set and
        attachments.find do |att|
          att.instance_id == instance.id &&
            att.volume_id == volume.id &&
            att.device == device
        end
      end

    end

  end
end
