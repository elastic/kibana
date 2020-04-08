# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require 'logstash/namespace'

module LogStash
  module Arcsight
    module ConfigHelper
      extend self
      def kafka_input_ssl_sasl_config(bound_scope)
        security_protocol = bound_scope.setting("var.input.kafka.security_protocol", "unset")
        return "" if security_protocol == "unset"
        lines = ["security_protocol => '#{security_protocol}'"]
        lines.push("ssl_truststore_type => '#{bound_scope.setting("var.input.kafka.ssl_truststore_type", "")}'")

        ssl_truststore_location = bound_scope.setting("var.input.kafka.ssl_truststore_location","")
        lines.push("ssl_truststore_location => '#{ssl_truststore_location}'") unless ssl_truststore_location.empty?

        ["ssl_truststore_password", "ssl_keystore_password", "ssl_key_password"].each do |name|
          full_name = "var.input.kafka.".concat(name)
          lines.push("#{name} => '#{bound_scope.raw_setting(full_name)}'") if bound_scope.has_setting?(full_name)
        end

        lines.push("ssl_keystore_type => '#{bound_scope.setting("var.input.kafka.ssl_keystore_type", "")}'")

        ssl_keystore_location = bound_scope.setting("var.input.kafka.ssl_keystore_location","")
        lines.push("ssl_keystore_location => '#{ssl_keystore_location}'") unless ssl_keystore_location.empty?

        lines.push("sasl_mechanism => '#{bound_scope.setting("var.input.kafka.sasl_mechanism", "")}'")
        lines.push("sasl_kerberos_service_name => '#{bound_scope.setting("var.input.kafka.sasl_kerberos_service_name", "")}'")

        jaas_path = bound_scope.setting("var.input.kafka.jaas_path","")
        lines.push("jaas_path => '#{jaas_path}'") unless jaas_path.empty?

        kerberos_config = bound_scope.setting("var.input.kafka.kerberos_config","")
        lines.push("kerberos_config => '#{kerberos_config}'") unless kerberos_config.empty?

        lines.compact.join("\n    ")
      end

      def tcp_input_ssl_config(bound_scope)
        ssl_enabled = bound_scope.setting("var.input.tcp.ssl_enable", false)
        return "" unless ssl_enabled
        lines = ["ssl_enable => true"]

        verify_enabled = bound_scope.setting("var.input.tcp.ssl_verify", true)
        lines.push("ssl_verify => #{verify_enabled}")

        ssl_cert = bound_scope.setting("var.input.tcp.ssl_cert","")
        lines.push("ssl_cert => '#{ssl_cert}'") unless ssl_cert.empty?

        ssl_key = bound_scope.setting("var.input.tcp.ssl_key","")
        lines.push("ssl_key => '#{ssl_key}'") unless ssl_key.empty?

        lines.push("ssl_key_passphrase => '#{ bound_scope.setting("var.input.tcp.ssl_key_passphrase", "")}'")

        certs_array_as_string = bound_scope.array_to_string(
          bound_scope.get_setting(LogStash::Setting::SplittableStringArray.new("var.input.tcp.ssl_extra_chain_certs", String, []))
        )
        lines.push("ssl_extra_chain_certs => #{certs_array_as_string}")

        lines.compact.join("\n    ")
      end
    end
  end
end
