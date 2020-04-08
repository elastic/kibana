require_relative 'base_formatter'

module AwesomePrint
  module Formatters
    class HashFormatter < BaseFormatter

      attr_reader :hash, :inspector, :options

      def initialize(hash, inspector)
        @hash = hash
        @inspector = inspector
        @options = inspector.options
      end

      def format
        return "{}" if hash == {}

        keys = hash.keys
        keys = keys.sort { |a, b| a.to_s <=> b.to_s } if options[:sort_keys]
        data = keys.map do |key|
          plain_single_line do
            [ inspector.awesome(key), hash[key] ]
          end
        end

        width = data.map { |key, | key.size }.max || 0
        width += indentation if options[:indent] > 0

        data = data.map do |key, value|
          indented do
            align(key, width) << colorize(" => ", :hash) << inspector.awesome(value)
          end
        end

        data = limited(data, width, :hash => true) if should_be_limited?
        if options[:multiline]
          "{\n" << data.join(",\n") << "\n#{outdent}}"
        else
          "{ #{data.join(', ')} }"
        end
      end

      private

      def plain_single_line
        plain, multiline = options[:plain], options[:multiline]
        options[:plain], options[:multiline] = true, false
        yield
      ensure
        options[:plain], options[:multiline] = plain, multiline
      end
    end
  end
end
