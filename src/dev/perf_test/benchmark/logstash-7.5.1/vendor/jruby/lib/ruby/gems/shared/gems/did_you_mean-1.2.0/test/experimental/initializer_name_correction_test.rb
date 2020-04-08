require 'test_helper'

class InitializerNameCorrectionTest < Minitest::Test
  def test_corrects_wrong_initializer_name
    assert_output nil, "warning: intialize might be misspelled, perhaps you meant initialize?\n" do
      Class.new { def intialize; end }
    end
  end

  def test_does_not_correct_correct_initializer_name
    assert_output nil, "" do
      Class.new { def initialize; end }
    end
  end
end
