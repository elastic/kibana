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
    module MetaUtils

      def extend_method(object, name, &block)
        object.extend(
          Module.new do
            define_method(name, &block)
          end
        )
      end
      module_function :extend_method

      def class_extend_method(klass, name, &block)
        klass.send(:include,
          Module.new do
           define_method(name, &block)
          end
        )
      end
      module_function :class_extend_method

      def extend(object, &block)
        object.extend(Module.new(&block))
      end
      module_function :extend

    end
  end
end
