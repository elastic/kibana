require "spec_setup"
require "insist"

describe Insist::Enumerables do
  subject do
    Insist.new { [1,2,3] }
  end

  describe "#include?" do
    it "should be OK if the #value includes an item" do
      subject.include?(2)
    end

    it "should fail if the #value does not include an item" do
      insist { subject.include?(4) }.fails
    end
  end
end
