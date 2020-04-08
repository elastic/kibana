# encoding: utf-8
module LogStash
  module Outputs
    class S3
      class SizeRotationPolicy
        attr_reader :size_file

        def initialize(size_file)
          if size_file <= 0
            raise LogStash::ConfigurationError, "`size_file` need to be greather than 0"
          end

          @size_file = size_file
        end

        def rotate?(file)
          file.size >= size_file
        end

        def needs_periodic?
          false
        end
      end
    end
  end
end
