
# Provides assertions for enumerable-ish methods
#
# Example:
#
#     insist { "foo" } == "foo"
module Insist::Enumerables
  include Insist::Assert

  def include?(item)
    assert(value.include?(item),
           "Expected #{item.inspect} in #{value.inspect}")
  end
end
