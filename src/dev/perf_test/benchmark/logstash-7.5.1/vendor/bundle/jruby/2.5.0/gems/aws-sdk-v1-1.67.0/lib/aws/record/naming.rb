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
  module Record

    # @api private
    module Naming

      # This method should only ever get called in a Rails 3+ context
      # where active model and active support have been loaded.  Rails 2
      # does not call model name on object.
      # @api private
      def model_name
        @_model_name ||=
          ActiveModel::Name.new(self.kind_of?(Class) ? self : self.class)
      end

    end
  end
end
