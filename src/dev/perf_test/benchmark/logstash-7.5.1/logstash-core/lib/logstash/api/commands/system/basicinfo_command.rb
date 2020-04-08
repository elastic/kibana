# encoding: utf-8
require 'logstash/api/commands/base'
require "logstash/util/duration_formatter"
require 'logstash/build'

module LogStash
  module Api
    module Commands
      module System
        class BasicInfo < Commands::Base

          def run
            # Just merge this stuff with the defaults
            BUILD_INFO
          end
        end
      end
    end
  end
end
