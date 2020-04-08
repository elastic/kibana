# -*- encoding: utf-8 -*-
require File.expand_path('./helper', File.dirname(__FILE__))

class TestRedBlackTree < Test::Unit::TestCase
  def test_thread
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
