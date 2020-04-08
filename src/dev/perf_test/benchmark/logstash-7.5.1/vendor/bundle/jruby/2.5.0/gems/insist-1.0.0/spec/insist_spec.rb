require "spec_setup"
require "insist"

describe Insist do
  subject do
    Insist.new { "Hello world" }
  end

  describe "#value" do
    it "should return the block value" do
      insist { subject.value } == "Hello world"
    end
  end
end
