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

    module PrefixedCollection

      include PaginatedCollection

      # @api private
      def initialize *args
        options = args.last.is_a?(Hash) ? args.pop : {}
        @prefix = options[:prefix]
        args.push(options)
        super(*args)
      end

      # @return [String,nil] The prefix of this collection.
      attr_reader :prefix

      # Returns a new collection with a different prefix
      #
      # @example
      #
      #   objects = collection.with_prefix('photos')
      #   objects.prefix #=> 'photos'
      #
      # @example Chaining with_prefix replaces previous prefix
      #
      #   objects = collection.with_prefix('photos').with_prefix('videos')
      #   objects.prefix #=> 'videos'
      #
      # @example Chaining with_prefix with :append
      #
      #   objects = collection.with_prefix('a/').with_prefix('b/', :append)
      #   objects.prefix #=> 'a/b/'
      #
      # @example Chaining with_prefix with :prepend
      #
      #   objects = collection.with_prefix('a/').with_prefix('b/', :prepend)
      #   objects.prefix #=> 'b/a/'
      #
      # @param [String] prefix The prefix condition that limits what objects
      #   are returned by this collection.
      # @param [Symbol] mode (:replace) If you chain calls to #with_prefix
      #   the `mode` affects if the prefix prepends, appends, or replaces.
      #   Valid modes are:
      #   * `:replace`
      #   * `:append`
      #   * `:prepend`
      # @return [Collection] Returns a new collection with a modified prefix.
      def with_prefix prefix, mode = :replace
        new_prefix = case mode
        when :replace then prefix
        when :append  then "#{@prefix}#{prefix}"
        when :prepend then "#{prefix}#{@prefix}"
        else
          raise ArgumentError, "invalid prefix mode `#{mode}`, it must be " +
            ":replace, :append or :prepend"
        end
        self.class.new(bucket, :prefix => new_prefix)
      end

      # @api private
      protected
      def list_options(options)
        opts = super
        opts[:prefix] = prefix if prefix
        opts
      end

    end
  end
end
