# encoding: utf-8
module LogStash
  module Outputs
    class S3
      class TimeRotationPolicy
        attr_reader :time_file

        def initialize(time_file)
          if time_file <= 0
            raise LogStash::ConfigurationError, "`time_file` need to be greather than 0"
          end

          @time_file = time_file * 60
        end

        def rotate?(file)
          file.size > 0 && (Time.now - file.ctime) >= time_file
        end

        def needs_periodic?
          true
        end
      end
    end
  end
end
