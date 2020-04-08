
# TODO(sissel): This requires ruby 1.9.x
module Insist::Comparators
  # value != expected
  def !=(expected)
    assert(value != expected,
           "Expected #{value.inspect} != #{expected.inspect}")
  end # def !=

  # TODO(sissel): This requires ruby 1.9.x
  # value =~ pattern
  def =~(pattern)
    assert(value =~ pattern,
           "Expected #{value.inspect} =~ #{pattern.inspect}")
  end # def =~

  # TODO(sissel): This requires ruby 1.9.x
  # value !~ pattern
  def !~(pattern)
    assert(value !~ pattern,
           "Expected #{value.inspect} !~ #{pattern.inspect}")
  end # def !~
end
