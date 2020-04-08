# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/json"
require 'license_checker/license_reader'
require 'license_checker/x_pack_info'
java_import java.util.concurrent.Executors
java_import java.util.concurrent.TimeUnit

module LogStash
  module LicenseChecker

    class LicenseError < StandardError; end

    class LicenseManager
      include LogStash::Util::Loggable, Observable

      attr_reader :last_updated

      LICENSE_TYPES = :trial, :basic, :standard, :gold, :platinum

      def initialize (reader, feature, refresh_period=30, refresh_unit=TimeUnit::SECONDS)
        @license_reader = reader
        @feature = feature

        fetch_xpack_info

        if @executor.nil?
            @executor = Executors.new_single_thread_scheduled_executor{ |runnable| create_daemon_thread (runnable)}
            @executor.schedule_at_fixed_rate(Proc.new{fetch_xpack_info}, refresh_period, refresh_period, refresh_unit)
        end
      end

      def current_xpack_info
        @xpack_info
      end

      def fetch_xpack_info
        xpack_info = @license_reader.fetch_xpack_info

        update_xpack_info(xpack_info)
      end

      private
      def update_xpack_info(xpack_info)
        return if xpack_info == @xpack_info

        @xpack_info = xpack_info
        logger.debug('updating observers of xpack info change') if logger.debug?
        changed
        notify_observers(current_xpack_info)
      end

      # Create a daemon thread for the license checker to stop this thread from keeping logstash running in the
      # event of shutdown
      def create_daemon_thread(runnable)
        thread = java.lang.Thread.new(runnable, "#{@feature}-license-manager")
        thread.set_daemon(true)
        thread
      end
    end
  end
end
