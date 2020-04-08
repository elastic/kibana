require 'spec_helper'

describe EDN::Reader do
  let(:reader) { EDN::Reader.new("[1 2] 3 :a {:b c} ") }

  it "should read each value" do
    reader.read.should == [1, 2]
    reader.read.should == 3
    reader.read.should == :a
    reader.read.should == {:b => ~"c"}
  end

  it "should respond to each" do
    reader.each do |element|
      element.should_not be_nil
    end
  end

  it "returns a special end of file value if asked" do
    4.times { reader.read(:the_end).should_not == :the_end }
    reader.read(:no_more).should == :no_more
  end
end
