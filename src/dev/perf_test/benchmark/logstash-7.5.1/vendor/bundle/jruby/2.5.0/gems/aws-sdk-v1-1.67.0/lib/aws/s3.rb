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

require 'aws/core'
require 'aws/s3/config'

module AWS

  # Provides an expressive, object-oriented interface to Amazon S3.
  #
  # To use Amazon S3 you must first
  # [sign up here](http://aws.amazon.com/s3/).
  #
  # For more information about Amazon S3, see:
  #
  # * [Amazon S3](http://aws.amazon.com/s3/)
  # * [Amazon S3 Documentation](http://aws.amazon.com/documentation/s3/)
  #
  # # Credentials
  #
  # You can setup default credentials for all AWS services via
  # AWS.config:
  #
  #     AWS.config(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # Or you can set them directly on the S3 interface:
  #
  #     s3 = AWS::S3.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Buckets
  #
  # Before you can upload files to S3, you need to create a bucket.
  #
  #     s3 = AWS::S3.new
  #     bucket = s3.buckets.create('my-bucket')
  #
  # If a bucket already exists, you can get a reference to the bucket.
  #
  #     bucket = s3.buckets['my-bucket'] # no request made
  #
  # You can also enumerate all buckets in your account.
  #
  #     s3.buckets.each do |bucket|
  #       puts bucket.name
  #     end
  #
  # See {BucketCollection} and {Bucket} for more information on working
  # with buckets.
  #
  # # Objects
  #
  # Buckets contain objects.  Each object in a bucket has a unique key.
  #
  # ## Getting an Object
  #
  # If the object already exists, you can get a reference to the object.
  #
  #     # makes no request, returns an AWS::S3::S3Object
  #     obj = bucket.objects['key']
  #
  # ## Reading and Writing an Object
  #
  # The example above returns an {S3Object}.  You call {S3Object#write} and
  # {S3Object#read} to upload to and download from S3 respectively.
  #
  #     # streaming upload a file to S3
  #     obj.write(Pathname.new('/path/to/file.txt'))
  #
  #     # streaming download from S3 to a file on disk
  #     File.open('file.txt', 'wb') do |file|
  #       obj.read do |chunk|
  #          file.write(chunk)
  #       end
  #     end
  #
  # ## Enumerating Objects
  #
  # You can enumerate objects in your buckets.
  #
  #     # enumerate ALL objects in the bucket (even if the bucket contains
  #     # more than 1k objects)
  #     bucket.objects.each do |obj|
  #       puts obj.key
  #     end
  #
  #     # enumerate at most 20 objects with the given prefix
  #     bucket.objects.with_prefix('photos/').each(:limit => 20) do |photo|
  #       puts photo.key
  #     end
  #
  # See {ObjectCollection} and {S3Object} for more information on working
  # with objects.
  #
  class S3

    autoload :AccessControlList, 'aws/s3/access_control_list'
    autoload :ACLObject, 'aws/s3/acl_object'
    autoload :ACLOptions, 'aws/s3/acl_options'
    autoload :Bucket, 'aws/s3/bucket'
    autoload :BucketCollection, 'aws/s3/bucket_collection'
    autoload :BucketTagCollection, 'aws/s3/bucket_tag_collection'
    autoload :BucketLifecycleConfiguration, 'aws/s3/bucket_lifecycle_configuration'
    autoload :BucketRegionCache, 'aws/s3/bucket_region_cache'
    autoload :BucketVersionCollection, 'aws/s3/bucket_version_collection'
    autoload :Client, 'aws/s3/client'
    autoload :CORSRule, 'aws/s3/cors_rule'
    autoload :CORSRuleCollection, 'aws/s3/cors_rule_collection'
    autoload :DataOptions, 'aws/s3/data_options'
    autoload :EncryptionUtils, 'aws/s3/encryption_utils'
    autoload :CipherIO, 'aws/s3/cipher_io'
    autoload :Errors, 'aws/s3/errors'
    autoload :MultipartUpload, 'aws/s3/multipart_upload'
    autoload :MultipartUploadCollection, 'aws/s3/multipart_upload_collection'
    autoload :ObjectCollection, 'aws/s3/object_collection'
    autoload :ObjectMetadata, 'aws/s3/object_metadata'
    autoload :ObjectUploadCollection, 'aws/s3/object_upload_collection'
    autoload :ObjectVersion, 'aws/s3/object_version'
    autoload :ObjectVersionCollection, 'aws/s3/object_version_collection'
    autoload :PaginatedCollection, 'aws/s3/paginated_collection'
    autoload :Policy, 'aws/s3/policy'
    autoload :PrefixAndDelimiterCollection, 'aws/s3/prefix_and_delimiter_collection'
    autoload :PrefixedCollection, 'aws/s3/prefixed_collection'
    autoload :PresignedPost, 'aws/s3/presigned_post'
    autoload :PresignV4, 'aws/s3/presign_v4'
    autoload :Request, 'aws/s3/request'
    autoload :RegionDetection, 'aws/s3/region_detection'
    autoload :S3Object, 'aws/s3/s3_object'
    autoload :Tree, 'aws/s3/tree'
    autoload :UploadedPart, 'aws/s3/uploaded_part'
    autoload :UploadedPartCollection, 'aws/s3/uploaded_part_collection'
    autoload :WebsiteConfiguration, 'aws/s3/website_configuration'

    include Core::ServiceInterface

    endpoint_prefix 's3'

    BUCKET_REGIONS = BucketRegionCache.new

    # @return [BucketCollection] Returns a collection that represents all
    #  buckets in the account.
    def buckets
      BucketCollection.new(:config => @config)
    end

  end
end
