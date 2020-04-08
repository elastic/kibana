# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
require_relative "formatters/object_formatter"
require_relative "formatters/hash_formatter"
require_relative "formatters/array_formatter"
require_relative "formatters/simple_formatter"
require_relative "formatters/method_formatter"
require_relative "formatters/class_formatter"
require_relative "formatters/dir_formatter"
require_relative "formatters/file_formatter"
require_relative "colorize"

module AwesomePrint
  class Formatter
    include Colorize

    attr_reader :inspector, :options

    CORE = [ :array, :bigdecimal, :class, :dir, :file, :hash, :method, :rational, :set, :struct, :unboundmethod ]

    def initialize(inspector)
      @inspector   = inspector
      @options     = inspector.options
    end

    # Main entry point to format an object.
    #------------------------------------------------------------------------------
    def format(object, type = nil)
      core_class = cast(object, type)
      awesome = if core_class != :self
        send(:"awesome_#{core_class}", object) # Core formatters.
      else
        awesome_self(object, type) # Catch all that falls back to object.inspect.
      end
      awesome
    end

    # Hook this when adding custom formatters. Check out lib/awesome_print/ext
    # directory for custom formatters that ship with awesome_print.
    #------------------------------------------------------------------------------
    def cast(object, type)
      CORE.grep(type)[0] || :self
    end

    private

    # Catch all method to format an arbitrary object.
    #------------------------------------------------------------------------------
    def awesome_self(object, type)
      if @options[:raw] && object.instance_variables.any?
        awesome_object(object)
      elsif hash = convert_to_hash(object)
        awesome_hash(hash)
      else
        awesome_simple(object.inspect.to_s, type, @inspector)
      end
    end

    def awesome_bigdecimal(n)
      o = n.to_s("F")
      type = :bigdecimal
      awesome_simple(o, type, @inspector)
    end

    def awesome_rational(n)
      o = n.to_s
      type = :rational
      awesome_simple(o, type, @inspector)
    end

    def awesome_simple(o, type, inspector)
      AwesomePrint::Formatters::SimpleFormatter.new(o, type, inspector).format
    end

    def awesome_array(a)
      Formatters::ArrayFormatter.new(a, @inspector).format
    end

    def awesome_set(s)
      Formatters::ArrayFormatter.new(s.to_a, @inspector).format
    end

    def awesome_hash(h)
      Formatters::HashFormatter.new(h, @inspector).format
    end

    def awesome_object(o)
      Formatters::ObjectFormatter.new(o, o.instance_variables, @inspector).format
    end

    def awesome_struct(s)
      Formatters::ObjectFormatter.new(s, s.members, @inspector).format
    end

    def awesome_method(m)
      Formatters::MethodFormatter.new(m, @inspector).format  
    end
    alias :awesome_unboundmethod :awesome_method

    def awesome_class(c)
      Formatters::ClassFormatter.new(c, @inspector).format
    end

    def awesome_file(f)
      Formatters::FileFormatter.new(f, @inspector).format
    end

    def awesome_dir(d)
      Formatters::DirFormatter.new(d, @inspector).format
    end

    # Utility methods.
    #------------------------------------------------------------------------------
    def convert_to_hash(object)
      if ! object.respond_to?(:to_hash)
        return nil
      end

      if object.method(:to_hash).arity != 0
        return nil
      end

      hash = object.to_hash
      if ! hash.respond_to?(:keys) || ! hash.respond_to?('[]')
        return nil
      end

      return hash
    end
  end
end
