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

require 'thread'

module AWS
  module Core

    # Provides lazy creation of error classes via {#const_missing}.
    #
    # Extend this module provides 3 benefits to another module:
    #
    # * A method that accepts strings and returns error classes.
    # * Thread-safe dynamic error class creation via {#const_missing}
    # * An error grammar for parsing AWS xml errors
    #
    # Here is an example of how it works:
    #
    #     Class Foo
    #       module Errors
    #         extend AWS::Core::LazyErrorClasses
    #       end
    #     end
    #
    #     Foo::Errors.error_class('NoSuchKey')
    #     #=> Foo::Errors::NoSuckKey
    #
    #     Foo::Errors.error_class('Nested.Error.Klasses')
    #     #=> Foo::Errors::Nested::Error::Klasses
    #
    # The errors returned from {#error_class} are subclasses
    # of {AWS::Errors::Base}.
    #
    module LazyErrorClasses

      # This grammar parses the defualt AWS XML error format
      BASE_ERROR_GRAMMAR = XML::Grammar.customize do
        element("Error") do
          ignore
        end
      end

      # @api private
      def self.extended base

        unless base.const_defined?(:GRAMMAR)
          base.const_set(:GRAMMAR, BASE_ERROR_GRAMMAR)
        end

        mutex = Mutex.new
        MetaUtils.extend_method(base, :const_missing_mutex) { mutex }

      end

      # Defines a new error class.
      # @param [String,Symbol] constant
      # @return [nil]
      def const_missing constant
        const_missing_mutex.synchronize do
          # It's possible the constant was defined by another thread while
          # this thread was waiting on the mutex, check before setting.
          if error_const_set?(constant)
            const_get(constant)
          else
            const_set(constant, Class.new(Errors::Base) { extend LazyErrorClasses })
          end
        end
      end

      # Converts the error code into an error class constant.
      #
      #     AWS::EC2::Errors.error_class('Non.Existent.Error')
      #     #=> AWS::EC2::Errors::Non::Existent::Error
      #
      # @param [String] code An AWS error code.
      #
      # @return [Class] Returns the error class defiend by the error code.
      #
      def error_class code
        module_eval("#{self}::#{code.gsub('.Range','Range').gsub(".","::")}")
      end

      private

      # @return [Boolean] Returns true if the constant is defined in the
      #   current module.
      def error_const_set?(constant)
        # Not using #const_defined? because in Ruby 1.9+, it returns true for
        # constants not defined directly on the current module.
        constant = constant.to_sym
        # In Ruby 1.8, #constants returns an array of strings,
        # in Ruby 1.9+, #constants returns an array of symbols.
        constants.any? { |c| c.to_sym == constant }
      end

    end
  end
end
