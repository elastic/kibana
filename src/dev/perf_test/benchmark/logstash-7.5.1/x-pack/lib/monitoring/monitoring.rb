# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/agent"
require "monitoring/internal_pipeline_source"
require "logstash/config/pipeline_config"
require 'helpers/elasticsearch_options'
java_import java.util.concurrent.TimeUnit

module LogStash
  class MonitoringExtension < LogStash::UniversalPlugin
    include LogStash::Util::Loggable

    class TemplateData
      def initialize(node_uuid,
                     system_api_version,
                     es_settings,
                     collection_interval,
                     collection_timeout_interval,
                     extended_performance_collection,
                     config_collection)
        @system_api_version = system_api_version
        @node_uuid = node_uuid
        @collection_interval = collection_interval
        @collection_timeout_interval = collection_timeout_interval
        @extended_performance_collection = extended_performance_collection
        @config_collection = config_collection
        @es_hosts = es_settings['hosts']
        @user = es_settings['user']
        @password = es_settings['password']
        @ca_path = es_settings['cacert']
        @truststore_path = es_settings['truststore']
        @truststore_password = es_settings['truststore_password']
        @keystore_path = es_settings['keystore']
        @keystore_password = es_settings['keystore_password']
        @sniffing = es_settings['sniffing']
        @ssl_certificate_verification = (es_settings['verification_mode'] == 'certificate')
      end

      attr_accessor :system_api_version, :es_hosts, :user, :password, :node_uuid
      attr_accessor :ca_path, :truststore_path, :truststore_password
      attr_accessor :keystore_path, :keystore_password, :sniffing, :ssl_certificate_verification

      def collection_interval
        TimeUnit::SECONDS.convert(@collection_interval, TimeUnit::NANOSECONDS)
      end

      def collection_timeout_interval
        TimeUnit::SECONDS.convert(@collection_timeout_interval, TimeUnit::NANOSECONDS)
      end

      def auth?
        user && password
      end

      def ssl?
        ca_path || (truststore_path && truststore_password) || (keystore_path && keystore_password)
      end

      def truststore?
        truststore_path && truststore_password
      end

      def keystore?
        keystore_path && keystore_password
      end

      def extended_performance_collection?
        @extended_performance_collection
      end

      def config_collection?
        @config_collection
      end

      def get_binding
        binding
      end
    end

    class PipelineRegisterHook
      include LogStash::Util::Loggable, LogStash::Helpers::ElasticsearchOptions

      PIPELINE_ID = ".monitoring-logstash"
      API_VERSION = 7

      def initialize
        # nothing to do here
      end

      def after_agent(runner)

        return unless monitoring_enabled?(runner.settings)

        logger.trace("registering the metrics pipeline")
        LogStash::SETTINGS.set("node.uuid", runner.agent.id)
        internal_pipeline_source = LogStash::Monitoring::InternalPipelineSource.new(setup_metrics_pipeline, runner.agent)
        runner.source_loader.add_source(internal_pipeline_source)
      rescue => e
        logger.error("Failed to set up the metrics pipeline", :message => e.message, :backtrace => e.backtrace)
        raise e
      end

      # For versions prior to 6.3 the default value of "xpack.monitoring.enabled" was true
      # For versions 6.3+ the default of "xpack.monitoring.enabled" is false.
      # To help keep passivity, assume that if "xpack.monitoring.elasticsearch.hosts" has been set that monitoring should be enabled.
      # return true if xpack.monitoring.enabled=true (explicitly) or xpack.monitoring.elasticsearch.hosts is configured
      def monitoring_enabled?(settings)
        return settings.get_value("xpack.monitoring.enabled") if settings.set?("xpack.monitoring.enabled")

        if settings.set?("xpack.monitoring.elasticsearch.hosts")
          logger.warn("xpack.monitoring.enabled has not been defined, but found elasticsearch configuration. Please explicitly set `xpack.monitoring.enabled: true` in logstash.yml")
          true
        else
          default = settings.get_default("xpack.monitoring.enabled")
          logger.trace("xpack.monitoring.enabled has not been defined, defaulting to default value: " + default.to_s)
          default # false as of 6.3
        end
      end

      def setup_metrics_pipeline
        settings = LogStash::SETTINGS.clone

        # reset settings for the metrics pipeline
        settings.get_setting("path.config").reset
        settings.set("pipeline.id", PIPELINE_ID)
        settings.set("config.reload.automatic", false)
        settings.set("metric.collect", false)
        settings.set("queue.type", "memory")
        settings.set("pipeline.workers", 1) # this is a low throughput pipeline
        settings.set("pipeline.batch.size", 2)
        settings.set("pipeline.system", true)

        config = generate_pipeline_config(settings)
        logger.debug("compiled metrics pipeline config: ", :config => config)

        config_part = org.logstash.common.SourceWithMetadata.new("x-pack-metrics", "internal_pipeline_source", config)
        LogStash::Config::PipelineConfig.new(self, PIPELINE_ID.to_sym, config_part, settings)
      end

      def generate_pipeline_config(settings)
        collection_interval = settings.get("xpack.monitoring.collection.interval")
        collection_timeout_interval = settings.get("xpack.monitoring.collection.timeout_interval")
        extended_performance_collection = settings.get("xpack.monitoring.collection.pipeline.details.enabled")
        config_collection = settings.get("xpack.monitoring.collection.config.enabled")
        es_settings = es_options_from_settings_or_modules('monitoring', settings)
        data = TemplateData.new(LogStash::SETTINGS.get("node.uuid"), API_VERSION,
                                es_settings,
                                collection_interval, collection_timeout_interval,
                                extended_performance_collection, config_collection)

        template_path = ::File.join(::File.dirname(__FILE__), "..", "template.cfg.erb")
        template = ::File.read(template_path)
        ERB.new(template, 3).result(data.get_binding)
      end
    end

    def initialize
      # nothing to do here
    end

    def register_hooks(hooks)
      logger.trace("registering hook")
      hooks.register_hooks(LogStash::Runner, PipelineRegisterHook.new)
    end

    def additionals_settings(settings)
      logger.trace("registering additionals_settings")

      settings.register(LogStash::Setting::Boolean.new("xpack.monitoring.enabled", false))
      settings.register(LogStash::Setting::ArrayCoercible.new("xpack.monitoring.elasticsearch.hosts", String, [ "http://localhost:9200" ] ))
      settings.register(LogStash::Setting::TimeValue.new("xpack.monitoring.collection.interval", "10s"))
      settings.register(LogStash::Setting::TimeValue.new("xpack.monitoring.collection.timeout_interval", "10m"))
      settings.register(LogStash::Setting::NullableString.new("xpack.monitoring.elasticsearch.username", "logstash_system"))
      settings.register(LogStash::Setting::NullableString.new("xpack.monitoring.elasticsearch.password"))
      settings.register(LogStash::Setting::NullableString.new("xpack.monitoring.elasticsearch.ssl.certificate_authority"))
      settings.register(LogStash::Setting::NullableString.new("xpack.monitoring.elasticsearch.ssl.truststore.path"))
      settings.register(LogStash::Setting::NullableString.new("xpack.monitoring.elasticsearch.ssl.truststore.password"))
      settings.register(LogStash::Setting::NullableString.new("xpack.monitoring.elasticsearch.ssl.keystore.path"))
      settings.register(LogStash::Setting::NullableString.new("xpack.monitoring.elasticsearch.ssl.keystore.password"))
      settings.register(LogStash::Setting::String.new("xpack.monitoring.elasticsearch.ssl.verification_mode", "certificate", true, ["none", "certificate"]))
      settings.register(LogStash::Setting::Boolean.new("xpack.monitoring.elasticsearch.sniffing", false))
      settings.register(LogStash::Setting::Boolean.new("xpack.monitoring.collection.pipeline.details.enabled", true))
      settings.register(LogStash::Setting::Boolean.new("xpack.monitoring.collection.config.enabled", true))

      # These Settings were renamed and deprecated in 6.x timeframe and removed for 7.0; provide guidance to ease transition.
      settings.register(LogStash::Setting::DeprecatedAndRenamed.new("xpack.monitoring.elasticsearch.url",    "xpack.monitoring.elasticsearch.hosts"))
      settings.register(LogStash::Setting::DeprecatedAndRenamed.new("xpack.monitoring.elasticsearch.ssl.ca", "xpack.monitoring.elasticsearch.ssl.certificate_authority"))

      settings.register(LogStash::Setting::String.new("node.uuid", ""))
    rescue => e
      logger.error e.message
      logger.error e.backtrace.to_s
      raise e
    end
  end
end
