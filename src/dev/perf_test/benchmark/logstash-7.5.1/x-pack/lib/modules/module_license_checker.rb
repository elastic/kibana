# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require 'license_checker/licensed'
require 'helpers/elasticsearch_options'
java_import java.util.concurrent.TimeUnit

module LogStash
  module LicenseChecker
    class ModuleLicenseChecker

      include LogStash::LicenseChecker::Licensed
      include LogStash::Helpers::ElasticsearchOptions
      include LogStash::Util::Loggable

      def initialize(module_name, valid_licenses)
        @module_name = module_name
        @feature = "#{@module_name}_module"
        @valid_licenses = valid_licenses
        @setup = false
      end

      # returns true if license is valid, false otherwise
      def check(settings)
        setup(settings) unless @setup
        license_check
      end

      private

      def setup(settings)
        @es_options = es_options_from_modules(settings) || {}
        #TODO: reduce the refresh period and handle if a license expires while running
        setup_license_checker(@feature, 3650, TimeUnit::DAYS)
        @setup = true
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
              :log_message => "X-Pack is installed on Logstash but not on Elasticsearch. Please install X-Pack on Elasticsearch to use the #{@module_name} module."
          }
        elsif !xpack_info.license_available?
          {
              :state => :error,
              :log_level => :error,
              :log_message => "The #{@module_name} module is not available: License information is currently unavailable. Please make sure you have added your production elasticsearch connection information."
          }
        elsif !xpack_info.license_one_of?(@valid_licenses)
          {
              :state => :error,
              :log_level => :error,
              :log_message => "The #{@module_name} module is not available: #{xpack_info.license_type} is not a valid license for this feature."
          }
        elsif !xpack_info.license_active?
          {
              :state => :ok,
              :log_level => :warn,
              :log_message => "The #{@module_name} module requires an active license."
          }
        else
          {:state => :ok, :log_level => :info, :log_message => "The #{@module_name} module License OK"}
        end
      end
    end
  end
end
