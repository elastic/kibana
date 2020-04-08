# encoding: utf-8
require 'twitter/streaming/response'

module LogStash
  module Inputs
    class TwitterPatches

      def self.patch
        verify_version
        patch_json
      end

      private

      def self.verify_version
        raise("Incompatible Twitter gem version and the LogStash::Json.load") unless ::Twitter::Version.to_s == "6.2.0"
      end

      def self.patch_json
        ::Twitter::Streaming::Response.module_eval do
          def on_body(data)
            @tokenizer.extract(data).each do |line|
              next if line.empty?
              begin
                @block.call(LogStash::Json.load(line, :symbolize_keys => true))
              rescue LogStash::Json::ParserError
                # silently ignore json parsing errors
              end
            end
          end
        end
      end

    end
  end
end
