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
    class ResourceCache

      def initialize
        @cache = {}
      end

      def store(key, attributes)
        (@cache[key] ||= {}).merge!(attributes)
      end

      def cached?(key, attribute)
        attributes = @cache[key] and attributes.has_key?(attribute)
      end

      def get(key, attribute)
        raise "No cached value for attribute :#{attribute} of #{key}" unless
          cached?(key, attribute)
        @cache[key][attribute]
      end

    end
  end
end
