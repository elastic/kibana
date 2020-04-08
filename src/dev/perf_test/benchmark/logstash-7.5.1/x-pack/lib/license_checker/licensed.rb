# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/json"
require 'license_checker/license_manager'
require 'license_checker/x_pack_info'
require 'license_checker/license_reader'
java_import java.util.concurrent.TimeUnit


# Mixin to add License Checking functionality to a feature:
# To add license checking:
# - Include the Licensed mixin to the class under license
# - Call setup_license_checker to configure the license checker functionality - this will load up the license
# and setup the regular poll to check
# - Any features that require a license check by passing it as a block to 'with_license_check', the block will be
# executed if the license check is ok, but will either be ignored (and logged), or an error raised if the license
# state is invalid.
# - To do a license check without passing a block, use 'license_check' which returns true if the check is ok, and either
# returns false or raises, depending on the parameter passed in.
# Classes that include this mixin should implement 'populate_license_state', and fill in the license_state object as
# :state - :ok or :error. If the :state is ok then license checks will succeed, if :error, then they will not
# :log_level - When the license state changes, a log entry is emitted - set this to the appropriate level for the license state
#              (this is not used to set the state, so if, for example the licese functionality allows expired licenses
#               to function as is, set the state to ok, and the log_level to :warn)
# :log_message - Message to log when the license state changes

module LogStash
  module LicenseChecker
    module Licensed
      include LogStash::Util::Loggable

      def setup_license_checker(feature, refresh_period=30, refresh_unit=TimeUnit::SECONDS)
        @feature = feature

        license_manager = LogStash::LicenseChecker::LicenseManager.new(license_reader, feature, refresh_period, refresh_unit)
        xpack_info = license_manager.current_xpack_info
        update_license_state(xpack_info)

        license_manager.add_observer(self, :update_license_state)
      end

      # Classes that include Licensed mixin should override this method, populating the values of state, log_level and log_message
      # appropriately for how the license is to be enforced for that feature.
      # @param [LogStash::LicenseChecker::XPackInfo] License Info object
      # @return [Hash] The overriding class should construct an hash populated as follows:
      #                :state       - State of the license, should a license check succeed or fail. :ok or :error
      #                :log_message - Message to be logged when the license changes for this feature
      #                :log_level   - Level to log the license change message at - symbolized version of method names
      #                               for [LogStash::Logging::Logger] - eg :info, :warn, :error, etc
      def populate_license_state(xpack_info)
        { :state => :error, :log_level => :error, :log_message => "Licensing is not currently setup for #{@feature}, please contact support"}
      end

      def with_license_check(raise_on_error=false)
        current_license_state = get_current_license_state
        message = current_license_state[:log_message]

        # This logs the call, as long as the last logged call wasn't the same
        logger.send current_license_state[:log_level], message if message != @last_message

        @last_message = message
        if current_license_state[:state] == :ok
          block_given? ? yield : true
        else
          raise LogStash::LicenseChecker::LicenseError.new(message) if raise_on_error
          false unless block_given?
        end
      end

      alias_method :license_check, :with_license_check

      def license_reader
        LogStash::LicenseChecker::LicenseReader.new(@settings, @feature, @es_options)
      end

      def update_license_state(xpack_info)
        logger.debug("updating licensing state #{xpack_info}")
        @license_state = populate_license_state(xpack_info)
      end

      private
      def get_current_license_state
        @license_state.dup
      end

    end
  end
end