# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/bootstrap_check/default_config"

module LogStash
  module ConfigManagement
    # Override the default Logstash's bootstrap check
    # instead of making the `-e` and the `-f` mandatory we rely
    # on the elasticsearch source.
    #
    # If we don't use config management we checks for CLI flags/logstash.yml options
    class BootstrapCheck
      include LogStash::Util::Loggable

      def self.check(settings)
        check_path_config(settings)

        if settings.get("config.string")
          raise LogStash::BootstrapCheckError, "You cannot use -e since Elasticsearch is configured as the config store."
        end

        if settings.get("config.test_and_exit")
          raise LogStash::BootstrapCheckError, "You cannot use -t since Elasticsearch is configured as the config store"
        end

        if !settings.get("modules.cli").empty? || !settings.get("modules").empty?
          raise LogStash::BootstrapCheckError, "You cannot use --modules since Elasticsearch is configured as the config store"
        end

        interval = settings.get("xpack.management.logstash.poll_interval")

        # override core settings, so the agent will trigger the auto reload
        settings.set("config.reload.automatic", true)
        settings.set("config.reload.interval", interval)


        pipeline_ids = settings.get("xpack.management.pipeline.id")

        if pipeline_ids.reject { |id| id.strip.empty? }.empty?
          raise LogStash::BootstrapCheckError, "You need to specify the ID of the pipelines with the `xpack.management.pipeline.id` options in your logstash.yml"
        end

        duplicate_ids = find_duplicate_ids(pipeline_ids)
        if duplicate_ids.size > 0
          raise LogStash::BootstrapCheckError, "Duplicate pipeline ids found in `xpack.management.pipeline.id`, defined IDs must be unique, Duplicated ids: #{duplicate_ids.join(', ')}"
        end

        logger.info("Using Elasticsearch as config store", :pipeline_id => pipeline_ids, :poll_interval => "#{interval}ns")
      end


      def self.check_path_config(settings)
        path_config = settings.get("path.config")
        return if (path_config.nil? || path_config.empty?)
        configs_count = Dir.glob(path_config).size
        return if configs_count.zero?
        msg = sprintf("There are config files (%i) in the '%s' folder.", configs_count, path_config)
        msg.concat(" Elasticsearch is configured as the config store so configs cannot be sourced")
        msg.concat(" via the command line with -f or via logstash.yml with path.config")
        logger.error(msg)
        raise LogStash::BootstrapCheckError, msg
      end

      def self.find_duplicate_ids(ids)
        normalized_ids = ids.dup
          .map(&:to_s)
          .map(&:strip)
          .map(&:downcase)
          .group_by { |id| id }

        duplicate_ids = []
        ids.each do |id|
          if normalized_ids.fetch(id.downcase).size > 1
            duplicate_ids << id
          end
        end

        # We normalize the pipeline id into lowercase string,
        # this allow us to detect weird capitalized ids and all lowercase ids.
        # But when reporting the ids, its more useful to the user
        # report the `uniq` with the appropriate capitalization.
        #
        # Example:
        # pipeline1, pipeline1 => ["pipeline1"]
        # pipeline1, PIPELINE1 => ["pipeline1", "PIPELINE1"]
        duplicate_ids.uniq
      end
    end
  end
end
