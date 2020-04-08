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

    # This module contains exception classes for each of the error
    # types that S3 can return.  You can use these classes to rescue
    # specific errors, for example:
    #
    #     begin
    #       S3.new.buckets.mybucket.
    #         objects.myobj.write("HELLO")
    #     rescue S3::Errors::NoSuchBucket => e
    #       S3.new.buckets.create("mybucket")
    #       retry
    #     end
    #
    # All errors raised as a result of error responses from the
    # service are instances of either {ClientError} or {ServerError}.
    module Errors

      # @api private
      GRAMMAR = Core::XML::Grammar.customize

      extend Core::LazyErrorClasses

      class BatchDeleteError < StandardError

        def initialize error_counts
          @error_counts = error_counts
          total = error_counts.values.inject(0) {|sum,count| sum + count }
          super("Failed to delete #{total} objects")
        end

        # @return [Hash] Returns a hash of error codes and how many
        #   objects failed with that code.
        attr_reader :error_counts

      end

      # This error is special, because S3 does not (and must not
      # according to RFC 2616) return a body with the HTTP response.
      # The interface is the same as for any other client error.
      class NotModified < AWS::Errors::Base

        include AWS::Errors::ClientError

        def initialize(req, resp)
          super(req, resp, "NotModified", "Not Modified")
        end

      end

      # This error is special, because S3 does not return a body with
      # the HTTP response.  The interface is the same as for any other
      # client error.
      class NoSuchKey < AWS::Errors::Base

        include AWS::Errors::ClientError

        def initialize(req, resp, code = nil, message = nil)
          super(req, resp, "NoSuchKey", "No Such Key")
        end

      end

      # This error is special, because S3 must first retrieve the client
      #   side encryption key in it's encrypted form before finding if the
      #   key is incorrect.
      class IncorrectClientSideEncryptionKey < AWS::Errors::Base

        include AWS::Errors::ClientError

        def initialize(msg)
          super("",
                "",
                "IncorrectClientSideEncryptionKey",
                msg)
        end
      end
    end
  end
end
