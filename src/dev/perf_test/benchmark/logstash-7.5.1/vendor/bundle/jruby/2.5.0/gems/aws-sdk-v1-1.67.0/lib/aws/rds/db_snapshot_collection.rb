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
  class RDS
    class DBSnapshotCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @filters = options[:filters] || {}
        super
      end

      # @param [String] db_snapshot_id
      # @return [DBSnapshot] Returns a {DBSnapshot} with the given ID.
      def [] db_snapshot_id
        DBSnapshot.new(db_snapshot_id, :config => config)
      end

      # Filters the DB snapshots to those beloning to a single db instance.
      # You may pass the ID of a db instance or a {DBInstance} object.
      #
      # @param [String,DBInstance] db_instance A db instance identifier
      #   string or a {DBInstance} object.
      #
      # @return [DBSnapshotCollection]
      #
      def db_instance db_instance
        id = db_instance.is_a?(Core::Model) ? db_instance.id : db_instance
        filter(:db_instance_identifier, id.to_s.downcase)
      end

      # Filters the DB snapshots to those of a given snapshot type.
      # @param [String] snapshot_type
      # @return [DBSnapshotCollection]
      def with_type snapshot_type
        filter(:snapshot_type, snapshot_type)
      end
      alias_method :type, :with_type

      # @param [String,Symbol] name
      # @param [Mixed] value
      # @return [DBSnapshotCollection]
      def filter name, value
        options = {}
        options[:filters] = @filters.merge(name.to_s.to_sym => value)
        options[:config] = config
        DBSnapshotCollection.new(options)
      end

      protected

      def _each_item marker, max_records, options = {}, &block

        options = @filters.merge(options)
        options[:marker] = marker if marker
        options[:max_records] = [[20,max_records].max,100].min if max_records

        response = client.describe_db_snapshots(options)
        response.data[:db_snapshots].each do |details|

          db_snapshot = DBSnapshot.new_from(
              :describe_db_snapshots,
              details,
              details[:db_snapshot_identifier],
              :config => config)

          yield(db_snapshot)

        end

        response.data[:marker]
      end

    end
  end
end
