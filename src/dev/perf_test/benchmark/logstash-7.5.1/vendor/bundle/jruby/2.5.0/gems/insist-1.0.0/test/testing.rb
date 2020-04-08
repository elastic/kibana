require "rubygems"
require "minitest/spec"

# Add '../lib' to the require path.
$: << File.join(File.dirname(__FILE__), "..", "lib")

# I don't really like monkeypatching, but whatever, this is probably better
# than overriding the 'describe' method.
class MiniTest::Spec
  class << self
    # 'it' sounds wrong, call it 'test'
    alias :test :it
  end
end
