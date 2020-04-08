require_relative "spec_helper"

Sequel.extension :blank

describe "Object#blank?" do
  it "it should be true if the object responds true to empty?" do
    [].blank?.must_equal true
    {}.blank?.must_equal true
    o = Object.new
    def o.empty?; true; end
    o.blank?.must_equal true
  end

  it "it should be false if the object doesn't respond true to empty?" do
    [2].blank?.must_equal false
    {1=>2}.blank?.must_equal false
    Object.new.blank?.must_equal false
  end
end

describe "Numeric#blank?" do
  it "it should always be false" do
    1.blank?.must_equal false
    0.blank?.must_equal false
    -1.blank?.must_equal false
    1.0.blank?.must_equal false
    0.0.blank?.must_equal false
    -1.0.blank?.must_equal false
    10000000000000000.blank?.must_equal false
    -10000000000000000.blank?.must_equal false
    10000000000000000.0.blank?.must_equal false
    -10000000000000000.0.blank?.must_equal false
  end
end

describe "NilClass#blank?" do
  it "it should always be true" do
    nil.blank?.must_equal true
  end
end

describe "TrueClass#blank?" do
  it "it should always be false" do
    true.blank?.must_equal false
  end
end

describe "FalseClass#blank?" do
  it "it should always be true" do
    false.blank?.must_equal true
  end
end

describe "String#blank?" do
  it "it should be true if the string is empty" do
    ''.blank?.must_equal true
  end
  it "it should be true if the string is composed of just whitespace" do
    ' '.blank?.must_equal true
    "\r\n\t".blank?.must_equal true
    (' '*4000).blank?.must_equal true
    ("\r\n\t"*4000).blank?.must_equal true
  end
  it "it should be false if the string has any non whitespace characters" do
    '1'.blank?.must_equal false
    ("\r\n\t"*4000 + 'a').blank?.must_equal false
    ("\r\na\t"*4000).blank?.must_equal false
  end
end
