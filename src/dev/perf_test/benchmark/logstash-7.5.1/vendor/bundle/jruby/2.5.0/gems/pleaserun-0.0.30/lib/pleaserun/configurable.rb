require "pleaserun/namespace"
require "insist"

# A mixin class that provides 'attribute' to a class.
# The main use for such attributes is to provide validation for mutators.
#
# Example:
#
#     class Person
#       include PleaseRun::Configurable
#
#       attribute :greeting, "A simple greeting" do |greeting|
#         # do any validation here.
#         raise "Greeting must be a string!" unless greeting.is_a?(String)
#       end
#     end
#
#     person = Person.new
#     person.greeting = 1234 # Fails!
#     person.greeting = "Hello, world!"
#
#     puts person.greeting
#     # "Hello, world!"
module PleaseRun::Configurable
  class ConfigurationError < ::StandardError; end
  class ValidationError < ConfigurationError; end

  def self.included(klass)
    klass.extend(ClassMixin)

    m = respond_to?(:initialize) ? method(:initialize) : nil
    define_method(:initialize) do |*args, &block|
      m.call(*args, &block) if m
      configurable_setup
    end
  end # def self.included

  def validate
    # validate the value of each attribute
    self.class.attributes.each do |attribute|
      attribute.validate(send(attribute.name))
    end
  end

  def configurable_setup
    @attributes = {}
    self.class.ancestors.each do |ancestor|
      next unless ancestor.include?(PleaseRun::Configurable)
      ancestor.attributes.each do |facet|
        @attributes[facet.name] = facet.clone
      end
    end
  end # def configurable_setup

  # A mixin to extend a class with whenever a class includes
  # PleaseRun::Configurable.
  #
  # This class provides class-level 'attribute' method intended for use in
  # defining attributes as well as a class-level 'attributes' method for
  # listing attributes defined in this class. Finally, a helper
  # 'all_attributes' method is provided to get all attributes defined by this
  # class and any ancestors.
  module ClassMixin
    # Define an attribute on this class.
    def attribute(name, description, options = {}, &validator)
      facet = Facet.new(name, description, options, &validator)
      attributes << facet

      # define accessor method
      define_method(name.to_sym) do
        # object instance, not class ivar
        @attributes[name.to_sym].value
      end

      # define mutator
      define_method("#{name}=".to_sym) do |value|
        # object instance, not class ivar
        @attributes[name.to_sym].value = value
      end

      # define presence check method
      define_method("#{name}?".to_sym) do
        return @attributes[name.to_sym].set?
      end
    end # def attribute

    def attributes
      return @attributes ||= []
    end

    def all_attributes
      return ancestors.select { |a| a.respond_to?(:attributes) }.collect(&:attributes).flatten
    end # def attributes
  end # def ClassMixin

  # A DSL for describing a facet.
  #
  # For example:
  #
  #     Facet.new(:temperature, "The temperature value") do
  #       validate do |v|
  #         fail "Temperature must be a number" unless v.is_a?(Numeric)
  #       end
  #       munge do |v|
  #         Float(v)
  #       end
  #     end
  #
  # Both validation and munge blocks are optional.
  #
  # The 'validate' block is expcted to fail if the value given to the
  # facet is not valid.
  #
  # The 'munge' block is intended to help you coerce a value.  For example, if
  # you take "1234" from the user input (for example, as a command line flag
  # value), you could use 'munge' to convert it to a number, as above.
  #
  # Munge is invoked *before* validation. Munge can fail if an invalid
  # value is given.
  class FacetDSL
    def initialize(facet, &block)
      @facet = facet
      instance_eval(&block)
    end

    def validate(&block)
      @facet.validator = block
    end

    def munge(&block)
      @facet.munger = block
    end
  end

  # A generalized facet/property/container for a single value.
  #
  # Supports naming and text descriptions of this thing.
  #
  # Also supports value validation and munging on assignment to help
  # you more easily accept user input from a variety of sources and
  # keep the validation and value munging concerns near the value itself.
  class Facet
    attr_reader :name
    attr_reader :description
    attr_reader :options
    attr_writer :validator, :munger

    def initialize(name, description, options = {}, &facet_dsl)
      insist { name }.is_a?(Symbol)
      insist { description }.is_a?(String)
      insist { options }.is_a?(Hash)

      @name = name
      @description = description
      @options = options

      FacetDSL.new(self, &facet_dsl) if block_given?

      validate(@options[:default]) if @options[:default]
    end # def initialize

    def value=(v)
      v = @munger.call(v) if @munger
      validate(v)
      @value = v
    end # def value=

    def validate(v)
      return @validator.call(v) if @validator
    rescue => e
      raise ValidationError, "Invalid value '#{v.inspect}' for attribute '#{name}' (#{e})"
    end # def validate

    def value
      return @value if @value
      return @options[:default] if @options.include?(:default)
      return nil
    end # def value

    def set?
      return !@value.nil?
    end # def set?
  end # class Facet
end # module PleaseRun::Configurable
