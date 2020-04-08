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

    # For S3 buckets with versioning enabled, objects will store versions
    # each time you write to them.
    #
    #     object = bucket.objects['myobj']
    #     object.write('1')
    #     object.write('2')
    #     object.write('3')
    #
    #     object.versions.collect(&:read)
    #     #=> ['1', '2', '3']
    #
    # To see all the version id for a particular object, access the any particular version,
    # and see the latest version:
    #
    #     object.versions.each do |version| puts version.version_id end
    #     #=> T2TwAiZ3SmNr7tOfe0QBa4RZnSb3GSLq
    #     #=> kAEHC_ysT65bT4P3zyYOP1ELA6ajar_6
    #     #=> itHPX6m8na_sog0cAtkgP3QITEE8v5ij
    #
    #     object.versions['itHPX6m8na_sog0cAtkgP3QITEE8v5ij']
    #     #=> <AWS::S3::ObjectVersion:<<bucket>>:myobj:itHPX6m8na_sog0cAtkgP3QITEE8v5ij>
    #
    #     object.versions.latest
    #     #=> <AWS::S3::ObjectVersion:<<bucket>>:myobj:T2TwAiZ3SmNr7tOfe0QBa4RZnSb3GSLq>
    #
    # If you know the id of a particular version you can get that object.
    #
    #     bucket.objects['myobj'].version[version_id].delete
    #
    class ObjectVersionCollection

      include Core::Model
      include Enumerable

      # @return [S3Object] The object this collection belongs to.
      attr_reader :object

      # @param [S3Object] object
      def initialize object, options = {}
        @object = object
        super(options)
      end

      # Returns an object that represents a single version of the {#object}.
      # @param [String] version_id
      # @return [ObjectVersion]
      def [] version_id
        ObjectVersion.new(object, version_id)
      end

      # @note Generally you will just want to grab the object key its key.
      # @return [ObjectVersion] Returns the latest version of this object.
      def latest
        self.find{|version| true }
      end

      # Yields once for each version of the {#object}.
      #
      # @yield [object_version]
      # @yieldparam [ObectVersion] object_version
      # @return [nil]
      def each &block
        object.bucket.versions.with_prefix(object.key).each do |version|
          if version.key == object.key
            yield(version)
          end
        end
        nil
      end

    end
  end
end
