require 'benchmark'
require 'red_black_tree'

Benchmark.bmbm do |bm|
  bm.report do
    h = ConcurrentRedBlackTree.new
    num = 100000
    max = 1000
    threads = []
    # writers
    2.times do
      threads << Thread.new {
        num.times do
        key = rand(max)
        h[key] = key
        end
      }
    end
    # deleters
    2.times do
      threads << Thread.new {
        num.times do
        key = rand(max)
        h.delete(key)
        end
      }
    end
    # readers
    2.times do
      threads << Thread.new {
        num.times do
        key = rand(max)
        h[key]
        end
      }
    end
    threads.each(&:join)
  end
end
