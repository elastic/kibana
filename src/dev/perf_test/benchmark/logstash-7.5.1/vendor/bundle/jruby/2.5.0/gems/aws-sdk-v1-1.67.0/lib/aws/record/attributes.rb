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

require 'date'

module AWS
  module Record
      module Attributes

      # Base class for all of the AWS::Record attributes.
      class BaseAttr

        # @param [Symbol] name Name of this attribute.  It should be a name that
        #   is safe to use as a method.
        # @param [Hash] options
        # @option options [String] :persist_as Defaults to the name of the
        #   attribute.  You can pass a string to specify what the attribute
        #   will be named in the backend storage.
        # @option options [Boolean] :set (false) When true this attribute can
        #   accept multiple unique values.
        def initialize name, options = {}
          @name = name.to_s
          @options = options.dup
          if options[:set] and !self.class.allow_set?
            raise ArgumentError, "invalid option :set for #{self.class}"
          end
        end

        # @return [String] The name of this attribute
        attr_reader :name

        # @return [Hash] Attribute options passed to the constructor.
        attr_reader :options

        # @return [Boolean] Returns true if this attribute can have
        #   multiple values.
        def set?
          options[:set] ? true : false
        end

        # @return Returns the default value for this attribute.
        def default_value
          if options[:default_value].is_a?(Proc)
            options[:default_value].call
          else
            options[:default_value]
          end
        end

        # @return [String] Returns the name this attribute will use
        #   in the storage backend.
        def persist_as
          (options[:persist_as] || @name).to_s
        end

        # @param [Mixed] raw_value A single value to type cast.
        # @return [Mixed] Returns the type casted value.
        def type_cast raw_value
          self.class.type_cast(raw_value, options)
        end

        # @param [String] serialized_value The serialized string value.
        # @return [Mixed] Returns a deserialized type-casted value.
        def deserialize serialized_value
          self.class.deserialize(serialized_value, options)
        end

        # Takes the type casted value and serializes it
        # @param [Mixed] type_casted_value A single value to serialize.
        # @return [Mixed] Returns the serialized value.
        def serialize type_casted_value
          self.class.serialize(type_casted_value, options)
        end

        # @param [String] serialized_value The raw value returned from AWS.
        # @return [Mixed] Returns the type-casted deserialized value.
        def self.deserialize serialized_value, options = {}
          self.type_cast(serialized_value, options)
        end

        # @return [Boolean] Returns true if this attribute type can be used
        #   with the `:set => true` option.  Certain attirbutes can not
        #   be represented with multiple values (like BooleanAttr).
        def self.allow_set?
          raise NotImplementedError
        end

        # @api private
        protected
        def self.expect klass, value, &block
          unless value.is_a?(klass)
            raise ArgumentError, "expected a #{klass}, got #{value.class}"
          end
          yield if block_given?
        end

      end

      class StringAttr < BaseAttr

        # Returns the value cast to a string.  Empty strings are returned as
        # nil by default.  Type casting is done by calling #to_s on the value.
        #
        #     string_attr.type_cast(123)
        #     # => '123'
        #
        #     string_attr.type_cast('')
        #     # => nil
        #
        #     string_attr.type_cast('', :preserve_empty_strings => true)
        #     # => ''
        #
        # @param [Mixed] raw_value
        # @param [Hash] options
        # @option options [Boolean] :preserve_empty_strings (false) When true,
        #   empty strings are preserved and not cast to nil.
        # @return [String,nil] The type casted value.
        def self.type_cast raw_value, options = {}
          case raw_value
          when nil     then nil
          when ''      then options[:preserve_empty_strings] ? '' : nil
          when String  then raw_value
          else raw_value.to_s
          end
        end

        # Returns a serialized representation of the string value suitable for
        # storing in SimpleDB.
        # @param [String] string
        # @param [Hash] options
        # @return [String] The serialized string.
        def self.serialize string, options = {}
          unless string.is_a?(String)
            msg = "expected a String value, got #{string.class}"
            raise ArgumentError, msg
          end
          string
        end

        # @api private
        def self.allow_set?
          true
        end

      end

      class BooleanAttr < BaseAttr

        def self.type_cast raw_value, options = {}
          case raw_value
          when nil then nil
          when '' then nil
          when false, 'false', '0', 0 then false
          else true
          end
        end

        def self.serialize boolean, options = {}
          case boolean
          when false then 0
          when true  then 1
          else
            msg = "expected a boolean value, got #{boolean.class}"
            raise ArgumentError, msg
          end
        end

        # @api private
        def self.allow_set?
          false
        end

      end

      class IntegerAttr < BaseAttr

        # Returns value cast to an integer.  Empty strings are cast to
        # nil by default.  Type casting is done by calling #to_i on the value.
        #
        #     int_attribute.type_cast('123')
        #     #=> 123
        #
        #     int_attribute.type_cast('')
        #     #=> nil
        #
        # @param [Mixed] raw_value The value to type cast to an integer.
        # @return [Integer,nil] Returns the type casted integer or nil
        def self.type_cast raw_value, options = {}
          case raw_value
          when nil      then nil
          when ''       then nil
          when Integer  then raw_value
          else
            raw_value.respond_to?(:to_i) ?
              raw_value.to_i :
              raw_value.to_s.to_i
          end
        end

        # Returns a serialized representation of the integer value suitable for
        # storing in SimpleDB.
        #
        #     attribute.serialize(123)
        #     #=> '123'
        #
        # @param [Integer] integer The number to serialize.
        # @param [Hash] options
        # @return [String] A serialized representation of the integer.
        def self.serialize integer, options = {}
          expect(Integer, integer) { integer }
        end

        # @api private
        def self.allow_set?
          true
        end

      end

      class FloatAttr < BaseAttr

        def self.type_cast raw_value, options = {}
          case raw_value
          when nil   then nil
          when ''    then nil
          when Float then raw_value
          else
            raw_value.respond_to?(:to_f) ?
              raw_value.to_f :
              raw_value.to_s.to_f
          end
        end

        def self.serialize float, options = {}
          expect(Float, float) { float }
        end

        # @api private
        def self.allow_set?
          true
        end

      end

      class DateAttr < BaseAttr

        # Returns value cast to a Date object.  Empty strings are cast to
        # nil.  Values are cast first to strings and then passed to
        # Date.parse.  Integers are treated as timestamps.
        #
        #     date_attribute.type_cast('2000-01-02T10:11:12Z')
        #     #=> #<Date: 4903091/2,0,2299161>
        #
        #     date_attribute.type_cast(1306170146)
        #     #<Date: 4911409/2,0,2299161>
        #
        #     date_attribute.type_cast('')
        #     #=> nil
        #
        #     date_attribute.type_cast(nil)
        #     #=> nil
        #
        # @param [Mixed] raw_value The value to cast to a Date object.
        # @param [Hash] options
        # @return [Date,nil]
        def self.type_cast raw_value, options = {}
          case raw_value
          when nil      then nil
          when ''       then nil
          when Date     then raw_value
          when Integer  then
            begin
              Date.parse(Time.at(raw_value).to_s) # assumed timestamp
            rescue
              nil
            end
          else
            begin
              Date.parse(raw_value.to_s) # Time, DateTime or String
            rescue
              nil
            end
          end
        end

        # Returns a Date object encoded as a string (suitable for sorting).
        #
        #     attribute.serialize(DateTime.parse('2001-01-01'))
        #     #=> '2001-01-01'
        #
        # @param [Date] date The date to serialize.
        #
        # @param [Hash] options
        #
        # @return [String] Returns the date object serialized to a string
        #   ('YYYY-MM-DD').
        #
        def self.serialize date, options = {}
          unless date.is_a?(Date)
            raise ArgumentError, "expected a Date value, got #{date.class}"
          end
          date.strftime('%Y-%m-%d')
        end

        # @api private
        def self.allow_set?
          true
        end

      end

      class DateTimeAttr < BaseAttr

        # Returns value cast to a DateTime object.  Empty strings are cast to
        # nil.  Values are cast first to strings and then passed to
        # DateTime.parse.  Integers are treated as timestamps.
        #
        #     datetime_attribute.type_cast('2000-01-02')
        #     #=> #<DateTime: 4903091/2,0,2299161>
        #
        #     datetime_attribute.type_cast(1306170146)
        #     #<DateTime: 106086465073/43200,-7/24,2299161>
        #
        #     datetime_attribute.type_cast('')
        #     #=> nil
        #
        #     datetime_attribute.type_cast(nil)
        #     #=> nil
        #
        # @param [Mixed] raw_value The value to cast to a DateTime object.
        # @param [Hash] options
        # @return [DateTime,nil]
        def self.type_cast raw_value, options = {}
          case raw_value
          when nil      then nil
          when ''       then nil
          when DateTime then raw_value
          when Integer  then
            begin
              DateTime.parse(Time.at(raw_value).to_s) # timestamp
            rescue
              nil
            end
          else
            begin
              DateTime.parse(raw_value.to_s) # Time, Date or String
            rescue
              nil
            end
          end
        end

        # Returns a DateTime object encoded as a string (suitable for sorting).
        #
        #     attribute.serialize(DateTime.parse('2001-01-01'))
        #     #=> '2001-01-01T00:00:00:Z)
        #
        # @param [DateTime] datetime The datetime object to serialize.
        # @param [Hash] options
        # @return [String] Returns the datetime object serialized to a string
        #   in ISO8601 format (e.g. '2011-01-02T10:11:12Z')
        def self.serialize datetime, options = {}
          unless datetime.is_a?(DateTime)
            msg = "expected a DateTime value, got #{datetime.class}"
            raise ArgumentError, msg
          end
          datetime.strftime('%Y-%m-%dT%H:%M:%S%Z')
        end

        # @api private
        def self.allow_set?
          true
        end

      end
    end
  end
end
