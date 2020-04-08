# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/config/pipeline_config"
require "logstash/config/source/base"
require "logstash/config/source_loader"
require "logstash/outputs/elasticsearch"
require "logstash/json"
require 'helpers/elasticsearch_options'
require "license_checker/licensed"


module LogStash
  module ConfigManagement
    class ElasticsearchSource < LogStash::Config::Source::Base
      include LogStash::Util::Loggable, LogStash::LicenseChecker::Licensed,
              LogStash::Helpers::ElasticsearchOptions

      class RemoteConfigError < LogStash::Error; end

      PIPELINE_INDEX = ".logstash"
      VALID_LICENSES = %w(trial standard gold platinum)
      FEATURE_INTERNAL = 'management'
      FEATURE_EXTERNAL = 'logstash'
      SUPPORTED_PIPELINE_SETTINGS = %w(
        pipeline.workers
        pipeline.batch.size
        pipeline.batch.delay
        queue.type
        queue.max_bytes
        queue.checkpoint.writes
      )

      def initialize(settings)
        super(settings)
        if @settings.get("xpack.management.enabled") && !@settings.get_setting("xpack.management.elasticsearch.password").set?
          raise ArgumentError.new("You must set the password using the \"xpack.management.elasticsearch.password\" in logstash.yml")
        end

        @es_options = es_options_from_settings('management', settings)

        if enabled?
          setup_license_checker(FEATURE_INTERNAL)
          license_check(true)
        end
      end

      def match?
        @settings.get("xpack.management.enabled")
      end

      def config_conflict?
        false
      end

      def pipeline_configs
        logger.trace("Fetch remote config pipeline", :pipeline_ids => pipeline_ids)

        begin
          license_check(true)
        rescue LogStash::LicenseChecker::LicenseError => e
          if @cached_pipelines.nil?
            raise e
          else
            return @cached_pipelines
          end
        end

        response = fetch_config(pipeline_ids)

        if response["error"]
          raise RemoteConfigError, "Cannot find find configuration for pipeline_id: #{pipeline_ids}, server returned status: `#{response["status"]}`, message: `#{response["error"]}`"
        end

        if response["docs"].nil?
          logger.debug("Server returned an unknown or malformed document structure", :response => response)
          raise RemoteConfigError, "Elasticsearch returned an unknown or malformed document structure"
        end

        # Cache pipelines to handle the case where a remote configuration error can render a pipeline unusable
        # it is not reloadable
        @cached_pipelines = response["docs"].collect do |document|
          get_pipeline(document)
        end.compact
      end

      def get_pipeline(response)
        pipeline_id = response["_id"]

        if response["found"] == false
          logger.debug("Could not find a remote configuration for a specific `pipeline_id`", :pipeline_id => pipeline_id)
          return nil
        end

        config_string = response.fetch("_source", {})["pipeline"]

        raise RemoteConfigError, "Empty configuration for pipeline_id: #{pipeline_id}" if config_string.nil? || config_string.empty?

        config_part = org.logstash.common.SourceWithMetadata.new("x-pack-config-management", pipeline_id.to_s, config_string)

        # We don't support multiple pipelines, so use the global settings from the logstash.yml file
        settings = @settings.clone
        settings.set("pipeline.id", pipeline_id)

        # override global settings with pipeline settings from ES, if any
        pipeline_settings = response["_source"]["pipeline_settings"]
        unless pipeline_settings.nil?
          pipeline_settings.each do |setting, value|
            if SUPPORTED_PIPELINE_SETTINGS.include? setting
              settings.set(setting, value) if value
            else
              logger.warn("Ignoring unsupported or unknown pipeline settings '#{setting}'")
            end
          end
        end

        LogStash::Config::PipelineConfig.new(self.class.name, pipeline_id.to_sym, config_part, settings)
      end

      # This is a bit of a hack until we refactor the ElasticSearch plugins
      # and extract correctly the http client, right now I am using the plugins
      # to deal with the certificates and the other SSL options
      #
      # But we have to silence the logger from the plugin, to make sure the
      # log originate from the `ElasticsearchSource`
      def build_client
        es = LogStash::Outputs::ElasticSearch.new(@es_options)
        new_logger = logger
        es.instance_eval { @logger = new_logger }
        es.build_client
      end

      def fetch_config(pipeline_ids)
        request_body_string = LogStash::Json.dump({ "docs" => pipeline_ids.collect { |pipeline_id| { "_id" => pipeline_id } } })
        client.post(config_path, {}, request_body_string)
      end

      def config_path
        "#{PIPELINE_INDEX}/_mget"
      end

      def populate_license_state(xpack_info)
        if xpack_info.failed?
          {
              :state => :error,
              :log_level => :error,
              :log_message => "Failed to fetch X-Pack information from Elasticsearch. This is likely due to failure to reach a live Elasticsearch cluster."
          }
        elsif !xpack_info.installed?
          {
              :state => :error,
              :log_level => :error,
              :log_message => "X-Pack is installed on Logstash but not on Elasticsearch. Please install X-Pack on Elasticsearch to use the monitoring feature. Other features may be available."
          }
        elsif !xpack_info.feature_enabled?("security")
          {
              :state => :error,
              :log_level => :error,
              :log_message => "X-Pack Security needs to be enabled in Elasticsearch. Please set xpack.security.enabled: true in elasticsearch.yml."
          }
        elsif !xpack_info.license_available?
          {
              :state => :error,
              :log_level => :error,
              :log_message => 'Configuration Management is not available: License information is currently unavailable. Please make sure you have added your production elasticsearch connection info in the xpack.monitoring.elasticsearch settings.'
          }
        elsif !xpack_info.license_one_of?(VALID_LICENSES)
          {
              :state => :error,
              :log_level => :error,
              :log_message => "Configuration Management is not available: #{xpack_info.license_type} is not a valid license for this feature."
          }
        elsif !xpack_info.license_active?
          {
              :state => :ok,
              :log_level => :warn,
              :log_message => 'Configuration Management feature requires a valid license. You can continue to monitor Logstash, but please contact your administrator to update your license'
          }
        else
          unless xpack_info.feature_enabled?(FEATURE_EXTERNAL)
            logger.warn('Monitoring installed and enabled in Logstash, but not enabled in Elasticsearch')
          end

          { :state => :ok, :log_level => :info, :log_message => 'Configuration Management License OK' }
        end
      end

      alias_method :enabled?, :match?

      private
      def pipeline_ids
        @settings.get("xpack.management.pipeline.id")
      end

      def client
        @client ||= build_client
      end
    end
  end
end
