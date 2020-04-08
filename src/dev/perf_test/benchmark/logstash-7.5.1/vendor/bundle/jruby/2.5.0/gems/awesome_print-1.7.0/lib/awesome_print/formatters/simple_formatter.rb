require_relative 'base_formatter'

module AwesomePrint
  module Formatters
    class SimpleFormatter < BaseFormatter

      attr_reader :string, :type, :inspector, :options

      def initialize(string, type, inspector)
        @string = string
        @type = type
        @inspector = inspector
        @options = inspector.options
      end

      def format
        colorize(string, type)
      end
    end
  end
end
