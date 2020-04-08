module ChildProcess
  module JRuby
    class IO < AbstractIO
      private

      def check_type(output)
        unless output.respond_to?(:to_outputstream) && output.respond_to?(:write)
          raise ArgumentError, "expected #{output.inspect} to respond to :to_outputstream"
        end
      end

    end # IO
  end # Unix
end # ChildProcess


