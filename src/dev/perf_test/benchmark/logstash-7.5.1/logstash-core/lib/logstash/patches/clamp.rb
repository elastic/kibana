require 'clamp'
require 'logstash/environment'

module Clamp
  module Attribute
    class Instance
      def default_from_environment
        # we don't want uncontrolled var injection from the environment
        # since we're establishing that settings can be pulled from only three places:
        # 1. default settings
        # 2. yaml file
        # 3. cli arguments
      end
    end
  end

  module Option

    module Declaration
      def deprecated_option(switches, type, description, opts = {})
        Option::Definition.new(switches, type, description, opts).tap do |option|
          declared_options << option
          block ||= option.default_conversion_block
          define_deprecated_accessors_for(option, opts, &block)
        end
      end
    end

    module StrictDeclaration

      include Clamp::Attribute::Declaration
      include LogStash::Util::Loggable

      # Instead of letting Clamp set up accessors for the options
      # weŕe going to tightly controlling them through
      # LogStash::SETTINGS
      def define_simple_writer_for(option, &block)
        LogStash::SETTINGS.get(option.attribute_name)
        define_method(option.write_method) do |value|
          value = instance_exec(value, &block) if block
          LogStash::SETTINGS.set_value(option.attribute_name, value)
        end
      end

      def define_reader_for(option)
        define_method(option.read_method) do
          LogStash::SETTINGS.get_value(option.attribute_name)
        end
      end

      def define_appender_for(option)
        define_method(option.append_method) do |value|
          LogStash::SETTINGS.get_value(option.attribute_name) << value
        end
      end

      def define_deprecated_accessors_for(option, opts, &block)
        define_deprecated_writer_for(option, opts, &block)
      end

      def define_deprecated_writer_for(option, opts, &block)
        define_method(option.write_method) do |value|
          self.class.logger.warn "DEPRECATION WARNING: The flag #{option.switches} has been deprecated, please use \"--#{opts[:new_flag]}=#{opts[:new_value]}\" instead."
          LogStash::SETTINGS.set(opts[:new_flag], opts[:new_value])
        end
      end
    end

    class Definition
      # Allow boolean flags to optionally receive a true/false argument
      # to explicitly set them, i.e.
      # --long.flag.name       => sets flag to true
      # --long.flag.name true  => sets flag to true
      # --long.flag.name false => sets flag to false
      # --long.flag.name=true  => sets flag to true
      # --long.flag.name=false => sets flag to false
      def extract_value(switch, arguments)
        if flag? && (arguments.first.nil? || arguments.first.match("^-"))
          flag_value(switch)
        else
          arguments.shift
        end
      end
    end
  end

  # Create a subclass of Clamp::Command that enforces the use of
  # LogStash::SETTINGS for setting validation
  class StrictCommand < Command
    class << self
      include ::Clamp::Option::StrictDeclaration
    end

    def handle_remaining_arguments
      unless remaining_arguments.empty?
        signal_usage_error "Unknown command '#{remaining_arguments.first}'"
      end
    end
  end
end


