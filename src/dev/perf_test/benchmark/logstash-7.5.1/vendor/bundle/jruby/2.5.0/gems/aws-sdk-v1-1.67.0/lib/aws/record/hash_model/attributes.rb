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
    class HashModel
      class << self

        # Adds a string attribute to this class.
        #
        # @example A standard string attribute
        #
        #   class Recipe < AWS::Record::HashModel
        #     string_attr :name
        #   end
        #
        #   recipe = Recipe.new(:name => "Buttermilk Pancakes")
        #   recipe.name #=> 'Buttermilk Pancakes'
        #
        # @example A string attribute with `:set` set to true
        #
        #   class Recipe < AWS::Record::HashModel
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
          add_attribute(Attributes::StringAttr.new(name, options))
        end

        # Adds an integer attribute to this class.
        #
        #     class Recipe < AWS::Record::HashModel
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

        # Adds a float attribute to this class.
        #
        #     class Listing < AWS::Record::HashModel
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

        # Adds a boolean attribute to this class.
        #
        # @example
        #
        #   class Book < AWS::Record::HashModel
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
        #   class Recipe < AWS::Record::HashModel
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
          add_attribute(Attributes::DateTimeAttr.new(name, options))
        end

        # Adds a date attribute to this class.
        #
        # @example A standard date attribute
        #
        #   class Person < AWS::Record::HashModel
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
          add_attribute(Attributes::DateAttr.new(name, options))
        end

        # Adds a DynamoDB binary attribute to this class.  A binary
        # attribute acts the same as a string attribute, except
        #
        # @param [Symbol] name The name of the attribute.
        #
        # @param [Hash] options
        #
        # @option options [Boolean] :set (false) When true this attribute
        #   can have multiple values.
        #
        # @note This should not be used for large objects.
        #
        def binary_attr name, options = {}
        end

        # A convenience method for adding the standard two datetime attributes
        # `:created_at` and `:updated_at`.
        #
        # @example
        #
        #   class Recipe < AWS::Record::HashModel
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
