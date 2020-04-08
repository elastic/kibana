module Aws
  module Api
    module Docs
      module Crosslink

        EXCLUDE_UIDS = [
          "apigateway",
          "budgets",
          "cloudsearch",
          "cloudsearchdomain",
          "discovery",
          "elastictranscoder",
          "es",
          "glacier",
          "importexport",
          "iot",
          "iot-data",
          "machinelearning",
          "rekognition",
          "sdb",
          "swf"
        ]

        def self.tag_string(uid, name)
          path = "#{ENV['BASEURL']}goto/WebAPI/#{uid}/#{name}"
          "@see #{path} AWS API Documentation"
        end

        def self.taggable?(uid)
          uid && ENV['BASEURL'] && !exclude?(uid)
        end

        private
        def self.exclude?(uid)
          EXCLUDE_UIDS.any? do |service|
            uid.match(/^#{service}/)
          end
        end

      end
    end
  end
end
