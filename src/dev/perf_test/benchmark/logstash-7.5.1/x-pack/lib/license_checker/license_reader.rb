# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require 'logstash/logging/logger'
require 'logstash/outputs/elasticsearch'
require 'logstash/json'
require 'json'

module LogStash
  module LicenseChecker
    class LicenseReader
      include LogStash::Util::Loggable

      XPACK_MISSING_STATUS_CODES = [400, 404]

      def initialize(settings, feature, options)
        @namespace = "xpack.#{feature}"
        @settings = settings
        @es_options = options
        @es_options.merge!("resurrect_delay" => 30)
      end

      ##
      # fetches an XPackInfo, or log and return nil if unavailable.
      # @return [XPathInfo, nil]
      def fetch_xpack_info
        begin
          response = client.get('_xpack')

          # TODO: do we need both this AND the exception-based control flow??
          return XPackInfo.xpack_not_installed if xpack_missing_response?(response)

          XPackInfo.from_es_response(response)
        rescue ::LogStash::Outputs::ElasticSearch::HttpClient::Pool::BadResponseCodeError => bad_response_error
          raise unless XPACK_MISSING_STATUS_CODES.include?(bad_response_error.response_code)

          XPackInfo.xpack_not_installed
        end
      rescue => e
        if logger.debug?
          logger.error('Unable to retrieve license information from license server', :message => e.message, :class => e.class.name, :backtrace => e.backtrace)
        else
          logger.error('Unable to retrieve license information from license server', :message => e.message)
        end
        XPackInfo.failed_to_fetch
      end

      ##
      # @api private
      def client
        @client ||= build_client
      end

      private

      # # This is a bit of a hack until we refactor the ElasticSearch plugins
      # # and extract correctly the http client, right now I am using the plugins
      # # to deal with the certificates and the other SSL options
      # #
      # # But we have to silence the logger from the plugin, to make sure the
      # # log originate from the `ElasticsearchSource`
      def build_client
        es = LogStash::Outputs::ElasticSearch.new(@es_options)
        new_logger = logger
        es.instance_eval { @logger = new_logger }
        es.build_client
      end

      # Depending on the version Elasticsearch will return a 400 or a 404 response is xpack is not installed:
      # 5.x will return a 400, 6.x will return 404
      def xpack_missing_response?(response)
        !!response['status'] && XPACK_MISSING_STATUS_CODES.include?(response['status'])
      end
    end
  end
end
