# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
  class IAM
    module Collection

      include Core::Collection::WithLimitAndNextToken

      # Common methods for collection classes that can be filtered by
      # a path prefix.
      module WithPrefix

        include Collection

        # @return [String] The path prefix by which the collection is
        #   filtered.
        attr_reader :prefix

        # @api private
        def initialize options = {}
          @prefix = options[:prefix]
          super
        end

        # Returns a collection object including only those groups whose
        # paths begin with the supplied prefix.
        #
        # @param [String] prefix The path prefix for filtering the
        #   results.
        #
        # @return [GroupCollection]
        def with_prefix prefix
          prefix = "/#{prefix}".sub(%r{^//}, "/")
          self.class.new(:prefix => prefix, :config => config)
        end

        protected
        def _each_item marker, max_items, options = {}, &block

          prefix = options.delete(:prefix) || self.prefix

          options[:path_prefix] = "/#{prefix}".sub(%r{^//}, "/") if prefix

          super(marker, max_items, options, &block)

        end

      end

      protected
      def request_method
        name = Core::Inflection.ruby_name(self.class.name).sub(/_collection$/, '')
        "list_#{name}s"
      end

      protected
      def _each_item marker, max_items, options = {}, &block

        options[:marker] = marker if marker
        options[:max_items] = max_items if max_items

        response = client.send(request_method, options)

        each_item(response, &block)

        response.data[:marker]

      end

    end

  end
end
