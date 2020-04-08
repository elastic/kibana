# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

require 'yaml'

module AWS

  if Object.const_defined?(:Rails) and Rails.const_defined?(:Railtie)

    # @api private
    class Railtie < Rails::Railtie

      # configure our plugin on boot. other extension points such
      # as configuration, rake tasks, etc, are also available
      initializer "aws-sdk.initialize" do |app|
        AWS::Rails.setup
      end
    end

  end

  # A handful of useful Rails integration methods.
  #
  # If you require this gem inside a Rails application (via config.gem
  # for rails 2 and bundler for rails 3) then {setup} is called
  # automatically.
  module Rails

    # Adds extra functionality to Rails.
    #
    # Normally this method is invoked automatically when you require this
    # gem in a Rails Application:
    #
    # Rails 3+ (RAILS_ROOT/Gemfile)
    #
    #     gem 'aws-sdk'
    #
    # Rails 2.1 - 2.3 (RAILS_ROOT/config/environment.rb)
    #
    #     config.gem 'aws-sdk'
    #
    # @return [nil]
    def self.setup
      load_yaml_config
      add_action_mailer_delivery_method
      log_to_rails_logger
      nil
    end

    # Loads AWS configuration options from `RAILS_ROOT/config/aws.yml`.
    #
    # This configuration file is optional.  You can omit this file and instead
    # use ruby to configure AWS inside a configuration initialization script
    # (e.g. RAILS_ROOT/config/intializers/aws.rb).
    #
    # If you have a yaml configuration file it should be formatted like the
    # standard `database.yml` file in a Rails application.  This means there
    # should be one section for Rails environment:
    #
    #     development:
    #       access_key_id: YOUR_ACCESS_KEY_ID
    #       secret_access_key: YOUR_SECRET_ACCESS_KEY
    #       simple_db_consistent_reads: false
    #
    #     production:
    #       access_key_id: YOUR_ACCESS_KEY_ID
    #       secret_access_key: YOUR_SECRET_ACCESS_KEY
    #       simple_db_consistent_reads: true
    #
    # You should also consider DRYing up your configuration file using
    # YAML references:
    #
    #     development:
    #       access_key_id: YOUR_ACCESS_KEY_ID
    #       secret_access_key: YOUR_SECRET_ACCESS_KEY
    #       simple_db_consistent_reads: false
    #
    #     production:
    #       <<: *development
    #       simple_db_consistent_reads: true
    #
    # The yaml file will also be ERB parsed so you can use ruby inside of it:
    #
    #     development:
    #       access_key_id: YOUR_ACCESS_KEY_ID
    #       secret_access_key: <%= read_secret_from_a_secure_location %>
    #       simple_db_consistent_reads: false
    #
    #     production:
    #       <<: *development
    #       simple_db_consistent_reads: true
    #
    def self.load_yaml_config

      path = Pathname.new("#{rails_root}/config/aws.yml")

      if File.exist?(path)
        cfg = YAML::load(ERB.new(File.read(path)).result)
        unless cfg[rails_env]
          raise "config/aws.yml is missing a section for `#{rails_env}`"
        end
        AWS.config(cfg[rails_env])
      end

    end

    # Adds a delivery method to ActionMailer that uses
    # {AWS::SimpleEmailService}.
    #
    # Once you have an SES delivery method you can configure Rails to
    # use this for ActionMailer in your environment configuration
    # (e.g.  RAILS_ROOT/config/environments/production.rb)
    #
    #     config.action_mailer.delivery_method = :amazon_ses
    #
    # ### Defaults
    #
    # Normally you don't need to call this method.  By default a delivery method
    # named `:amazon_ses` is added to ActionMailer::Base.  This delivery method
    # uses your default configuration (#{AWS.config}).
    #
    # ### Custom SES Options
    #
    # If you need to supply configuration values for SES that are different than
    # those in {AWS.config} then you can pass those options:
    #
    #     AWS::Rails.add_action_mailer_delivery_method(:ses, custom_options)
    #
    # @param [Symbol] name (:amazon_ses) The name of the delivery
    #   method.  The name used here should be the same as you set in
    #   your environment config.  If you name the delivery method
    #   `:amazon_ses` then you could do something like this in your
    #   config/environments/ENV.rb file:
    #
    #       config.action_mailer.delivery_method = :amazon_ses
    #
    # @param [Hash] options A hash of options that are passes to
    #   {AWS::SimpleEmailService#new} before delivering email.
    #
    # @return [nil]
    #
    def self.add_action_mailer_delivery_method name = :amazon_ses, options = {}

      if ::Rails.version.to_s >= '3.0'
        ActiveSupport.on_load(:action_mailer) do
          self.add_delivery_method(name, AWS::SimpleEmailService, options)
        end
      elsif defined?(::ActionMailer)
        amb = ::ActionMailer::Base
        amb.send(:define_method, "perform_delivery_#{name}") do |mail|
          AWS::SimpleEmailService.new(options).send_raw_email(mail)
        end
      end

      nil

    end

    # Configures AWS to log to the Rails default logger.
    # @return [nil]
    def self.log_to_rails_logger
      AWS.config(:logger => rails_logger)
      nil
    end

    # @api private
    protected
    def self.rails_env
      ::Rails.respond_to?(:env) ? ::Rails.env : RAILS_ENV
    end

    # @api private
    protected
    def self.rails_root
      ::Rails.respond_to?(:root) ? ::Rails.root.to_s : RAILS_ROOT
    end

    # @api private
    protected
    def self.rails_logger
      ::Rails.respond_to?(:logger) ? ::Rails.logger : ::RAILS_DEFAULT_LOGGER
    end

  end
end
