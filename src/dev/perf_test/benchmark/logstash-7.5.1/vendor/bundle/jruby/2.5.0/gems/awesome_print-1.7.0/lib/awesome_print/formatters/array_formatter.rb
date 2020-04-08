require_relative 'base_formatter'

module AwesomePrint
  module Formatters
    class ArrayFormatter < BaseFormatter

      attr_reader :array, :inspector, :options

      def initialize(array, inspector)
        @array = array
        @inspector = inspector
        @options = inspector.options
      end

      def format
        return "[]" if array == []

        if array.instance_variable_defined?('@__awesome_methods__')
          methods_array(array)
        elsif options[:multiline]
          width = (array.size - 1).to_s.size

          data = array.inject([]) do |arr, item|
            index = indent
            index << colorize("[#{arr.size.to_s.rjust(width)}] ", :array) if options[:index]
            indented do
              arr << (index << inspector.awesome(item))
            end
          end

          data = limited(data, width) if should_be_limited?
          "[\n" << data.join(",\n") << "\n#{outdent}]"
        else
          "[ " << array.map{ |item| inspector.awesome(item) }.join(", ") << " ]"
        end
      end

      private

      def methods_array(a)
        a.sort! { |x, y| x.to_s <=> y.to_s }                  # Can't simply a.sort! because of o.methods << [ :blah ]
        object = a.instance_variable_get('@__awesome_methods__')
        tuples = a.map do |name|
          if name.is_a?(Symbol) || name.is_a?(String)         # Ignore garbage, ex. 42.methods << [ :blah ]
            tuple = if object.respond_to?(name, true)         # Is this a regular method?
              the_method = object.method(name) rescue nil     # Avoid potential ArgumentError if object#method is overridden.
              if the_method && the_method.respond_to?(:arity) # Is this original object#method?
                method_tuple(the_method)                      # Yes, we are good.
              end
            elsif object.respond_to?(:instance_method)              # Is this an unbound method?
              method_tuple(object.instance_method(name)) rescue nil # Rescue to avoid NameError when the method is not
            end                                                     # available (ex. File.lchmod on Ubuntu 12).
          end
          tuple || [ name.to_s, '(?)', '?' ]                  # Return WTF default if all the above fails.
        end

        width = (tuples.size - 1).to_s.size
        name_width = tuples.map { |item| item[0].size }.max || 0
        args_width = tuples.map { |item| item[1].size }.max || 0

        data = tuples.inject([]) do |arr, item|
          index = indent
          index << "[#{arr.size.to_s.rjust(width)}]" if @options[:index]
          indented do
            arr << "#{index} #{colorize(item[0].rjust(name_width), :method)}#{colorize(item[1].ljust(args_width), :args)} #{colorize(item[2], :class)}"
          end
        end

        "[\n" << data.join("\n") << "\n#{outdent}]"
      end
    end
  end
end
