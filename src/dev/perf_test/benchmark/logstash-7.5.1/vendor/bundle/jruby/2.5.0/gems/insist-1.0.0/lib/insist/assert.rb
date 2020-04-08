
module Insist::Assert
  # Assert something is true.
  #
  # This will raise Insist::Failure with the given message if the 'truthy'
  # value is false.
  def assert(truthy, message)
    raise Insist::Failure.new(message) if !truthy
  end # def assert
end # module Insist::Assert
