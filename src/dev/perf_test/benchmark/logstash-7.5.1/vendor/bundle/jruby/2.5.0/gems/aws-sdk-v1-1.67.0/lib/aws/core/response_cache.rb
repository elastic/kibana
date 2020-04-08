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
  module Core

    # @api private
    class ResponseCache

      attr_reader :cached_responses

      attr_reader :resource_cache

      def initialize
        @cached_responses = []
        @indexed_responses = {}
        @resource_cache = ResourceCache.new
      end

      def add(resp)
        cached_responses.unshift(resp)
        @indexed_responses[resp.cache_key] = resp if
          resp.respond_to?(:cache_key)
        @resource_cache = ResourceCache.new
      end

      def select(*types, &block)
        cached_responses.select do |resp|
          types.map{|t| t.to_s }.include?(resp.request_type.to_s) and
            (block.nil? || block.call(resp))
        end
      end

      def cached(resp)
        @indexed_responses[resp.cache_key]
      end

    end
  end
end
