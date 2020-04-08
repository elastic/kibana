# encoding: utf-8
module LogStash
  module Api
    module Modules
      class Plugins < ::LogStash::Api::Modules::Base

        get "/" do
          command = factory.build(:plugins_command)
          respond_with(command.run())
        end

      end
    end
  end
end
