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

    # (see Core::Policy)
    class Policy < Core::Policy

      class Statement < Core::Policy::Statement

        ACTION_MAPPING = {
          :list_buckets => "s3:ListAllMyBuckets",
          :create_bucket => "s3:CreateBucket",
          :delete_bucket => "s3:DeleteBucket",
          :list_objects => "s3:ListBucket",
          :list_object_versions => "s3:ListBucketVersions",
          :list_multipart_uploads => "s3:ListBucketMultipartUploads",
          :get_object => "s3:GetObject",
          :get_object_version => "s3:GetObjectVersion",
          :put_object => "s3:PutObject",
          :get_object_acl => "s3:GetObjectAcl",
          :get_object_version_acl => "s3:GetObjectVersionAcl",
          :set_object_acl => "s3:PutObjectAcl",
          :set_object_acl_version => "s3:PutObjectAclVersion",
          :delete_object => "s3:DeleteObject",
          :delete_object_version => "s3:DeleteObjectVersion",
          :list_multipart_upload_parts => "s3:ListMultipartUploadParts",
          :abort_multipart_upload => "s3:AbortMultipartUpload",
          :get_bucket_acl => "s3:GetBucketAcl",
          :set_bucket_acl => "s3:PutBucketAcl",
          :get_bucket_versioning => "s3:GetBucketVersioning",
          :set_bucket_versioning => "s3:PutBucketVersioning",
          :get_bucket_requester_pays => "s3:GetBucketRequesterPays",
          :set_bucket_requester_pays => "s3:PutBucketRequesterPays",
          :get_bucket_location => "s3:GetBucketLocation",
          :get_bucket_policy => "s3:GetBucketPolicy",
          :set_bucket_policy => "s3:PutBucketPolicy",
          :get_bucket_notification => "s3:GetBucketNotification",
          :set_bucket_notification => "s3:PutBucketNotification"
        }

        protected
        def resource_arn resource
          prefix = 'arn:aws:s3:::'
          case resource
          when Bucket
            "#{prefix}#{resource.name}"
          when S3Object
            "#{prefix}#{resource.bucket.name}/#{resource.key}"
          when ObjectCollection
            "#{prefix}#{resource.bucket.name}/#{resource.prefix}*"
          when /^arn:/
            resource
          else
            "arn:aws:s3:::#{resource}"
          end
        end

      end

    end
  end
end
