$LOAD_PATH.unshift File.dirname(__FILE__)
require 'helper'

class TemplateTest < Test::Unit::TestCase
  def test_compile
    assert_equal %("foo"), Mustache::Template.new("foo").compile
  end

  def test_compile_with_source
    assert_equal %("bar"), Mustache::Template.new("foo").compile("bar")
  end

  def test_token
    assert_equal [:multi, [:static, "foo"]], Mustache::Template.new("foo").tokens
  end

  def test_token_with_source
    assert_equal [:multi, [:static, "bar"]], Mustache::Template.new("foo").tokens("bar")
  end
end

class TemplateTest2 < Test::Unit::TestCase
  def setup
    @@template_text ||= File.read(File.dirname(__FILE__) + "/fixtures/simply_complicated.mustache")
    @template = Mustache::Template.new(@@template_text)
  end

  def test_tags
    assert_equal [
      "yourname",
      "HOME",
      "friend.name",
      "friend.morr.word",
      "friend.morr.up",
      "friend.morr.awesomesauce",
      "friend.morr.hiss",
      "friend.notinmorr",
      "friend.person",
      "love",
      "triplestash"
      ], @template.tags
  end

  def test_partials
    assert_equal ["partial1", "partial2"], @template.partials
  end

  def test_sections
    assert_equal ["friend", "friend.morr"], @template.sections
  end
end


