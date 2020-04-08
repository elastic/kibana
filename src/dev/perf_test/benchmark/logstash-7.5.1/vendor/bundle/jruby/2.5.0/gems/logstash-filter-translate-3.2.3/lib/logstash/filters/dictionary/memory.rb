# encoding: utf-8
require "logstash/filters/fetch_strategy/memory"

module LogStash module Filters module Dictionary
  class Memory

    attr_reader :dictionary, :fetch_strategy

    def initialize(hash, exact, regex)
      klass = case
              when exact && regex then FetchStrategy::Memory::ExactRegex
              when exact          then FetchStrategy::Memory::Exact
              else                     FetchStrategy::Memory::RegexUnion
              end
      @fetch_strategy = klass.new(hash)
    end

    def stop_scheduler
      # noop
    end

    private

    def needs_refresh?
      false
    end

    def load_dictionary(raise_exception=false)
      # noop
    end
  end
end end end
