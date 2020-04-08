# encoding: utf-8

module LogStash module BootstrapCheck
  class DefaultConfig
    def self.check(settings)
      # currently none of the checks applies if there are multiple pipelines
      # See LogStash::Config::Source::Base for any further settings conflict checks
    end
  end
end end
