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

    # Validation methods to be used with subclasses of AWS::Record::Model.
    #
    # # General Usage
    #
    # All standard validation methods follow the same basic usage.
    # Call the validation method followed by one more attribute names
    # and then an optional hash of modifiers.
    #
    #       class Book < AWS::Record::Model
    #
    #       # ...
    #
    #       validates_presence_of :title, :author
    #
    #       validates_length_of :summary,
    #         :max => 500,
    #         :allow_nil => true,
    #         :allow_blank => true
    #
    #     end
    #
    # # Conditional Validations
    #
    # Sometimes you only want to validate an attribute under certain
    # conditions.  To make this simple, all validation methods accept the
    # following 3 options:
    #
    # * `:on`
    # * `:if`
    # * `:unless`
    #
    # You may mix and match all 3 of the above options.
    #
    # ### Validate on :create or :update
    #
    # By default validations are run on create and update, but you can
    # specify them to run for only create (initial save) or updates.
    #
    #     validates_presence_of :created_at, :on => :create
    #
    #     validates_presence_of :updated_at, :on => :update
    #
    # ### Validate :if or :unless
    #
    # Sometimes you have more complex requirements to determine if/when a
    # validation should run.  `:if` and `:unless`: both accept either
    # a method name or proc.
    #
    #     class Person
    #
    #       # ...
    #
    #       validates_presence_of :job_title, :if => :employee?
    #
    #       validates_presence_of :nickname, :if => lambda {|person|
    #         person.is_family? or person.is_friend? }
    #
    #     end
    #
    # # Validating Virtual (Non-persisted) Attributes
    #
    # All of the validators can be used with configured attributes, but they
    # can also be used with any attribute that has a setter and a getter.
    #
    #     Class Book < AWS::Record::Model
    #       attr_accessor :title
    #       validates_presence_of :title
    #     end
    #
    module Validations

      def self.extended base

        base.send(:define_method, :run_validations) do
          errors.clear!
          self.class.send(:validators).each do |validator|
            validator.validate(self)
          end
        end

        base.send(:private, :run_validations)

      end

      # Registers a validation method.
      #
      #     validate :ensure_age_is_greater_than_shoe_size
      #
      #     def ensure_age_is_greater_than_shoe_size
      #       unless age > shoe_size
      #         errors.add(:age, 'should be greater than your shoe size')
      #       end
      #     end
      #
      # You can also pass a list of method names that should be called during
      # validation.
      #
      #     validate :some_complex_validation, :some_other_validation
      #
      # As with most other validation methods you can also pass a hash of
      # options that affect when the named validation methods get called.
      #
      #     validate :my_custom_validation, :unless => :new_record?
      #
      # @overload validate(*method_names, options = {})
      #   @param [Array<Symbol>] method_names A list of methods to call
      #     during validation.
      #   @param [Hash] options
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validate *args
        validators << MethodValidator.new(self, *args)
      end

      # This validation method is primariliy intended for ensuring a form
      # checkbox (like an EULA agreement or terms of service acknowledgement)
      # is checked.
      #
      #     class User < AWS::Record::Model
      #       boolean_attr :terms_of_service
      #       validates_acceptance_of :terms_of_service
      #     end
      #
      # ### Virtual Attributes
      #
      # If you choose to validate the acceptance of a non-existant attribute
      # then a setter and a getter will be added automtically for you.
      #
      #     class User < AWS::Record::Model
      #       validates_acceptance_of :terms_of_service
      #     end
      #
      #     user = User.new
      #     user.respond_to?(:terms_of_service)  #=> true
      #     user.respond_to?(:terms_of_service=) #=> true
      #
      # ### Accepted Values
      #
      # The default behavior for `validates_acceptance_of` is to add
      # an error when the value is '1' or `true`.  Also note, this validation
      # method defaults `:allow_nil` to true.
      #
      # * `nil` implies the field was omitted from the form and therefore
      #   should not be validated
      #
      #       class User < AWS::Record::Model
      #         validates_acceptance_of :terms_of_service
      #       end
      #
      #       u = User.new
      #       u.terms_of_service #=> nil
      #       u.valid?           #=> true
      #
      # * '1' is the default value for most checkbox form helpers, and #
      #   therefore indicates an accepted value.
      #
      # * `true` is how boolean attributes typecast '1'. This is helpful
      #   when you have your checkbox post its value to a `:boolean_attr`.
      #
      # ### Multi-Valued Attributes
      #
      # This validator works only with single-valued attributes.  If you need
      # to validate that all of the values in a set are true, then use
      # {#validates_inclusion_of}.
      #
      # @note Most validators default :allow_nil to false, this one defaults to true
      # @note This validator should not be used with multi-valued attributes
      #
      # @overload validates_acceptance_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [mixed] :accpet Specify an additional accepted value.
      #
      #         validates_acceptance_of :agree, :accept => 'yes'
      #
      #   @option options [String] :message A custom error message.  The default
      #     `:message` is "must be accepted".
      #   @option options [Boolean] :allow_nil (true) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (true) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_acceptance_of *args
        validators << AcceptanceValidator.new(self, *args)
      end

      # Intended primarily for validating a form field was entered correctly
      # by requiring it twice:
      #
      #     Model:
      #       class User < AWS::Record::Model
      #         validates_confirmation_of :password, :if => :password_changed?
      #       end
      #
      #     View:
      #       <%= password_field "user", "password" %>
      #       <%= password_field "user", "password_confirmation" %>
      #
      # ### Confirmation Value Accessors
      #
      # If your model does not have accessors for the confirmation value
      # then they will be automatically added.  In the example above
      # the user class would have an `attr_accessor` for
      # `:password_confirmation`.
      #
      # ### Conditional Validation
      #
      # Mostly commonly you only need to validate confirmation of an
      # attribute when it has changed.  It is therefore suggested to
      # pass an `:if` condition reflecting this:
      #
      #     validates_confirmation_of :password, :if => :password_changed?
      #
      # ### Multi-Valued Attributes
      #
      # This validator works only with single-valued attributes.
      # It should not be used on attributes that have array or set values.
      #
      # @note This validation method does not accept the `:allow_nil` or the
      # `:allow_blank` options.
      #
      # @overload validates_confirmation_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [String] :message A custom error message.  The default
      #     `:message` is "doesn't match confirmation".
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_confirmation_of *args
        validators << ConfirmationValidator.new(self, *args)
      end

      # Validates the number of values for a given attribute.
      #
      # ### Length vs Count
      #
      # `validates_count_of` validates the number of attribute values,
      # whereas +validates_length_of: validates the length of each
      # attribute value instead.
      #
      # If you need to ensure each attribute value is a given length see
      # {#validates_length_of} instead.
      #
      # ### Examples
      #
      # You can validate there are a certain number of values:
      #
      #     validates_count_of :parents, :exactly => 2
      #
      # You can also specify a range:
      #
      #     validates_count_of :tags, :within => (2..10)
      #
      # You can also specify min and max value seperately:
      #
      #     validates_count_of :tags, :minimum => 2, :maximum => 10
      #
      # ### `nil` Values
      #
      # If you are validating an array or set that contains `nil` values,
      # the `nil` values are counted normally as 1 each.
      #
      # If you are validating a non-enuemrable attribute that only
      # contains a single nil or other scalar value, then nil is
      # counted as 0.
      #
      # ### Singular Attributes
      #
      # This validator is intended to for validating attributes that have
      # an array or set of values.  If used on an attribute that
      # returns a scalar value (like `nil` or a string), the count will
      # always be 0 (for `nil`) or 1 (for everything else).
      #
      # It is therefore recomended to use `:validates_presence_of` in
      # place of `:validates_count_of` when working with single-valued
      # attributes.
      #
      # @overload validates_count_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [Integer] :exactly The exact number of values the
      #     attribute should have.  If this validation option fails the
      #     error message specified by `:wrong_number` will be added.
      #   @option options [Range] :within An range of number of values to
      #     accept.  If the attribute has a number of values outside this range
      #     then the `:too_many` or `:too_few` error message will be added.
      #   @option options [Integer] :minimum The minimum number of values
      #     the attribute should have.  If it has fewer, the `:too_few` error
      #     message will be added.
      #   @option options [Integer] :maximum The maximum number of values
      #     the attribute should have.  If it has more, the `:too_many` error
      #     message will be added.
      #   @option options [String] :too_many An error message added
      #     when the attribute has too many values.  Defaults to
      #     <code>"has too many values (maximum is %{maximum})"</code>
      #   @option options [String] :too_few An error message added
      #     when the attribute has too few values.  Defaults to
      #     <code>"has too few values (minimum is %{minimum})"</code>
      #   @option options [String] :wrong_number An error message
      #     added when the number of attribute values does not match
      #     the `:exactly` option.  Defaults to <code>"has the wrong
      #     number of values (should have exactly %{exactly}"</code>
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_count_of *args
        validators << CountValidator.new(self, *args)
      end

      # Adds a block validator that is called during record validation.
      #
      #     class ExampleClass < AWS::Record::Model
      #
      #       string_attr :name
      #
      #       validates_each(:name) do |record, attribute_name, value|
      #         if value == 'John Doe'
      #           record.errors.add(attr_name, 'may not be an alias')
      #         end
      #       end
      #
      #     end
      #
      # @overload validates_each(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [Boolean] :allow_nil (false) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (false) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_each *attributes, &block
        unless block_given?
          raise ArgumentError, 'missing required block for validates_each'
        end
        validators << BlockValidator.new(self, *attributes, &block)
      end

      # Validates that the attribute value is not included in the given
      # enumerable.
      #
      #     validates_exlusion_of :username, :in => %w(admin administrator)
      #
      # ### Multi-Valued Attributes
      #
      # You may use this with multi-valued attributes the same way you use it
      # with single-valued attributes:
      #
      #     class Product < AWS::Record::Model
      #       string_attr :tags, :set => true
      #       validates_exlusion_of :tags, :in => four_letter_words
      #     end
      #
      # @overload validates_exclusion_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [required, Enumerable] :in An enumerable object to
      #     ensure the value is not in.
      #   @option options [String] :message A custom error message.  The default
      #     `:message` is "is reserved".
      #   @option options [Boolean] :allow_nil (false) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (false) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_exclusion_of *args
        validators << ExclusionValidator.new(self, *args)
      end

      # Validates the attribute's value matches the given regular exression.
      #
      #     validates_format_of :year, :with => /^\d{4}$/
      #
      # You can also perform a not-match using `:without` instead of `:with`.
      #
      #     validates_format_of :username, :without => /\d/
      #
      # ### Multi-Valued Attributes
      #
      # You may use this with multi-valued attributes the same way you use it
      # with single-valued attributes:
      #
      #     class Product < AWS::Record::Model
      #       string_attr :tags, :set => true
      #       validates_format_of :tags, :with => /^\w{2,10}$/
      #     end
      #
      # @overload validates_format_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [Regexp] :with If the value matches the given
      #     regex, an error will not be added.
      #   @option options [Regexp] :without If the value matches the given
      #     regex, an error will be added.
      #     must match, or an error is added.
      #   @option options [String] :message A custom error message.  The default
      #     `:message` is "is reserved".
      #   @option options [Boolean] :allow_nil (false) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (false) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_format_of *args
        validators << FormatValidator.new(self, *args)
      end

      # Validates that the attribute value is included in the given enumerable
      # object.
      #
      #     class MultipleChoiceAnswer < AWS::Record::Model
      #       validates_inclusion_of :letter, :in => %w(a b c d e)
      #     end
      #
      # ### Multi-Valued Attributes
      #
      # You may use this with multi-valued attributes the same way you use it
      # with single-valued attributes.
      #
      # @overload validates_inclusion_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [required, Enumerable] :in An enumerable object to
      #     check for the value in.
      #   @option options [String] :message A custom error message.  The default
      #     `:message` is "is not included in the list".
      #   @option options [Boolean] :allow_nil (false) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (false) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_inclusion_of *attributes
        validators << InclusionValidator.new(self, *attributes)
      end

      # Validates the attribute values are of a specified length.
      #
      #     validates_lenth_of :username, :within => 3..25
      #
      # ### Length vs Count
      #
      # `validates_length_of` validates the length of individual attribute
      # values, whereas +validates_count_of: validates the number of
      # attribute values.
      #
      # If you need to ensure there are certain number of values see
      # {#validates_count_of} instead.
      #
      # @overload validates_length_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [Enumerable] :within An enumerable object to
      #     ensure the length of the value falls within.
      #   @option options [Integer] :exactly The exact length a value must be.
      #     If this validation fails the error message specified by
      #     `:wrong_length` will be added.
      #   @option options [Range] :within An enumerable object which must
      #     include the length of the attribute, or an error will be added.
      #     If the attribute has a length outside the range then the
      #     `:too_long` or `:too_short` error message will be added.
      #   @option options [Integer] :minimum The minimum length an attribute
      #     value should be.  If it is shorter, the `:too_short` error
      #     message will be added.
      #   @option options [Integer] :maximum The maximum length an attribute
      #     value should be.  If it is longer, the `:too_long` error
      #     message will be added.
      #   @option options [String] :too_long An error message added
      #     when the attribute value is too long. Defaults to
      #     <code>"is too long (maximum is %{maximum}
      #     characters)"</code>
      #   @option options [String] :too_short An error message added
      #     when the attribute value is too short. Defaults to
      #     <code>"is too short (minimum is %{minimum}
      #     characters)"</code>
      #   @option options [String] :wrong_length An error message
      #     added when the attribute has the incorrect length (as
      #     specified by `:exactly`).  Defaults to <code>"is the wrong
      #     length (should be %{exactly} characters"</code>
      #   @option options [Boolean] :allow_nil (false) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (false) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_length_of *args
        validators << LengthValidator.new(self, *args)
      end

      # Validates the attribute has a numeric value.
      #
      #     validates_numericality_of :age, :only_integer => true
      #
      # ### Multi-Valued Attributes
      #
      # You can validate multi-valued attributes using this the same way you
      # validate single-valued attributes. Each value will be validated
      # individually.
      #
      # @overload validates_numericality_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [Boolean] :only_integer (false) Adds an error
      #     when valiating and the value is numeric, but it not a whole number.
      #   @option options [Integer] :equal_to When set the value must equal
      #     the given value exactly.  May not be used with the greater/less
      #     options.
      #   @option options [Numeric] :greater_than Ensures the attribute
      #     is greater than the given number.
      #   @option options [Integer] :greater_than_or_equal_to Ensures the
      #     attribute is greater than or equal to the given number.
      #   @option options [Numeric] :less_than Ensures the attribute is less
      #     than the given value.
      #   @option options [Integer] :less_than_or_equal_to Ensures the value is
      #     less than or equal to the given number.
      #   @option options [Numeric] :even If true, the value may only be
      #     an even integer.  This forces the `:only_integer` to `true`.
      #   @option options [Numeric] :odd If true, the value may only be
      #     an odd integer.  This forces the `:only_integer` to `true`.
      #   @option options [String] :message A custom error message.  The default
      #     `:message` is "is not a number".
      #   @option options [Boolean] :allow_nil (false) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (false) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_numericality_of *args
        validators << NumericalityValidator.new(self, *args)
      end

      # Validates the named attributes are not blank. For validation
      # purposes, blank values include:
      #
      # * `nil`
      # * empty string
      # * anything that responds to #empty? with true
      # * anything that responds to #blank? with true
      #
      # @overload validates_presence_of(*attributes, options = {}, &block)
      #   @param attributes A list of attribute names to validate.
      #   @param [Hash] options
      #   @option options [String] :message A custom error message.  The default
      #     `:message` is "may not be blank".
      #   @option options [Symbol] :on (:save) When this validation is run.
      #     Valid values include:
      #     * `:save`
      #     * `:create`
      #     * `:update`
      #   @option options [Boolean] :allow_nil (false) Skip validation if the
      #     attribute value is `nil`.
      #   @option options [Boolean] :allow_blank (false) Skip validation if the
      #     attribute value is `blank`.
      #   @option options [Symbol,String,Proc] :if Specifies a method or proc
      #     to call.  The validation will only be run if the return value is
      #     of the method/proc is true (e.g. `:if => :name_changed?` or
      #     `:if => lambda{|book| book.in_stock? }`).
      #   @option options [Symbol,String,Proc] :unless Specifies a method or
      #     proc to call.  The validation will *not* be run if the return value
      #     is of the method/proc is false.
      def validates_presence_of *args
        validators << PresenceValidator.new(self, *args)
      end

      # @api private
      private
      def validators
        @validators ||= []
      end

    end
  end
end
