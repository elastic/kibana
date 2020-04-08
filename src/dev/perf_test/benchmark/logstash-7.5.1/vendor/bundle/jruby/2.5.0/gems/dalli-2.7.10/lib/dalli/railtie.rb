# frozen_string_literal: true
module Dalli
  class Railtie < ::Rails::Railtie
    config.before_configuration do
      config.cache_store = :dalli_store
    end
  end
end
