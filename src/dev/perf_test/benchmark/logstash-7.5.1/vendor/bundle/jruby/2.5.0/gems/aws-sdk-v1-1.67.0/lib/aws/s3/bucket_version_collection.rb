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
  class S3

    # A collection of versioned objects for the entire bucket.
    #
    # @see PrefixedCollection
    class BucketVersionCollection

      include PrefixAndDelimiterCollection

      # @param [Bucket] bucket
      def initialize bucket, options = {}
        @bucket = bucket
        super
      end

      # @return [Bucket] The bucket this collection belongs to.
      attr_reader :bucket

      # @return [ObjectVersion] Returns the most recently created object
      #   version in the entire bucket.
      def latest
        first
        #self.find{|version| true }
      end

      # Yields once for each version in the bucket.
      #
      # @yield [object_version]
      #
      # @yieldparam [ObjectVersion] object_version
      #
      # @return nil
      #
      def each options = {}, &block; super; end

      # @api private
      protected
      def each_member_in_page(page, &block)
        super
        page.versions.each do |version|
          object_version = ObjectVersion.new(bucket.objects[version.key],
                                             version.version_id, 
                                             :delete_marker => version.delete_marker?, 
                                             :last_modified => version.last_modified)
          yield(object_version)
        end
      end

      # @api private
      protected
      def list_request(options)
        client.list_object_versions(options)
      end

      # @api private
      protected
      def limit_param; :max_keys; end

      # @api private
      protected
      def pagination_markers; super + [:version_id_marker]; end

    end
  end
end
