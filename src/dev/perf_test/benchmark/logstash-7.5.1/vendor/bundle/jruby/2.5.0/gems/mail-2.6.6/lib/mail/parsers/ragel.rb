# frozen_string_literal: true
module Mail
  module Parsers
    module Ragel
      require 'mail/parsers/ragel/parser_info'
      require "mail/parsers/ragel/ruby"

      def self.parse(machine, string)
        @machine_module ||= Ruby
        @machine_module.parse(machine, string)
      end

      def self.machine_module=(m)
        @machine_module = m
      end
    end
  end
end
