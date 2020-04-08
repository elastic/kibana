require "insist/namespace"

require "insist/assert"
require "insist/comparators"
require "insist/enumerables"
require "insist/failure"
require "insist/nil"
require "insist/predicates"
require "insist/raises"

# Insist on correctness.
#
#
# Example:
#
#     data = { "hello" => "world" }
#     insist { data["hello"] } == "world"
#
# This class aims to work similarly to how rspec's "should" stuff does, but
# instead of molesting Object allows you to neatly wrap values with blocks
# while still checking for expected values.
class Insist
  class Failure < StandardError; end

  include Insist::Comparators
  include Insist::Enumerables
  include Insist::Nil
  include Insist::Assert
  include Insist::Raises
  include Insist::Predicates

  # Create a new insist with a block.
  #
  # Example:
  #
  #   Insist.new { value }
  #
  # Better:
  #
  #   insist { value }
  def initialize(&block)
    @callback = block
  end # def initialize

  def value
    # TODO(sissel): make caching the value optional
    @value ||= @callback.call
    return @value
  end # def value
end # class Insist

# Like Insist, but rejects (fails) on truthy values instead falsey ones.
class Reject < Insist
  def assert(truthy, message)
    raise Insist::Failure.new(message) if truthy
  end # def assert
end # class Reject

module Kernel
  # A shortcut to 'Insist.new'
  #
  # Example:
  #
  #     insist { "hello world" } != "fizzle"
  def insist(&block)
    return Insist.new(&block)
  end # def insist

  # A shortcut to 'Reject.new'
  #
  # Example:
  #
  #     # This will fail (raises Insist::Failure)
  #     reject { [1,2,3,4] }.include?(3)
  #
  #     # This will succeed
  #     reject { [1,2,3,4] }.include?(4)
  def reject(&block)
    return Reject.new(&block)
  end # def reject
end # module Kernel
