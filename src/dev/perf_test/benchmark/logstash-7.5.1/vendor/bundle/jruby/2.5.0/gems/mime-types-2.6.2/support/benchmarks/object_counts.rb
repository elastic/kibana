# -*- ruby encoding: utf-8 -*-

module Benchmarks
  class ObjectCounts
    def self.report(columnar: false)
      new(columnar: columnar).report
    end

    def initialize(columnar: false)
      @columnar = columnar
    end

    def report
      collect
      @before.keys.grep(/T_/).map { |key|
        [ key, @after[key] - @before[key] ]
      }.sort_by { |_, delta| -delta }.each { |key, delta|
        puts '%10s +%6d' % [ key, delta ]
      }
    end

    private

    def collect
      @before = count_objects

      if @columnar
        require 'mime/types/columnar'
      else
        require 'mime/types'
      end

      @after = count_objects
    end

    def count_objects
      GC.start
      ObjectSpace.count_objects
    end
  end
end
