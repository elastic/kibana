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
    class Model

      module Attributes

        class BooleanAttr < Record::Attributes::BooleanAttr
          def self.serialize boolean, options = {}
            super.to_s
          end
        end

        class IntegerAttr < Record::Attributes::IntegerAttr
          def self.serialize integer, options = {}
            super.to_s
          end
        end

        class FloatAttr < Record::Attributes::FloatAttr
          def self.serialize float, options = {}
            super.to_s
          end
        end

        class SortableIntegerAttr < IntegerAttr

          def initialize name, options = {}
            range = options[:range]
            raise ArgumentError, "missing required option :range" unless range
            raise ArgumentError, ":range should be a integer range" unless
              range.is_a?(Range) and range.first.is_a?(Integer)
            super(name, options)
          end

          # Returns a serialized representation of the integer value suitable for
          # storing in SimpleDB.
          #
          #     attribute.serialize(123)
          #     #=> '123'
          #
          #     # padded to the correct number of digits
          #     attribute.serialize('123', :range => (0..10_000)
          #     #=> '00123'
          #
          #     # offset applied to make all values positive
          #     attribute.serialize('-55', :range => (-100..10_000)
          #     #=> '00045'
          #
          # @param [Integer] integer The number to serialize.
          # @param [Hash] options
          # @option options [required,Range] :range A range that represents the
          #   minimum and maximum values this integer can be.
          #   The returned value will have an offset applied (if min is
          #   less than 0) and will be zero padded.
          # @return [String] A serialized representation of the integer.
          def self.serialize integer, options = {}
            expect(Integer, integer) do
              check_range(integer, options)
              offset_and_precision(options) do |offset,precision|
                "%0#{precision}d" % (integer.to_i + offset)
              end
            end
          end

          def self.deserialize string_value, options = {}
            offset_and_precision(options) do |offset,precision|
              string_value.to_i - offset
            end
          end

          protected
          def self.offset_and_precision options, &block

            min = options[:range].first
            max = options[:range].last

            offset = min < 0 ? min * -1 : 0
            precision = (max + offset).to_s.length

            yield(offset, precision)

          end

          def self.check_range number, options
            unless options[:range].include?(number)
              msg = "unable to serialize `#{number}`, falls outside " +
               "the range #{options[:range]}"
              raise msg
            end
          end

        end

        class SortableFloatAttr < FloatAttr

          def initialize name, options = {}
            range = options[:range]
            raise ArgumentError, "missing required option :range" unless range
            raise ArgumentError, ":range should be an integer range" unless
              range.is_a?(Range) and range.first.is_a?(Integer)
            super(name, options)
          end

          def self.serialize float, options = {}
            expect(Float, float) do
              left, right = float.to_s.split('.')
              left = SortableIntegerAttr.serialize(left.to_i, options)
              SortableIntegerAttr.check_range(float, options)
              "#{left}.#{right}"
            end
          end

          def self.deserialize string_value, options = {}
            expect(String, string_value) do
              left, right = string_value.split('.')
              left = SortableIntegerAttr.deserialize(left, options)
              "#{left}.#{right}".to_f
            end
          end

        end

      end

      class << self

        # Adds a string attribute to this class.
        #
        # @example A standard string attribute
        #
        #   class Recipe < AWS::Record::Model
        #     string_attr :name
        #   end
        #
        #   recipe = Recipe.new(:name => "Buttermilk Pancakes")
        #   recipe.name #=> 'Buttermilk Pancakes'
        #
        # @example A string attribute with `:set` set to true
        #
        #   class Recipe < AWS::Record::Model
        #     string_attr :tags, :set => true
        #   end
        #
        #   recipe = Recipe.new(:tags => %w(popular dessert))
        #   recipe.tags #=> #<Set: {"popular", "desert"}>
        #
        # @param [Symbol] name The name of the attribute.
        # @param [Hash] options
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple values.
        def string_attr name, options = {}
          add_attribute(Record::Attributes::StringAttr.new(name, options))
        end

        # Adds an integer attribute to this class.
        #
        #     class Recipe < AWS::Record::Model
        #       integer_attr :servings
        #     end
        #
        #     recipe = Recipe.new(:servings => '10')
        #     recipe.servings #=> 10
        #
        # @param [Symbol] name The name of the attribute.
        # @param [Hash] options
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple values.
        def integer_attr name, options = {}
          add_attribute(Attributes::IntegerAttr.new(name, options))
        end

        # Adds a sortable integer attribute to this class.
        #
        #     class Person < AWS::Record::Model
        #       sortable_integer_attr :age, :range => 0..150
        #     end
        #
        #     person = Person.new(:age => 10)
        #     person.age #=> 10
        #
        # ### Validations
        #
        # It is recomended to apply a validates_numericality_of with
        # minimum and maximum value constraints.  If a value is assigned
        # to a sortable integer that falls outside of the +:range: it will
        # raise a runtime error when the record is saved.
        #
        # ### Difference Between Sortable an Regular Integer Attributes
        #
        # Because SimpleDB does not support numeric types, all values must
        # be converted to strings.  This complicates sorting by numeric values.
        # To accomplish sorting numeric attributes the values must be
        # zero padded and have an offset applied to eliminate negative values.
        #
        # @param [Symbol] name The name of the attribute.
        # @param [Hash] options
        # @option options [Range] :range A numeric range the represents the
        #   minimum and  maximum values this attribute should accept.
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple values.
        def sortable_integer_attr name, options = {}
          add_attribute(Attributes::SortableIntegerAttr.new(name, options))
        end

        # Adds a float attribute to this class.
        #
        #     class Listing < AWS::Record::Model
        #       float_attr :score
        #     end
        #
        #     listing = Listing.new(:score => '123.456')
        #     listing.score # => 123.456
        #
        # @param [Symbol] name The name of the attribute.
        # @param [Hash] options
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple values.
        def float_attr name, options = {}
          add_attribute(Attributes::FloatAttr.new(name, options))
        end

        # Adds sortable float attribute to this class.
        #
        # Persisted values are stored (and sorted) as strings.  This makes it
        # more difficult to sort numbers because they don't sort
        # lexicographically unless they have been offset to be positive and
        # then zero padded.
        #
        # ### Postive Floats
        #
        # To store floats in a sort-friendly manor:
        #
        #     sortable_float_attr :score, :range => (0..10)
        #
        # This will cause values like 5.5 to persist as a string like '05.5' so
        # that they can be sorted lexicographically.
        #
        # ### Negative Floats
        #
        # If you need to store negative sortable floats, increase your `:range`
        # to include a negative value.
        #
        #     sortable_float_attr :position, :range => (-10..10)
        #
        # AWS::Record will add 10 to all values and zero pad them
        # (e.g. -10.0 will be represented as '00.0' and 10 will be represented as
        # '20.0').  This will allow the values to be compared lexicographically.
        #
        # @note If you change the `:range` after some values have been persisted
        #   you must also manually migrate all of the old values to have the
        #   correct padding & offset or they will be interpreted differently.
        #
        # @param [Symbol] name The name of the attribute.
        # @param [Hash] options
        # @option options [Range] :range The range of numbers this attribute
        #   should represent.  The min and max values of this range will determine
        #   how many digits of precision are required and how much of an offset
        #   is required to make the numbers sort lexicographically.
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple values.
        def sortable_float_attr name, options = {}
          add_attribute(Attributes::SortableFloatAttr.new(name, options))
        end

        # Adds a boolean attribute to this class.
        #
        # @example
        #
        #   class Book < AWS::Record::Model
        #     boolean_attr :read
        #   end
        #
        #   b = Book.new
        #   b.read? # => false
        #   b.read = true
        #   b.read? # => true
        #
        #   listing = Listing.new(:score => '123.456'
        #   listing.score # => 123.456
        #
        # @param [Symbol] name The name of the attribute.
        def boolean_attr name, options = {}

          attr = add_attribute(Attributes::BooleanAttr.new(name, options))

          # add the boolean question mark method
          define_method("#{attr.name}?") do
            !!__send__(attr.name)
          end

        end

        # Adds a datetime attribute to this class.
        #
        # @example A standard datetime attribute
        #
        #   class Recipe < AWS::Record::Model
        #     datetime_attr :invented
        #   end
        #
        #   recipe = Recipe.new(:invented => Time.now)
        #   recipe.invented #=> <DateTime ...>
        #
        # If you add a datetime_attr for `:created_at` and/or `:updated_at` those
        # will be automanaged.
        #
        # @param [Symbol] name The name of the attribute.
        #
        # @param [Hash] options
        #
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple date times.
        #
        def datetime_attr name, options = {}
          add_attribute(Record::Attributes::DateTimeAttr.new(name, options))
        end

        # Adds a date attribute to this class.
        #
        # @example A standard date attribute
        #
        #   class Person < AWS::Record::Model
        #     date_attr :birthdate
        #   end
        #
        #   baby = Person.new
        #   baby.birthdate = Time.now
        #   baby.birthdate #=> <Date: ....>
        #
        # @param [Symbol] name The name of the attribute.
        #
        # @param [Hash] options
        #
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple dates.
        #
        def date_attr name, options = {}
          add_attribute(Record::Attributes::DateAttr.new(name, options))
        end

        # A convenience method for adding the standard two datetime attributes
        # `:created_at` and `:updated_at`.
        #
        # @example
        #
        #   class Recipe < AWS::Record::Model
        #     timestamps
        #   end
        #
        #   recipe = Recipe.new
        #   recipe.save
        #   recipe.created_at #=> <DateTime ...>
        #   recipe.updated_at #=> <DateTime ...>
        #
        def timestamps
          c = datetime_attr :created_at
          u = datetime_attr :updated_at
          [c, u]
        end

      end
    end
  end
end
