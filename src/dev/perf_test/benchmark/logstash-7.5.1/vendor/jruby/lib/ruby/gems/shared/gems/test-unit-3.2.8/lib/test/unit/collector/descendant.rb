require 'test/unit/collector'

module Test
  module Unit
    module Collector
      class Descendant
        include Collector

        NAME = 'collected from the subclasses of TestCase'

        def collect(name=NAME)
          suite = TestSuite.new(name)
          add_test_cases(suite, TestCase::DESCENDANTS)
          suite
        end
      end
    end
  end
end
