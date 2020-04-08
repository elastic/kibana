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

    # Represents a collection of buckets.
    #
    # You can use this to create a bucket:
    #
    #     s3.buckets.create("mybucket")
    #
    # You can get a handle for a specific bucket with indifferent
    # access:
    #
    #     bucket = s3.buckets[:mybucket]
    #     bucket = s3.buckets['mybucket']
    #
    # You can also use it to find out which buckets are in your account:
    #
    #     s3.buckets.collect(&:name)
    #     #=> ['bucket1', 'bucket2', ...]
    #
    class BucketCollection

      include Core::Model
      include Enumerable

      # Creates and returns a new Bucket.  For example:
      #
      # @note If your bucket name contains one or more periods and it
      #   is hosted in a non-US region, you should make requests
      #   against the bucket using the S3 endpoint specific to the
      #   region in which your bucket resides. For example:
      #
      #       s3 = AWS::S3.new(:region => "eu-west-1")
      #       bucket = s3.buckets.create("my.eu.bucket")
      #
      #   For a full list of endpoints and regions, see
      #   {http://docs.aws.amazon.com/general/latest/gr/index.html?rande.html
      #   Regions and Endpoints} in the Amazon Web Services General
      #   Reference.
      #
      # @example
      #
      #   bucket = s3.buckets.create('my-bucket')
      #   bucket.name    #=> "my-bucket"
      #   bucket.exists? #=> true
      #
      # @param [String] bucket_name
      #
      # @param [Hash] options
      #
      # @option options [String] :location_constraint (nil) The
      #   location where the bucket should be created.  Defaults to
      #   the classic US region; however, if you configure a regional
      #   endpoint for Amazon S3 this option will default to the
      #   appropriate location constraint for the endpoint.  For
      #   example:
      #
      #       s3 = AWS::S3.new(:region => "us-west-1")
      #       bucket = s3.buckets.create("my-us-west-bucket")
      #       bucket.location_constraint # => "us-west-1"
      #
      # @option options [Symbol,String] :acl (:private) Sets the ACL of the
      #   bucket you are creating.  Valid Values include:
      #   * `:private`
      #   * `:public_read`
      #   * `:public_read_write`
      #   * `:authenticated_read`
      #   * `:log_delivery_write`
      #
      # @option options [String] :grant_read
      # @option options [String] :grant_write
      # @option options [String] :grant_read_acp
      # @option options [String] :grant_write_acp
      # @option options [String] :grant_full_control
      #
      # @return [Bucket]
      #
      def create bucket_name, options = {}

        # convert the symbolized-canned acl into the string version
        if acl = options[:acl]
          options[:acl] = acl.to_s.tr('_', '-')
        end

        # auto set the location constraint for the user if it is not
        # passed in and the endpoint is not the us-standard region.  don't
        # override the location constraint though, even it is wrong,
        unless
          config.s3_endpoint == 's3.amazonaws.com' or
          options[:location_constraint]
        then
          constraint = guess_constraint
          options[:location_constraint] = constraint if constraint
        end

        client.create_bucket(options.merge(:bucket_name => bucket_name))
        bucket_named(bucket_name)

      end

      # Returns the Bucket with the given name.
      #
      # Makes no requests.  The returned bucket object can
      # be used to make requets for the bucket and its objects.
      #
      # @example
      #
      #   bucket = s3.buckets[:mybucket],
      #   bucket = s3.buckets['mybucket'],
      #
      # @param [String] bucket_name
      # @return [Bucket]
      def [] bucket_name
        bucket_named(bucket_name)
      end

      # Iterates the buckets in this collection.
      #
      # @example
      #
      #   s3.buckets.each do |bucket|
      #     puts bucket.name
      #   end
      #
      # @return [nil]
      def each &block
        response = client.list_buckets
        response.buckets.each do |b|
          yield(bucket_named(b.name, response.owner))
        end
        nil
      end

      private

      def bucket_named name, owner = nil
        S3::Bucket.new(name.to_s, :owner => owner, :config => config)
      end

      def guess_constraint
        case config.s3_endpoint
        when 's3-eu-west-1.amazonaws.com' then 'EU'
        when /^s3[.-](.*)\.amazonaws\.com/ then $1
        end
      end

    end
  end
end
