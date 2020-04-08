require 'json'

module Aws
  module Resources
    class Source

      def initialize(definition, file = nil)
        @definition = definition
        @file = file
      end

      # @return [Hash]
      attr_reader :definition

      # @return [String, nil]
      attr_reader :file

      def format
        json = JSON.pretty_generate(definition, indent: '  ', space: '')
        stack = [[]]
        json.lines.each do |line|
          if line.match(/({|\[)$/)
            stack.push([])
          end
          stack.last.push(line)
          if line.match(/(}|\]),?$/)
            frame = stack.pop
            if frame.size == 3 && !frame[1].match(/[{}]/)
              frame = [frame[0].rstrip, '', frame[1].strip, '', frame[2].lstrip]
            end
            stack.last.push(frame.join)
          end
        end
        stack.last.join
      end

    end
  end
end
