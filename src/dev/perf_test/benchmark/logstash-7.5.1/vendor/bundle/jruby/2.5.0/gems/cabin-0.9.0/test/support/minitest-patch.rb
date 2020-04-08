require "rubygems"
require "minitest/spec"
# XXX: This code stolen from logstash's test bits.

# I don't really like monkeypatching, but whatever, this is probably better
# than overriding the 'describe' method.
class MiniTest::Spec
  class << self
    # 'it' sounds wrong, call it 'test'
    alias :test :it
  end
end

