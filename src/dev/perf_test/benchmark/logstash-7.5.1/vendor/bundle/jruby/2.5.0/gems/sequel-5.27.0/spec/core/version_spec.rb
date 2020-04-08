require_relative "spec_helper"

describe "Sequel.version" do
  it "should be in the form X.Y.Z with all being numbers" do
    Sequel.version.must_match(/\A\d+\.\d+\.\d+\z/)
  end

  it "MAJOR/MINOR/TINY/VERSION_NUMBER should be integers" do
    Sequel::MAJOR.must_be_kind_of(Integer)
    Sequel::MINOR.must_be_kind_of(Integer)
    Sequel::TINY.must_be_kind_of(Integer)
    Sequel::VERSION_NUMBER.must_be_kind_of(Integer)
  end
end
