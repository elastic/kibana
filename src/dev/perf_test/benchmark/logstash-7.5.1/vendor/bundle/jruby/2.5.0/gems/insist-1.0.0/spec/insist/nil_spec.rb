require "spec_setup"
require "insist"

describe Insist::Nil do
  describe "#nil?" do
    it "should be OK if the #value is nil" do
      insist { nil }.nil?
    end

    it "should fail if the #value is not nil" do
      insist do
        insist { "not nil" }.nil?
      end.fails
    end
  end
end
