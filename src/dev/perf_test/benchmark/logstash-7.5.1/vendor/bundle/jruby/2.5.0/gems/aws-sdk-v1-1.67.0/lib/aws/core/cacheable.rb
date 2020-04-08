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
    module Cacheable

      # @api private
      class NoData < StandardError; end

      def self.included base
        base.extend Naming unless base.respond_to?(:service_ruby_name)
      end

      # @api private
      protected
      def local_cache_key
        raise NotImplementedError
      end

      # @api private
      protected
      def cache_key
        @cache_key ||= begin
          config.credential_provider.access_key_id + ":" +
            config.region + ":" +
            self.class.name + ":" +
            local_cache_key
        end
      end

      # @api private
      public
      def retrieve_attribute attr, &block

        if cache = AWS.response_cache

          if cache.resource_cache.cached?(cache_key, attr.name)
            return cache.resource_cache.get(cache_key, attr.name)
          end

          cache.select(*attr.request_types).each do |response|
            if attributes = attributes_from_response(response)
              cache.resource_cache.store(cache_key, attributes)
              return attributes[attr.name] if attributes.key?(attr.name)
            end
          end

        end

        response = yield

        if attributes = attributes_from_response(response)
          if cache = AWS.response_cache
            cache.resource_cache.store(cache_key, attributes)
          end
          attributes[attr.name] if attributes.key?(attr.name)
        else
          raise NoData.new("no data in #{response.request_type} response")
        end
      end

    end
  end
end
