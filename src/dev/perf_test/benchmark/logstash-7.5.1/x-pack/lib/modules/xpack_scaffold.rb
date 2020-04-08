# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/modules/scaffold"
require "modules/module_license_checker"

module LogStash
  module Modules
    class XpackScaffold < LogStash::Modules::Scaffold

      def initialize(name, directory, valid_licenses)
       super(name, directory)
       @license_checker = LogStash::LicenseChecker::ModuleLicenseChecker.new(name, valid_licenses)
      end

      def is_enabled?(settings)
         @license_checker.check(settings)
      end
    end
  end
end