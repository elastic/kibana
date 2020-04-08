require "spec_setup"
require "insist"

describe Insist::Comparators do
  subject do
    reject { [1,2,3] }
  end

  describe "#include?" do
    it "should fail if the include? returns true" do
      insist { subject.include?(2) }.fails
    end

    it "should succeed if include? returns false" do
      subject.include?(4)
    end
  end
end
