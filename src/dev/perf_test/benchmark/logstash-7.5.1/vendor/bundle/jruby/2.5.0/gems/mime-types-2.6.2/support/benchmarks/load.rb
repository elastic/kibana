# -*- ruby encoding: utf-8 -*-

require 'benchmark'

module Benchmarks
  class Load
    def self.report(load_path, repeats)
      new(load_path, repeats.to_i).report
    end

    def initialize(load_path, repeats = nil)
      @cache_file = File.expand_path('../cache.mtc', __FILE__)
      @repeats    = repeats.to_i
      @repeats    = 50 if repeats <= 0
      @load_path  = load_path
    end

    def reload_mime_types(repeats = 1, options = {})
      force_load = options.fetch(:force_load, false)
      columnar = options.fetch(:columnar, false)

      repeats.times {
        Object.send(:remove_const, :MIME) if defined? ::MIME
        $LOADED_FEATURES.delete_if { |n| n =~ /#{@load_path}/ }

        if columnar
          require 'mime/types/columnar'
        else
          require 'mime/types'
        end
        ::MIME::Types.send(:__types__) if force_load
      }
    end

    def report
      remove_cache

      Benchmark.bm(17) do |mark|
        mark.report('Normal:') { reload_mime_types(@repeats) }
        mark.report('Columnar:') { reload_mime_types(@repeats, columnar: true) }

        ENV['RUBY_MIME_TYPES_LAZY_LOAD'] = 'yes'
        mark.report('Lazy:') { reload_mime_types(@repeats) }
        mark.report('Lazy+Load:') { reload_mime_types(@repeats, force_load: true) }

        ENV.delete('RUBY_MIME_TYPES_LAZY_LOAD')

        ENV['RUBY_MIME_TYPES_CACHE'] = @cache_file
        reload_mime_types

        mark.report('Cached:') { reload_mime_types(@repeats) }
        ENV['RUBY_MIME_TYPES_LAZY_LOAD'] = 'yes'
        mark.report('Lazy Cached:') { reload_mime_types(@repeats) }
        mark.report('Lazy Cached Load:') { reload_mime_types(@repeats, force_load: true) }
      end
    ensure
      remove_cache
    end

    def remove_cache
      File.unlink(@cache_file) if File.exist?(@cache_file)
    end
  end
end
