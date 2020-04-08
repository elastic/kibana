# encoding: utf-8
require "logstash/outputs/s3/size_rotation_policy"
require "logstash/outputs/s3/time_rotation_policy"

module LogStash
  module Outputs
    class S3
      class SizeAndTimeRotationPolicy
        def initialize(file_size, time_file)
          @size_strategy = SizeRotationPolicy.new(file_size)
          @time_strategy = TimeRotationPolicy.new(time_file)
        end

        def rotate?(file)
          @size_strategy.rotate?(file) || @time_strategy.rotate?(file)
        end 

        def needs_periodic?
          true
        end
      end
    end
  end
end
