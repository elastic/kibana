# encoding: utf-8
module LogStash
  module Api
    module Modules
      class Root < ::LogStash::Api::Modules::Base
        get "/" do
          command = factory.build(:system_basic_info)
          respond_with command.run
        end
      end
    end
  end
end
