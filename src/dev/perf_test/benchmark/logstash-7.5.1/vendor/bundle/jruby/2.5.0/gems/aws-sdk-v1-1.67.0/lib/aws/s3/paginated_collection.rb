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

    # @api private
    module PaginatedCollection

      include Core::Collection::WithLimitAndNextToken

      protected
      def _each_item markers, limit, options = {}, &block

        options = list_options(options)
        options.merge!(markers) unless markers.nil? or markers.empty?
        options[limit_param] = limit || 1000

        response = list_request(options)

        each_member_in_page(response, &block)

        response.data[:truncated] ? next_markers(response) : nil

      end

      protected
      def each_member_in_page(page, &block); end

      protected
      def list_request(options)
        raise NotImplementedError
      end

      protected
      def list_options options
        opts = {}
        opts[:bucket_name] = bucket.name if respond_to?(:bucket)
        opts
      end

      protected
      def limit_param
        raise NotImplementedError
      end

      protected
      def pagination_markers
        [:key_marker]
      end

      protected
      def next_markers page
        pagination_markers.inject({}) do |markers, marker_name|
          if marker = page.data[:"next_#{marker_name}"]
            markers[marker_name] = marker if marker
          end
          markers
        end
      end

    end

  end
end
