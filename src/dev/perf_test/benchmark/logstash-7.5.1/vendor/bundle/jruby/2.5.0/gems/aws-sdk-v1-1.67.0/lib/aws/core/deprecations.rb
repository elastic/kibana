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

    # A utility module that provides a class method that wraps
    # a method such that it generates a deprecation warning when called.
    # Given the following class:
    #
    #     class Example
    #
    #       def do_something
    #       end
    #
    #     end
    #
    # If you want to deprecate the `#do_something` method, you can extend
    # this module and then call `deprecated` on the method (after it
    # has been defined).
    #
    #     class Example
    #
    #       extend AWS::Core::Deprecations
    #
    #       def do_something
    #       end
    #
    #       def do_something_else
    #       end
    #
    #       deprecated :do_something
    #
    #     end
    #
    # The `#do_something` method will continue to function, but will
    # generate a deprecation warning when called.
    #
    # @api private
    module Deprecations

      # @param [Symbol] method The name of the deprecated method.
      #
      # @option options [String] :message The warning message to issue
      #   when the deprecated method is called.
      #
      # @option options [Symbol] :use The name of an use
      #   method that should be used.
      #
      def deprecated method, options = {}

        deprecation_msg = options[:message] || begin
          msg = "DEPRECATION WARNING: called deprecated method `#{method}' "
          msg << "of #{self.name}"
          msg << ", try calling #{options[:use]} instead" if options[:use]
          msg
        end

        alias_method(:"deprecated_#{method}", method)

        warned = false # we only want to issue this warning once

        define_method(method) do |*args,&block|
          unless warned
            warn(deprecation_msg)
            warned = true
          end
          send("deprecated_#{method}", *args, &block)
        end
      end

    end
  end
end
