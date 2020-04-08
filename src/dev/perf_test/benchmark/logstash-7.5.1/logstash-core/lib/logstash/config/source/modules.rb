# encoding: utf-8
require "logstash/config/source/base"
require "logstash/config/modules_common"
require "logstash/config/pipeline_config"

module LogStash module Config module Source
  class Modules < Base
    include LogStash::Util::Loggable
    def pipeline_configs
      if config_conflict? # double check
        raise ConfigurationError, @conflict_messages.join(", ")
      end

      pipelines = LogStash::Config::ModulesCommon.pipeline_configs(@settings)
      pipelines.map do |hash|
        PipelineConfig.new(self, hash["pipeline_id"].to_sym,
          org.logstash.common.SourceWithMetadata.new("module", hash["alt_name"], 0, 0, hash["config_string"]),
          hash["settings"])
      end
    end

    def match?
      # see basic settings predicates and getters defined in the base class
      (modules_cli? || modules?) && !(config_string? || config_path?) && !automatic_reload_with_modules?
    end

    def config_conflict?
      @conflict_messages.clear
      # Make note that if modules are configured in both cli and logstash.yml that cli module
      # settings will overwrite the logstash.yml modules settings
      if modules_cli? && modules?
        logger.info(I18n.t("logstash.runner.cli-module-override"))
      end

      if automatic_reload_with_modules?
        @conflict_messages << I18n.t("logstash.runner.reload-with-modules")
      end

      # Check if config (-f or -e) and modules are configured
      if (modules_cli? || modules?) && (config_string? || config_path?)
        @conflict_messages << I18n.t("logstash.runner.config-module-exclusive")
      end

      @conflict_messages.any?
    end

    private

    def automatic_reload_with_modules?
      (modules_cli? || modules?) && config_reload_automatic?
    end
  end
end end end
