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

    # A utility class to provide indifferent access to hash data.
    #
    # Inspired by ActiveSupport's HashWithIndifferentAccess, this class
    # has a few notable differences:
    #
    # * ALL keys are converted to strings (via #to_s)
    # * It does not deep merge/convert hashes indifferently, good for fla
    # * It will not perserve default value behaviours
    #
    # These features were omitted because our primary use for this class is to
    # wrap a 1-level hash as a return value, but we want the user to access
    # the values with string or symbol keys.
    #
    # @api private
    class IndifferentHash < Hash

      def initialize *args
        if args.first.is_a?(Hash)
          super()
          merge!(*args)
        else
          super(*args)
        end
      end

      alias_method :_getter, :[]
      alias_method :_setter, :[]=

      def []=(key, value)
        _setter(_convert_key(key), value)
      end
      alias_method :store, :[]=

      def [] key
        _getter(_convert_key(key))
      end

      def merge! hash
        hash.each_pair do |key,value|
          self[key] = value
        end
        self
      end
      alias_method :update, :merge!

      def merge hash
        self.dup.merge!(hash)
      end

      def has_key? key
        super(_convert_key(key))
      end
      alias_method :key?, :has_key?
      alias_method :member?, :has_key?
      alias_method :include?, :has_key?

      def fetch key, *extras, &block
        super(_convert_key(key), *extras, &block)
      end

      def delete key
        super(_convert_key(key))
      end

      private
      def _convert_key key
        key.is_a?(String) ? key : key.to_s
      end

    end
  end
end
