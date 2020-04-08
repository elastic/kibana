
module Insist::Nil
  # Assert nil
  def nil?
    assert(value.nil?,  "Expected nil, got #{@value.inspect}")
  end # def nil?
end # module Insist::Nil
