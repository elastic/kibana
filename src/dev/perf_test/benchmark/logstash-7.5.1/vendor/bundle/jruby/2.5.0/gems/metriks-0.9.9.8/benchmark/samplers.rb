#!/usr/bin/env ruby

require 'benchmark'
require 'metriks'
require 'rbtree'
require 'avl_tree'
require 'red_black_tree'

fib_times = ARGV[0] ? ARGV[0].to_i : 10
iter      = ARGV[1] ? ARGV[1].to_i : 100000


class TimerBenchmarker
  attr_reader :iter, :fib_times

  def initialize(fib_times, iter)
    @fib_times = fib_times
    @iter      = iter
    @mapping   = { :plain => nil }
  end

  def measure(key, value)
    @mapping[key] = value
  end

  def run
    @results = {}
    @mapping.each do |key, timer|
      @results[key] = Benchmark.realtime do
        if timer
          for i in 1..iter
            timer.time do
              fib(fib_times)
            end
          end
        else
          for i in 1..iter
            fib(fib_times)
          end
        end
      end
    end
    report
  end

  def report
    results = @results.sort_by { |k,v| v }
    results.each_with_index do |(name, time), idx|
      puts "%23s: %f secs %f secs/call" % [
        name, time, time / iter
      ]

      if idx > 0
        prev_name, prev_time = results[idx - 1]
        puts "#{' ' * 25} - %.1f%% slower than %s (%f secs/call)" % [
          (time - prev_time) / prev_time * 100, prev_name,
          (time - prev_time) / iter
        ]
      end

      if idx > 1
        plain_name, plain_time = results[0]
        puts "#{' ' * 25} - %.1f%% slower than %s (%f secs/call)" % [
          (time - plain_time) / plain_time * 100, plain_name,
          (time - plain_time) / iter
        ]
      end
    end
  end

  def fib(n)
    n < 2 ? n : fib(n-1) + fib(n-2)
  end
end

reporter = TimerBenchmarker.new(fib_times, iter)

reporter.measure :uniform, Metriks::Timer.new(Metriks::Histogram.new_uniform)

reporter.measure :exponential, Metriks::Timer.new(Metriks::ExponentiallyDecayingSample.new(
  Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA, RBTree.new))

reporter.measure :exponential_avl, Metriks::Timer.new(Metriks::ExponentiallyDecayingSample.new(
  Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA, AVLTree.new))

reporter.measure :exponential_red_black, Metriks::Timer.new(Metriks::ExponentiallyDecayingSample.new(
  Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA, RedBlackTree.new))

reporter.measure :exponential_concurrent_red_black, Metriks::Timer.new(Metriks::ExponentiallyDecayingSample.new(
  Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA, ConcurrentRedBlackTree.new))

puts "fib(#{fib_times}): #{iter} iterations"
puts "-" * 50

reporter.run
