# encoding: utf-8
require "digest"

module LogStash module Config
  class PipelineConfig
    include LogStash::Util::Loggable

    attr_reader :source, :pipeline_id, :config_parts, :settings, :read_at

    def initialize(source, pipeline_id, config_parts, settings)
      @source = source
      @pipeline_id = pipeline_id
      # We can't use Array() since config_parts may be a java object!
      config_parts_array = config_parts.is_a?(Array) ? config_parts : [config_parts]
      @config_parts = config_parts_array.sort_by { |config_part| [config_part.protocol.to_s, config_part.id] }
      @settings = settings
      @read_at = Time.now
    end

    def config_hash
      @config_hash ||= Digest::SHA1.hexdigest(config_string)
    end

    def config_string
      @config_string = config_parts.collect(&:text).join("\n")
    end

    def system?
      @settings.get("pipeline.system")
    end

    def ==(other)
      config_hash == other.config_hash && pipeline_id == other.pipeline_id && settings == other.settings
    end

    def display_debug_information
      logger.debug("-------- Logstash Config ---------")
      logger.debug("Config from source", :source => source, :pipeline_id => pipeline_id)

      config_parts.each do |config_part|
        logger.debug("Config string", :protocol => config_part.protocol, :id => config_part.id)
        logger.debug("\n\n#{config_part.text}")
      end
      logger.debug("Merged config")
      logger.debug("\n\n#{config_string}")
    end
  end
end end
