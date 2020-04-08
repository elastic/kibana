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

    # Represents a collection of Amazon EBS snapshots.  Typically
    # you should get an instance of this class by calling
    # {EC2#snapshots}.
    #
    # @example Create a snapshot from a volume
    #   ec2.snapshots.create(:volume => ec2.volumes["vol-123"],
    #                        :description => "my snapshot")
    #   # or:
    #   ec2.volumes["vol-123"].create_snapshot("my snapshot")
    #
    # @example Get a snapshot by ID
    #   snapshot = ec2.snapshots["vol-123"]
    #   snapshot.exists?
    #
    # @example Get a map of snapshot IDs to snapshot status
    #   ec2.snapshots.inject({}) { |m, s| m[s.id] = s.status; m }
    #   # => { "snap-12345678" => :pending, "snap-87654321" => :completed }
    class SnapshotCollection < Collection

      include TaggedCollection

      # @api private
      def initialize(options = {})
        @owners = options[:owners] || []
        @restorable_by = options[:restorable_by] || []
        super(options)
      end

      # @yield [Snapshot] Yields each snapshot in the collection.
      # @return [nil]
      def each(&block)
        opts = {}
        opts[:owner_ids] = @owners.map { |id| id.to_s } unless @owners.empty?
        opts[:restorable_by_user_ids] = @restorable_by.map { |id| id.to_s } unless
          @restorable_by.empty?
        resp = filtered_request(:describe_snapshots, opts)
        resp[:snapshot_set].each do |details|
          snapshot = Snapshot.new_from(:describe_snapshots, details,
            details[:snapshot_id], :config => config)
          yield(snapshot)
        end
        nil
      end

      # @return [SnapshotCollection] A new collection that only
      #   includes snapshots owned by one or more of the specified AWS
      #   accounts.  The IDs `:amazon` and `:self` can be used to
      #   include snapshots owned by Amazon or AMIs owned by you,
      #   respectively.
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
      def restorable_by(*users)
        collection_with(:restorable_by => @restorable_by + users)
      end

      # Creates a snapshot of an Amazon EBS volume and stores it in
      # Amazon S3. You can use snapshots for backups, to make
      # identical copies of instance devices, and to save data
      # before shutting down an instance. For more information about
      # Amazon EBS, go to the [Amazon Elastic Compute Cloud User Guide](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/index.html?using-ebs.html).
      #
      # @return [Snapshot] An object representing the new snapshot.
      #
      # @param [Hash] opts Options for creating the snapshot.
      #   Either `:volume` or `:volume_id` is required.
      #
      # @option opts [Volume] :volume The Amazon EBS volume of which
      #   to take a snapshot.
      #
      # @option opts [String] :volume_id The ID of the Amazon EBS
      #   volume of which to take a snapshot.
      #
      # @option opts [String] :description An optional description of
      #   the snapshot.  May contain up to 255 characters.
      #
      # @return [Snapshot]
      #
      def create opts = {}
        if volume = opts.delete(:volume)
          opts[:volume_id] = volume.id
        end
        resp = client.create_snapshot(opts)
        Snapshot.new(resp.snapshot_id, :config => config)
      end

      # @api private
      protected
      def member_class
        Snapshot
      end

      # @api private
      protected
      def preserved_options
        super.merge(:owners => @owners, :restorable_by => @restorable_by)
      end

    end

  end
end
