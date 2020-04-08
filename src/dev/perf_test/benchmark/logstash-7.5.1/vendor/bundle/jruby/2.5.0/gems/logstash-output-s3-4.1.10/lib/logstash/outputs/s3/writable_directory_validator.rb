# encoding: utf-8
module LogStash
  module Outputs
    class S3
      class WritableDirectoryValidator
        def self.valid?(path)
          begin
            FileUtils.mkdir_p(path) unless Dir.exist?(path)
            ::File.writable?(path)
          rescue
            false
          end
        end
      end
    end
  end
end
