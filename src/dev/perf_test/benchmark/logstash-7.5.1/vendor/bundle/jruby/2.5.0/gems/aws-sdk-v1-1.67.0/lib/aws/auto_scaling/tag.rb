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
  class AutoScaling

    # Auto Scaling tags are hashes with two helper methods:
    #
    # * {#resource}
    # * {#delete}
    #
    class Tag < Hash

      # @api private
      def initialize options = {}

        super()

        @resource =
          case options[:resource_type]
          when 'auto-scaling-group'
            group_name = options[:resource_id]
            config = options.delete(:config)
            Group.new(group_name, :config => config)
          else
            msg = "unhandled resource type: #{options[:resource_type]}"
            raise ArgumentError, msg
          end

        merge!(options)

      end

      # @return [Group] Returns the tagged resource.  Currently this is
      #   always an Auto Scaling group.
      def resource
        @resource
      end

      # Deletes the tag from the resource.
      # @return [nil]
      def delete
        resource.delete_tags([self])
        nil
      end

    end
  end
end
