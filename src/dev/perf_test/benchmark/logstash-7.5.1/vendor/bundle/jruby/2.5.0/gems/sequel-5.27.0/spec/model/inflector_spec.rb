require_relative "spec_helper"

describe Sequel::Inflections do
  before do
    @plurals, @singulars, @uncountables = Sequel.inflections.plurals.dup, Sequel.inflections.singulars.dup, Sequel.inflections.uncountables.dup
  end
  after do
    Sequel.inflections.plurals.replace(@plurals)
    Sequel.inflections.singulars.replace(@singulars)
    Sequel.inflections.uncountables.replace(@uncountables)
  end

  it "should be possible to clear the list of singulars, plurals, and uncountables" do
    Sequel.inflections.clear(:plurals)
    Sequel.inflections.plurals.must_equal []
    Sequel.inflections.plural('blah', 'blahs')
    Sequel.inflections.clear
    Sequel.inflections.plurals.must_equal []
    Sequel.inflections.singulars.must_equal []
    Sequel.inflections.uncountables.must_equal []
  end

  it "should be yielded and returned by Sequel.inflections" do
    Sequel.inflections{|i| i.must_equal Sequel::Inflections}.must_equal Sequel::Inflections
  end
end
