class TestUnitColor < Test::Unit::TestCase
  def test_color_escape_sequence
    assert_escape_sequence(["31"], color("red"))
    assert_escape_sequence(["32", "1"], color("green", :bold => true))
    assert_escape_sequence(["0"], color("reset"))
    assert_escape_sequence(["45"], color("magenta", :background => true))
  end

  def test_mix_color_escape_sequence
    assert_escape_sequence(["34", "1"],
                           mix_color([color("blue"),
                                      color("none", :bold => true)]))
    assert_escape_sequence(["34", "1", "4"],
                           mix_color([color("blue"),
                                      color("none", :bold => true)]) +
                           color("none", :underline => true))
    assert_escape_sequence(["34", "1", "4"],
                           color("blue") +
                           color("none", :bold => true) +
                           color("none", :underline => true))
  end

  def test_equal
    red = color("red")
    red_bold = color("red", :bold => true)

    assert_operator(red, :==, red)
    assert_not_equal(red, nil)
    assert_equal(red, color("red"))
    assert_not_equal(red, red_bold)
  end

  private
  def color(name, options={})
    Test::Unit::Color.new(name, options)
  end

  def mix_color(colors)
    Test::Unit::MixColor.new(colors)
  end

  def assert_escape_sequence(expected, color)
    assert_equal(expected, color.sequence)
    assert_match(/\e\[(?:\d+;)*\d+m/, color.escape_sequence)
    assert_equal(expected, color.escape_sequence[2..-2].split(";"))
  end
end
