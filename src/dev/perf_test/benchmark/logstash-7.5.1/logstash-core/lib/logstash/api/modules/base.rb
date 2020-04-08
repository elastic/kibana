# encoding: utf-8
require "logstash/api/app_helpers"
require "logstash/api/command_factory"
require "logstash/api/errors"

module LogStash
  module Api
    module Modules
      class Base < ::Sinatra::Base

        helpers AppHelpers

        # These options never change
        # Sinatra isn't good at letting you change internal settings at runtime
        # which is a requirement. We always propagate errors up and catch them
        # in a custom rack handler in the RackApp class
        set :environment, :production
        set :raise_errors, true
        set :show_exceptions, false

        attr_reader :factory, :agent

        include LogStash::Util::Loggable

        helpers AppHelpers

        def initialize(app=nil, agent)
          super(app)
          @agent = agent
          @factory = ::LogStash::Api::CommandFactory.new(LogStash::Api::Service.new(agent))
        end

        not_found do
          # We cannot raise here because it won't be catched by the `error` handler.
          # So we manually create a new instance of NotFound and just pass it down.
          respond_with(NotFoundError.new)
        end

        # This allow to have custom exception but keep a consistent
        # format to report them.
        error ApiError do |error|
          respond_with(error)
        end
      end
    end
  end
end
