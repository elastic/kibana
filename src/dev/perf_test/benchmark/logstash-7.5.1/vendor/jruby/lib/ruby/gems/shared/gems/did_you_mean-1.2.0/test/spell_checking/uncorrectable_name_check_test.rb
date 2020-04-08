require 'test_helper'

class UncorrectableNameCheckTest < Minitest::Test
  class FirstNameError < NameError; end

  def setup
    @error = assert_raises(FirstNameError) do
      raise FirstNameError, "Other name error"
    end
  end

  def test_message
    assert_equal "Other name error", @error.message
  end
end
