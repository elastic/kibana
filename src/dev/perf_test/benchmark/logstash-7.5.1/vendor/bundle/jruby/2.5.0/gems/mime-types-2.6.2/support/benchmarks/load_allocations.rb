# -*- ruby encoding: utf-8 -*-

if RUBY_VERSION < '2.1'
  $stderr.puts "Cannot count allocations on #{RUBY_VERSION}."
  exit 1
end

begin
  require 'allocation_tracer'
rescue LoadError
  $stderr.puts "Allocation tracking requires the gem 'allocation_tracer'."
  exit 1
end

module Benchmarks
  class LoadAllocations
    def self.report(columnar: false, top_x: nil, mime_types_only: false)
      new(columnar: columnar, top_x: top_x, mime_types_only: mime_types_only).
        report
    end

    def initialize(columnar: false, top_x: nil, mime_types_only: false)
      @columnar = columnar
      @mime_types_only = !!mime_types_only

      @top_x = top_x

      return unless @top_x
      @top_x = top_x.to_i
      @top_x = 10 if @top_x <= 0
    end

    def report
      collect
      report_top_x if @top_x
      puts "TOTAL Allocations: #{@count}"
    end

    private

    def report_top_x
      table = @allocations.sort_by { |_, v| v.first }.reverse.first(@top_x)
      table.map! { |(location, allocs)|
        next if @mime_types_only and location.first !~ %r{mime-types/lib}
        [ location.join(':').gsub(%r{^#{Dir.pwd}/}, ''), *allocs ]
      }.compact!

      head = (ObjectSpace::AllocationTracer.header - [ :line ]).map {|h|
        h.to_s.split(/_/).map(&:capitalize).join(' ')
      }
      table.unshift head

      max_widths = [].tap do |mw|
        table.map { |row| row.lazy.map(&:to_s).map(&:length).to_a }.tap do |w|
          w.first.each_index do |i|
            mw << w.lazy.map { |r| r[i] }.max
          end
        end
      end

      pattern = [ '%%-%ds' ]
      pattern << ([ '%% %ds' ] * (max_widths.length - 1))
      pattern = pattern.join("\t") % max_widths
      table.each { |row| puts pattern % row }
      puts
    end

    def collect
      if @columnar
        @allocations = ObjectSpace::AllocationTracer.trace do
          require 'mime/types/columnar'
        end
      else
        @allocations = ObjectSpace::AllocationTracer.trace do
          require 'mime/types'
        end
      end

      @count = ObjectSpace::AllocationTracer.allocated_count_table.values.
        inject(:+)
    end
  end
end
