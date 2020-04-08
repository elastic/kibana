# encoding: utf-8
require "logstash/config/source/local"
require "logstash/config/source/modules"
require "logstash/config/source/multi_local"
require "thread"
require "set"

module LogStash module Config
  class SourceLoader
    class SuccessfulFetch
      attr_reader :response

      def initialize(response)
        @response = response
      end

      def success?
        true
      end
    end

    class FailedFetch
      attr_reader :error

      def initialize(error)
        @error = error
      end

      def success?
        false
      end
    end

    include LogStash::Util::Loggable

    def initialize(settings = LogStash::SETTINGS)
      @sources_lock = Mutex.new
      @sources = Set.new
      @settings = settings
    end

    # This return a ConfigLoader object that will
    # abstract the call to the different sources and will return multiples pipeline
    def fetch
      sources_loaders = []

      sources do |source|
        sources_loaders << source if source.match?
      end

      if sources_loaders.empty?
        # This shouldn't happen with the settings object or with any external plugins.
        # but lets add a guard so we fail fast.
        @sources_lock.synchronize do
          logger.error "No source loaders matched! This shouldn't happen", :sources => @sources
        end
        raise LogStash::InvalidSourceLoaderSettingError, "Can't find an appropriate config loader with current settings"
      else
        begin
          pipeline_configs = sources_loaders
            .collect { |source| source.pipeline_configs }
            .compact
            .flatten

          duplicate_ids = find_duplicate_ids(pipeline_configs)

          if duplicate_ids.any?
            logger.debug("Fetching pipelines with duplicate ids", duplicate_ids.each { |k, v| v.collect(&:pipeline_id) } )
            return FailedFetch.new("Found duplicate ids in your source: #{duplicate_ids.keys.sort.join(", ")}")
          end

          if config_debug?
            pipeline_configs.each { |pipeline_config| pipeline_config.display_debug_information }
          end

          if pipeline_configs.empty?
            logger.error("No configuration found in the configured sources.")
          end

          SuccessfulFetch.new(pipeline_configs)
        rescue => e
          logger.error("Could not fetch all the sources", :exception => e.class, :message => e.message, :backtrace => e.backtrace)
          FailedFetch.new(e.message)
        end
      end
    end

    def sources
      @sources_lock.synchronize do
        if block_given?
          @sources.each do |source|
            yield source
          end
        else
          @sources
        end
      end
    end

    def remove_source(klass)
      @sources_lock.synchronize do
        @sources.delete_if { |source| source == klass || source.is_a?(klass) }
      end
    end

    def configure_sources(new_sources)
      new_sources = Array(new_sources).to_set
      logger.debug("Configure sources", :sources => new_sources.collect(&:to_s))
      @sources_lock.synchronize { @sources = new_sources }
    end

    def add_source(new_source)
      logger.debug("Adding source", :source => new_source.to_s)
      @sources_lock.synchronize { @sources << new_source }
    end

    private
    def config_debug?
      @settings.get_value("config.debug") && logger.debug?
    end

    def find_duplicate_ids(pipeline_configs)
      pipeline_configs.group_by { |pipeline_config| pipeline_config.pipeline_id }
        .select { |group, pipeline_configs| pipeline_configs.size > 1 }
    end
  end
end end
