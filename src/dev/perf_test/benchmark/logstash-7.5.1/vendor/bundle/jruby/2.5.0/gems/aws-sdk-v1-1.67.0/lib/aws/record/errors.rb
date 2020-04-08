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

    class Errors < Core::IndifferentHash

      include Enumerable

      # Returns the errors for the atttibute in an array.
      #
      #     errors.add(:name, 'may not be blank')
      #     errors.add(:name, 'must be less than 30 characters')
      #     errors[:name]
      #     #=> ['may not be blank', 'must be less than 30 characters']
      #
      # @param [String,Symbol] attribute_name The name of the attribute to retnr
      #   errors for.  You can pass the string or symbol version.
      # @return [Array<String>] Returns the error messages for the given
      #   `attribute_name`.  If there are no errors on the attribute then
      #   an empty array is returned.
      def [] attribute_name
        super(attribute_name) || []
      end
      alias_method :on, :[]

      # Adds an error message to the named attribute.
      #
      #     errors.add(:name, 'may not be blank')
      #     errors.on(:name)
      #     #=> ['may not be blank']
      #
      # If you want to add a general error message, then pass `:base`
      # for `attribute_name`, or call {#add_to_base}.
      # @param [String,Symbol] attribute_name The name of the attribute
      #   that you are adding an error to.
      # @param [String] message ('is invalid') The error message (should
      #   not contain the attribute name).
      # @return [String] Returns the message.
      def []= attribute_name, message = 'is invalid'
        if has_key?(attribute_name)
          self[attribute_name] << message
        else
          super(attribute_name, [message])
        end
        self[attribute_name]
      end
      alias_method :add, :[]=

      # Adds a general error message (not associated with any particular
      # attribute).
      # @param [String] message ('is invalid') The error message (should
      #   not contain the attribute name).
      # @return [String] Returns the message.
      def add_to_base message
        add(:base, message)
      end

      # @return [Integer] Returns the number of error messages.
      def count
        values.flatten.length
      end
      alias_method :size, :count

      # Yields once for each error message added.
      #
      # An attribute_name may yield more than once if there are more than
      # one errors associated with that attirbute.
      #
      # @yield [attribute_name, error_message]
      # @yieldparam [String] attribute_name The name of the attribute
      # @yieldparam [String] error_message The error message associated the
      #   the named attribute.
      def each &block
        super do |attribute_name, error_messages|
          error_messages.each do |error_message|
            yield(attribute_name, error_message)
          end
        end
      end

      # Returns the errors prefixed by a humanized version of the attribute
      # name.
      #
      #     errors.add(:name, 'may not be blank')
      #     errors.full_messages
      #     #=> ['Name may not be blank']
      #
      # @return [Array of Strings] Returns an array of error messages.
      def full_messages
        messages = []
        each do |attr_name, error_message|
          messages << case attr_name
          when 'base' then error_message.dup
          else "#{attr_name.capitalize.gsub(/_/, ' ')} #{error_message}"
          end
        end
        messages
      end
      alias_method :to_a, :full_messages

      # Returns a hash of of errors messages.  Keys are attribute names
      # and values are arrays of error messages.
      #
      #     errors.add(:name, 'may not be blank')
      #     errors.to_hash
      #     #=> { 'name' => ['may not be blank'] }
      #
      # Please note that the hash values are always arrays, even if there
      # is only one error message for the attribute.
      def to_hash
        hash = {}
        each do |attr_name, message|
          hash[attr_name] ||= []
          hash[attr_name] << message.dup
        end
        hash
      end

      # Removes all error messages.
      # @return [nil]
      def clear!
        keys.each do |key|
          delete(key)
        end
        nil
      end

    end

  end
end
