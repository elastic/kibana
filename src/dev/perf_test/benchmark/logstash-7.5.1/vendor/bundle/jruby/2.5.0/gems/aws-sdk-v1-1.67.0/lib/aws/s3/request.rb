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

require 'uri'
require 'time'

module AWS
  class S3

    # @api private
    class Request < Core::Http::Request

      include Core::UriEscape

      # @return [bucket] S3 bucket name
      attr_accessor :bucket

      # @return [String] S3 object key
      attr_accessor :key

      # @api private
      attr_accessor :force_path_style

      def host
        path_style? ? @host : "#{bucket}.#{@host}"
      end

      def path_style?
        if force_path_style
          true
        else
          Client.path_style_bucket_name?(bucket)
        end
      end

      def uri
        parts = []
        parts << bucket if bucket and path_style?
        parts << escape_path(key) if key

        path = '/' + parts.join('/')
        querystring = url_encoded_params

        uri = ''
        uri << path
        uri << "?#{querystring}" if querystring
        uri
      end

    end
  end
end
