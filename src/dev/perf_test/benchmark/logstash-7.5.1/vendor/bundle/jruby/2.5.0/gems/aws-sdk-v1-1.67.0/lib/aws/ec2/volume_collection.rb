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

    # Represents a collection of Amazon EBS volumes.  Typically you
    # should get an instance of this class by calling {EC2#volumes}.
    #
    # @example Create an empty 15GiB volume
    #   ec2.volumes.create(:size => 15, :availability_zone => "us-west-2a")
    #
    # @example Get a volume by ID
    #   volume = ec2.volumes["vol-123"]
    #   volume.exists?
    #
    # @example Get a map of volume IDs to volume status
    #   ec2.volumes.inject({}) { |m, v| m[v.id] = v.status; m }
    #   # => { "vol-12345678" => :available, "vol-87654321" => :in_use }
    class VolumeCollection < Collection

      include TaggedCollection

      # @yield [Volume] Yields each volume in the collection.
      # @return [nil]
      def each(&block)
        resp = filtered_request(:describe_volumes)
        resp.volume_set.each do |v|

          volume = Volume.new_from(:describe_volumes, v,
            v.volume_id, :config => config)

          yield(volume)

        end
        nil
      end

      # Creates a new Amazon EBS volume that any Amazon EC2 instance
      # in the same Availability Zone can attach to. For more
      # information about Amazon EBS, go to the [Amazon Elastic Compute Cloud User Guide](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/index.html?using-ebs.html).
      #
      # @return [Volume] An object representing the new volume.
      #
      # @param [Hash] options Options for creating the volume.
      #   `:availability_zone` and one of `:size`, `:snapshot`, or
      #   `:snapshot_id` is required.
      #
      # @option options [Integer] :size The size of the volume, in
      #   GiBs.  Valid values: 1 - 1024.  If `:snapshot` or
      #   `:snapshot_id` is specified, this defaults to the size of
      #   the specified snapshot.
      #
      # @option options [Snapshot] :snapshot The snapshot from which to
      #   create the new volume.
      #
      # @option options [String] :snapshot_id The ID of the snapshot
      #   from which to create the new volume.
      #
      # @option options [String, AvailabilityZone] :availability_zone
      #   The Availability Zone in which to create the new volume.
      #   To get a list of the availability zones you can use, see
      #   {EC2#availability_zones}.
      #
      # @option options [String] :iops
      #
      # @option options [String] :volume_type
      #
      # @option options [Boolean] :encrypted (false)
      #   When true, the volume will be encrypted.
      #   For more information, refer to [Amazon EBS Encryption](http://http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSEncryption.html)
      #
      # @return [Volume]
      #
      def create options = {}
        if snapshot = options.delete(:snapshot)
          options[:snapshot_id] = snapshot.id
        end
        resp = client.create_volume(options)
        Volume.new_from(:create_volume, resp, resp.volume_id, :config => config)
      end

      # @api private
      protected
      def member_class
        Volume
      end

    end

  end
end
