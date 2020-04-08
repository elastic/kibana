require "insist/namespace"
require "insist/assert"

module Insist::Predicates
  include Insist::Assert
  PREDICATE_METHOD_RE = /\?$/

  # Fails if the value does not respond to a method.
  # 
  # insist { "hurray" }.respond_to?(:size)
  def respond_to?(method)
    assert(value.respond_to?(method),
           "#{value.class} does not respond to the '#{method}' method")
  end # def respond_to?

  # Fails if the value.is_a?(klass) returns false.
  # 
  # insist { "hurray" }.is_a?(Number)
  def is_a?(klass)
    assert(value.is_a?(klass), "#{value.class} is not a #{klass}")
  end

  # Pass through any 'foo?' style method calls to the 'value' 
  # and fail if the the return is false.
  def method_missing(m, *args)
    # If this is a predicate method (ends in question mark)
    # call it on the value and assert truthiness.
    if PREDICATE_METHOD_RE.match(m.to_s)
      insist { value }.respond_to?(m)

      # call the method, like .empty?, result must be truthy.
      result = value.send(m, *args)
      assert(result, 
             "#{value.class}{#{value.inspect}}##{m}(#{args.join(",")}) " \
             "expected to return a truthy value, but returned #{result}")
      return result
    else
      return super(m, *args)
    end
  end # def method_missing
end # module Insist::Predicates
