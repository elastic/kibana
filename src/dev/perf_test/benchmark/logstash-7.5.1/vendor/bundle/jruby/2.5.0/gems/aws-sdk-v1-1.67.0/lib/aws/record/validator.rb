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

    # Base class for all validators
    # @api private
    class Validator

      # these should be defined in subclasses
      ACCEPTED_OPTIONS = []

      def initialize record_class, *attribute_names, &block

        @options = attribute_names.last.is_a?(Hash) ? attribute_names.pop : {}

        @attribute_names = attribute_names.map(&:to_s)

        reject_unknown_options

        ensure_type([Symbol, Proc], :if, :unless)
        ensure_is([:save, :create, :update], :on)

        setup(record_class)

      end

      # @return [String] Returns the name of the attribute this validator
      #   will check on the record during validation.
      attr_reader :attribute_names

      # @return [Hash] Returns the hash of options for this validator.
      attr_reader :options

      def validate record
        if
          passes_on_condition?(record) and
          passes_if_condition?(record) and
          passes_unless_condition?(record)
        then
          validate_attributes(record)
        end
      end

      # @api private
      protected
      def setup klass
      end

      # @api private
      protected
      def each_value value, &block
        case value
        when Array, Set then value.each{|v| yield(v) }
        else yield(value)
        end
      end

      # @api private
      protected
      def add_accessors klass, *accessors

        methods = klass.instance_methods.collect{|m| m.to_s }

        accessors.each do |attr|

          setter = "#{attr}="
          getter = attr.to_s

          unless methods.include?(getter)
            klass.send(:attr_reader, attr)
            klass.send(:public, getter)
          end

          unless methods.include?(setter)
            klass.send(:attr_writer, attr)
            klass.send(:public, setter)
          end

        end

      end

      # @api private
      protected
      def validate_attributes record
        attribute_names.each do |attribute_name|
          value = read_attribute_for_validation(record, attribute_name)
          next if (value.nil? && options[:allow_nil]) || (blank?(value) && options[:allow_blank])
          validate_attribute(record, attribute_name, value)
        end
      end

      def blank? value
        case value
        when nil        then true
        when String     then value !~ /\S/
        else
          !value
        end
      end

      # @api private
      protected
      def read_attribute_for_validation(record, attribute_name)
        record.send(attribute_name)
      end

      # @api private
      def reject_unknown_options
        invalid_keys = options.keys - self.class::ACCEPTED_OPTIONS
        if invalid_keys.length == 1
          raise ArgumentError, "unknown option :#{invalid_keys.first}"
        elsif invalid_keys.length > 1
          bad = invalid_keys.collect{|k| ":#{k}" }.join(', ')
          raise ArgumentError, "unknown options #{bad}"
        end
      end

      # @api private
      private
      def passes_if_condition? record
        case options[:if]
        when nil            then true
        when Proc           then options[:if].call(record)
        when String, Symbol then record.send(options[:if])
        else
          raise 'invalid :if option, must be nil, a method name or a Proc'
        end
      end

      # @api private
      private
      def passes_unless_condition? record
        case options[:unless]
        when nil            then true
        when Proc           then !options[:unless].call(record)
        when String, Symbol then !record.send(options[:unless])
        else
          raise 'invalid :unless option, must be nil, a method name or a Proc'
        end
      end

      # @api private
      private
      def passes_on_condition? record
        case options[:on]
        when nil     then true
        when :save   then true
        when :create then record.new_record?
        when :update then record.persisted?
        else
          raise 'invalid :on option, must be nil, :save, :create or :update'
        end
      end

      # @api private
      protected
      def ensure_type type_or_types, *keys

        types = Array(type_or_types)

        keys.each do |key|

          next unless options.has_key?(key)
          next unless types.none?{|type| options[key].is_a?(type) }

          expected = types.map{|type| type.to_s }
          if expected.count == 1
            raise ArgumentError, "expected option :#{key} to be a #{expected}"
          else
            msg = "expected :#{key} to be one of #{expected.join(', ')}"
            raise ArgumentError, msg
          end

        end
      end

      def ensure_is value_or_values, *keys
        values = Array(value_or_values)
        keys.each do |key|
          next unless options.has_key?(key)
          unless values.include?(options[key])
            valid = values.map{|v| v.is_a?(Symbol) ? ":#{v}" : v.to_s }.join(', ')
            raise ArgumentError, "expected :#{key} to be one of #{valid}"
          end
        end
      end

      # @api private
      protected
      def ensure_exclusive *key_groups
        key_groups.each do |key_group|
          others = key_groups - [key_group]
          Array(key_group).each do |key|
            next unless options.has_key?(key)
            conflicts = others.flatten.select{|other| options.has_key?(other) }
            unless conflicts.empty?
              msg = ":#{key} may not be used with :#{conflicts.first}"
              raise ArgumentError, msg
            end
          end
        end
      end

      # @api private
      protected
      def ensure_present *keys
        keys.each do |k|
          unless options.has_key?(k)
            raise ArgumentError, "missing required option :#{k}"
          end
        end
      end

      # @api private
      protected
      def ensure_at_least_one *keys
        found = keys.select{|k| options.has_key?(k) }
        unless found.count >= 1
          opts = keys.collect{|k| ":#{k}" }.join(', ')
          msg = "must provide at least one of the following options: #{opts}"
          raise ArgumentError, msg
        end
      end

      protected
      def set_default key, value
        options[key] = value unless options.has_key?(key)
      end

    end

  end
end
