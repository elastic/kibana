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

require 'zlib'

module AWS
  class DynamoDB

    # Builds a client for Amazon DynamoDB.
    #
    #     ddb = AWS::DynamoDB::Client.new
    #
    # ## API Versions
    #
    # Amazon DynamoDB has multiple API versions.  It is important to know
    # which API you are using.  Each API version accepts different parameters
    # and returns data in a different format.
    #
    # By default, the oldest API version is used.  This ensures customers
    # who started using DynamoDB early would not get broken by API updates.
    # You can construct a client of a specific version by passing the
    # `:api_version` option to the {#initialize constructor}.
    #
    #     # defaults to the 2011-12-05 API version
    #     ddb = AWS::DynamoDB::Client.new
    #
    #     # specify the API version
    #     ddb = AWS::DynamoDB::Client.new(:api_version => '2011-12-05')
    #     ddb = AWS::DynamoDB::Client.new(:api_version => '2012-08-10')
    #
    # You can specify a global default API version using AWS.config:
    #
    #     AWS.config(:dynamo_db => { :api_version => '2012-08-10' })
    #
    #     AWS::DynamoDB::Client.new
    #     #=> AWS::DynamoDB::Client::V20120810
    #
    # @see V20111205
    # @see V20120810
    #
    class Client < Core::JSONClient

      autoload :V20111205, 'aws/dynamo_db/client/v20111205'
      autoload :V20120810, 'aws/dynamo_db/client/v20120810'

      API_VERSION = '2011-12-05'

      signature_version :Version4, 'dynamodb'

      # @private
      REGION_US_E1 = 'dynamodb.us-east-1.amazonaws.com'

      # @private
      CACHEABLE_REQUESTS = Set[:list_tables, :describe_table]

      protected

      def extract_error_details response
        if response.http_response.status == 413
          ['RequestEntityTooLarge', 'Request entity too large']
        elsif crc32_is_valid?(response) == false
          ['CRC32CheckFailed', 'CRC32 integrity check failed']
        else
          super
        end
      end

      def retryable_error? response
        case response.error
        when Errors::ProvisionedThroughputExceededException
          config.dynamo_db_retry_throughput_errors?
        when Errors::CRC32CheckFailed
          true
        else
          super
        end
      end

      def sleep_durations response

        retry_count =
          if expired_credentials?(response)
            config.max_retries == 0 ? 0 : 1
          else
            config.max_retries { 10 }
          end

        # given a retry_count of 10, the sleep durations will look like:
        # 0, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800 (milliseconds)
        (0...retry_count).map do |n|
          if n == 0
            0
          else
            50 * (2 ** (n - 1)) / 1000.0
          end
        end

      end

      private

      # @return [Boolean] whether the CRC32 response header matches the body.
      # @return [nil] if no CRC32 header is present or we are not verifying CRC32
      def crc32_is_valid? response
        return nil unless config.dynamo_db_crc32
        if crcs = response.http_response.headers['x-amz-crc32']
          crcs[0].to_i == calculate_crc32(response)
        else
          nil
        end
      end

      def calculate_crc32 response
        Zlib.crc32(response.http_response.body)
      end

    end
  end
end
