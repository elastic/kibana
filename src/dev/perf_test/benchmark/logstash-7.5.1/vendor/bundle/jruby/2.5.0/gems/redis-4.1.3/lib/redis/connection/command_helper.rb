class Redis
  module Connection
    module CommandHelper

      COMMAND_DELIMITER = "\r\n"

      def build_command(args)
        command = [nil]

        args.each do |i|
          if i.is_a? Array
            i.each do |j|
              j = j.to_s
              command << "$#{j.bytesize}"
              command << j
            end
          else
            i = i.to_s
            command << "$#{i.bytesize}"
            command << i
          end
        end

        command[0] = "*#{(command.length - 1) / 2}"

        # Trailing delimiter
        command << ""
        command.join(COMMAND_DELIMITER)
      end

    protected

      def encode(string)
        string.force_encoding(Encoding.default_external)
      end
    end
  end
end
