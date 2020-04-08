# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/json"
require 'license_checker/license_reader'
java_import java.util.concurrent.Executors
java_import java.util.concurrent.TimeUnit

module LogStash
  module LicenseChecker
    class XPackInfo
      include LogStash::Util::Loggable

      LICENSE_TYPES = :trial, :basic, :standard, :gold, :platinum

      def initialize(license, features = nil, installed=true, failed = false)
        @license = license
        @installed = installed
        @features = features
        @failed = failed

        freeze
      end

      def method_missing(meth)
        if meth.to_s.match(/license_(.+)/)
          return nil if @license.nil?
          @license[$1]
        else
          super
        end
      end

      def failed?
        @failed
      end

      def installed?
        @installed
      end

      def license_available?
        !@license.nil?
      end

      def license_active?
        return false if @license.nil?
        license_status == 'active'
      end

      def license_one_of?(types)
        return false if @license.nil?
        types.include?(license_type)
      end

      def feature_enabled?(feature)
        return false unless @features.include?(feature)
        return false unless @features[feature].fetch('available', false)

        @features[feature].fetch('enabled', false)
      end

      def to_s
         "installed:#{installed?},
          license:#{@license.nil? ? '<no license loaded>' : @license.to_s},
          features:#{@features.nil? ? '<no features loaded>' : @features.to_s},
          last_updated:#{@last_updated}}"
      end

      def ==(other)
        return false if other.nil?

        return false unless other.instance_variable_get(:@installed) == @installed
        return false unless other.instance_variable_get(:@license) == @license
        return false unless other.instance_variable_get(:@features) == @features

        true
      end

      def self.from_es_response(es_response)
        if es_response.nil? || es_response['license'].nil?
          logger.warn("Nil response from License Server")
          XPackInfo.new(nil)
        else
          license = es_response.fetch('license', {}).dup.freeze
          features = es_response.fetch('features', {}).dup.freeze

          XPackInfo.new(license, features)
        end
      end

      def self.xpack_not_installed
        XPackInfo.new(nil, nil, false)
      end

      def self.failed_to_fetch
        XPackInfo.new(nil, nil, false, true)
      end
    end
  end
end
