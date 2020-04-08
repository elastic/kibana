# encoding: utf-8
java_import "java.lang.management.ManagementFactory"

module LogStash module Instrument module PeriodicPoller
  class LoadAverage
    class Windows
      def self.get
        nil
      end
    end

    class Linux
      LOAD_AVG_FILE = "/proc/loadavg"
      TOKEN_SEPARATOR = " "

      def self.get(content = ::File.read(LOAD_AVG_FILE))
        load_average = content.chomp.split(TOKEN_SEPARATOR)

        {
          :"1m" => load_average[0].to_f,
          :"5m" => load_average[1].to_f,
          :"15m" => load_average[2].to_f
        }
      end
    end

    class Other
      def self.get()
        load_average_1m = ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage()

        return nil if load_average_1m.nil?

        {
          :"1m" => load_average_1m
        }
      end
    end

    def self.create
      if LogStash::Environment.windows?
        Windows
      elsif LogStash::Environment.linux?
        Linux
      else
        Other
      end
    end
  end
end end end
