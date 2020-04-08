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
  class IAM
    class Resource < Core::Resource

      # @return [Boolean] Returns `true` if the resource exists.
      def exists?
        get_resource
        true
      rescue Errors::NoSuchEntity => e
        false
      end

      private

      def update_resource attr, value
        options = { :"#{self.class.update_prefix}#{attr.set_as}" => value }
        client_method = update_resource_client_method
        client.send(client_method, options.merge(resource_options))
      end

      def get_resource attribute = nil
        client.send(get_resource_client_method, resource_options)
      end

      def get_resource_client_method
        "get_#{ruby_name}"
      end

      def update_resource_client_method
        "update_#{ruby_name}"
      end

      class << self

        # @api private
        def prefix_update_attributes prefix = 'new_'
          @update_prefix = prefix
        end

        # @api private
        def update_prefix
          @update_prefix
        end

      end

    end
  end
end
