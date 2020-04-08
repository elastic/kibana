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
  class DynamoDB
    class Resource < Core::Resource

      # @api private
      def self.attribute name, options = {}

        # DynamoDB attributes are all returned in UpperCamelCase, this
        # converts the :snake_case name into the correct format.
        unless options[:from]
          options[:from] = name.to_s.split(/_/).map(&:capitalize).join
        end

        super(name, options)

      end

    end
  end
end
