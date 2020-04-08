
module Insist::Raises
  # Assert raises
  def raises(exception_class)
    begin
      value
    rescue exception_class => e
      return # We're OK
    end

    assert(false, 
           "Expected exception '#{exception_class}' but none was raised")
  end # def raises

  # Asserts a failure
  def fails
    raises(Insist::Failure)
  end # def fails
end # module Insist::Raises
