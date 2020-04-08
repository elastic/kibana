# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "config_management/bootstrap_check"
require "config_management/elasticsearch_source"
require "logstash/config/source_loader"
require "logstash/config/source/local"
require "logstash/config/source/multi_local"
require "logstash/config/source/modules"


module LogStash
  module ConfigManagement
    class Hooks
      include LogStash::Util::Loggable

      def before_bootstrap_checks(runner)
        if management?(runner)
          require "logstash/runner"
          bootstrap_checks = LogStash::Runner::DEFAULT_BOOTSTRAP_CHECKS.dup

          # We only need to allow logstash to start without any parameters
          # and validate the ES parameters if needed
          bootstrap_checks.delete(LogStash::BootstrapCheck::DefaultConfig)
          bootstrap_checks << LogStash::ConfigManagement::BootstrapCheck
          runner.bootstrap_checks = bootstrap_checks
        end
      end

      def after_bootstrap_checks(runner)
        # If xpack is enabled we can safely remove the local source completely and just use
        # elasticsearch as the source of truth.
        #
        # The bootstrap check guards will make sure we can go ahead to load the remote config source
        if management?(runner)
          logger.debug("Removing the `Logstash::Config::Source::Local` and replacing it with `ElasticsearchSource`")
          runner.source_loader.remove_source(LogStash::Config::Source::Local)
          runner.source_loader.remove_source(LogStash::Config::Source::MultiLocal)
          runner.source_loader.remove_source(LogStash::Config::Source::Modules)
          source = LogStash::ConfigManagement::ElasticsearchSource.new(runner.settings)
          runner.source_loader.add_source(source)
        end
      end

      private
      def management?(runner)
        runner.setting("xpack.management.enabled")
      end
    end
  end
end
