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
    class Client < Core::Client

      # @api private
      module XML

        BaseGrammar = Core::XML::Grammar.new({}, :inflect_rename => true)

        ListBuckets = BaseGrammar.customize do
          element "Buckets" do
            list "Bucket"
          end
        end

        GetBucketAcl = GetObjectAcl = BaseGrammar.customize do
          element "AccessControlList" do
            ignore
            element "Grant" do
              rename :grants
              list
              element "Grantee" do
                element "ID" do
                  rename :canonical_user_id
                end
              end
              element "Permission" do
                symbol_value
              end
            end
          end
        end

        ListObjects = BaseGrammar.customize do

          element("Name") { rename :bucket_name }
          element("MaxKeys") { integer_value }
          element("IsTruncated") { rename :truncated; boolean_value }
          element("Delimiter") { force }

          element("Contents") do
            list
            element("Owner") do
              element("ID") { }
              element("DisplayName") { }
            end
            element("Key") { }
            element("Size") { }
            element("StorageClass") { }
            element("ETag") { rename :etag }

            element("LastModified") { time_value }
          end

          element "CommonPrefixes" do
            collect_values
          end

        end

        GetBucketLogging = BaseGrammar.customize do
          element("LoggingEnabled") do
            element("TargetBucket") { }
            element("TargetPrefix") { }
            element("TargetGrants") do
              list "Grant"
              element("Grant") do
                element("Grantee") do
                  element("EmailAddress") { }
                  element("ID") { }
                  element("URI") { }
                end
                element("Permission") { }
              end
            end
          end
        end

        GetBucketVersioning = BaseGrammar.customize do
          default_value :status, :unversioned
          element("Status") do
            symbol_value
          end
        end

        ListObjectVersions = BaseGrammar.customize do

          element("MaxKeys") { integer_value }
          element("IsTruncated") { rename :truncated; boolean_value }
          element("NextKeyMarker") { force }
          element("NextVersionIdMarker") { force }

          %w(DeleteMarker Version).each do |element_name|
            element(element_name) do
              collect_values
              rename(:versions)
              element("IsLatest") { rename :latest; boolean_value }
              element("LastModified") { datetime_value }
              element("ETag") { rename :etag }
              element("Size") { integer_value }
              element("StorageClass") { symbol_value }
            end
          end

          element "DeleteMarker" do
            default_value(:delete_marker, true)
            default_value(:version, false)
          end

          element "Version" do
            default_value(:delete_marker, false)
            default_value(:version, true)
          end

          element "CommonPrefixes" do
            collect_values
          end

        end

        InitiateMultipartUpload = BaseGrammar.customize do
          element("UploadId") { force }
        end

        ListMultipartUploads = BaseGrammar.customize do

          element("IsTruncated") { rename :truncated; boolean_value }
          element("MaxUploads") { integer_value }
          element("NextKeyMarker") { force }
          element("NextUploadIdMarker") { force }
          element("Upload") do
            collect_values
            rename :uploads
            element("StorageClass") { symbol_value }
            element("Initiated") { datetime_value }
          end

          element "CommonPrefixes" do
            collect_values
          end

        end

        DeleteObjects = BaseGrammar.customize do
          element("Deleted") do
            element("DeleteMarker") { boolean_value }
            list
          end
          element("Error") { list; rename(:errors) }
        end

        CompleteMultipartUpload = BaseGrammar.customize

        ListParts = BaseGrammar.customize do
          element("StorageClass") { symbol_value }
          element("IsTruncated") { rename :truncated; boolean_value }
          element("MaxParts") { integer_value }
          element("PartNumberMarker") { integer_value }
          element("NextPartNumberMarker") { integer_value }
          element("Part") do
            collect_values
            rename :parts
            element("PartNumber") { integer_value }
            element("LastModified") { datetime_value }
            element("Size") { integer_value }
          end
        end

        GetBucketLifecycleConfiguration = BaseGrammar.customize do
          element("Rule") do
            list
            rename(:rules)
            element("Expiration") do
              element("Days") { integer_value }
              element("Date") { datetime_value }
            end
            element("Transition") do
              element("StorageClass") { }
              element("Days") { integer_value }
              element("Date") { datetime_value }
            end
            element("NoncurrentVersionTransition") do
              element("NoncurrentDays") { integer_value }
              element("StorageClass") { string_value }
            end
            element("NoncurrentVersionDays") do
              element("NoncurrentDays") { integer_value }
            end
          end
        end

        GetBucketCors = BaseGrammar.customize do
          element "CORSRule" do
            list
            rename :rules
            element "AllowedMethod" do
              list
              rename :allowed_methods
            end
            element "AllowedOrigin" do
              list
              rename :allowed_origins
            end
            element "AllowedHeader" do
              list
              rename :allowed_headers
            end
            element "MaxAgeSeconds" do
              integer
            end
            element "ExposeHeader" do
              list
              rename :expose_headers
            end
          end
        end

        GetBucketTagging = BaseGrammar.customize do
          element "TagSet" do
            ignore
            element "Tag" do
              map_entry("Key", "Value")
              rename :tags
            end
          end
        end

        GetBucketWebsite = BaseGrammar.customize do
          element "IndexDocument" do
            element "Suffix"
          end
          element "ErrorDocument" do
            element "Key"
          end
          element "RoutingRules" do
            list("RoutingRule")
          end
        end

        CopyPart = BaseGrammar.customize do
          element "ETag" do
            rename :etag
          end
          element "LastModified" do
            datetime_value
            rename :last_modified
          end
        end

      end
    end
  end
end
