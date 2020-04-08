
# Provides the '==' assertion method.
#
# Example:
#
#     insist { "foo" } == "foo"
module Insist::Comparators
  include Insist::Assert
  require "insist/comparators19" if RUBY_VERSION >= "1.9.2"

  # value == expected
  def ==(expected)
    assert(value == expected,
           "Expected #{expected.inspect}, but got #{value.inspect}")
  end # def ==

  # value <= expected
  def <=(expected)
    assert(value <= expected,
           "Expected #{value.inspect} <= #{expected.inspect}")
  end # def <=
 
  # value >= expected
  def >=(expected)
    assert(value >= expected,
           "Expected #{value.inspect} >= #{expected.inspect}")
  end # def >=

  # value > expected
  def >(expected)
    assert(value > expected,
           "Expected #{value.inspect} > #{expected.inspect}")
  end # def >

  # value < expected
  def <(expected)
    assert(value < expected,
           "Expected #{value.inspect} < #{expected.inspect}")
  end # def <
 
end # module Insist::Comparators
