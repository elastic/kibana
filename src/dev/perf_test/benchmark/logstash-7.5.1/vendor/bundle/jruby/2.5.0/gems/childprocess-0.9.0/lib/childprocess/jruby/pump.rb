module ChildProcess
  module JRuby
    class Pump
      BUFFER_SIZE = 2048

      def initialize(input, output)
        @input  = input
        @output = output
        @stop   = false
      end

      def stop
        @stop = true
        @thread && @thread.join
      end

      def run
        @thread = Thread.new { pump }

        self
      end

      private

      def pump
        buffer = Java.byte[BUFFER_SIZE].new

        until @stop && (@input.available == 0)
          read, avail = 0, 0

          while read != -1
            avail = [@input.available, 1].max
            avail = BUFFER_SIZE if avail > BUFFER_SIZE
            read = @input.read(buffer, 0, avail)

            if read > 0
              @output.write(buffer, 0, read)
              @output.flush
            end
          end

          sleep 0.1
        end

        @output.flush
      rescue java.io.IOException => ex
        ChildProcess.logger.debug ex.message
        ChildProcess.logger.debug ex.backtrace
      end

    end # Pump
  end # JRuby
end # ChildProcess
