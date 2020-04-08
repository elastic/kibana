require 'spec_helper'

describe 'edn_parser' do
  include RantlyHelpers

  let(:parser) { EDN.new_parser }

  it "can contain comments" do
    edn = ";; This is some sample data\n[1 2 ;; the first two values\n3]"
    EDN.read(edn).should == [1, 2, 3]
  end

  it "can discard using the discard reader macro" do
    edn = "[1 2 #_3 {:foo #_bar :baz}]"
    EDN.read(edn).should == [1, 2, {:foo => :baz}]
  end

  context "element" do
    it "should consume metadata with the element" do
      x = EDN.read('^{:doc "test"} [1 2]')
      x.should == [1, 2]
      x.metadata.should == {doc: "test"}
    end
  end

  context "integer" do
    it "should consume integers" do
      rant(RantlyHelpers::INTEGER).each do |int|
        (EDN.read int.to_s).should == int.to_i
      end
    end

    it "should consume integers prefixed with a +" do
      rant(RantlyHelpers::INTEGER).each do |int|
        (EDN.read "+#{int.to_i.abs.to_s}").should == int.to_i.abs
      end
    end
  end

  context "float" do
    it "should consume simple floats" do
      rant(RantlyHelpers::FLOAT).each do |float|
        EDN.read(float.to_s).should == float.to_f
      end
    end

    it "should consume floats with exponents" do
      rant(RantlyHelpers::FLOAT_WITH_EXP).each do |float|
        EDN.read(float.to_s).should == float.to_f
      end
    end

    it "should consume floats prefixed with a +" do
      rant(RantlyHelpers::FLOAT).each do |float|
        EDN.read("+#{float.to_f.abs.to_s}").should == float.to_f.abs
      end
    end
  end

  context "symbol" do
    context "special cases" do
      it "should consume '/'" do
        EDN.read('/').should == EDN::Type::Symbol.new(:"/")
      end

      it "should consume '.'" do
        EDN.read('.').should == EDN::Type::Symbol.new(:".")
      end

      it "should consume '-'" do
        EDN.read('-').should == EDN::Type::Symbol.new(:"-")
      end
    end
  end

  context "keyword" do
    it "should consume any keywords" do
      rant(RantlyHelpers::SYMBOL).each do |symbol|
        EDN.read(":#{symbol}").should == symbol.to_sym
      end
    end
  end

  context "string" do
    it "should consume any string" do
      rant(RantlyHelpers::RUBY_STRING).each do |string|
        EDN.read(string.to_edn).should == string
      end
    end
  end

  context "character" do
    it "should consume any character" do
      rant(RantlyHelpers::RUBY_CHAR).each do |char|
        EDN.read(char.to_edn).should == char
      end
    end
  end

  context "vector" do
    it "should consume an empty vector" do
      EDN.read('[]').should == []
      EDN.read('[  ]').should == []
    end

    it "should consume vectors of mixed elements" do
      rant(RantlyHelpers::VECTOR).each do |vector|
        expect { EDN.read(vector) }.to_not raise_error
      end
    end
  end

  context "list" do
    it "should consume an empty list" do
      EDN.read('()').should == []
      EDN.read('( )').should == []
    end

    it "should consume lists of mixed elements" do
      rant(RantlyHelpers::LIST).each do |list|
        expect { EDN.read(list) }.to_not raise_error
      end
    end
  end

  context "set" do
    it "should consume an empty set" do
      EDN.read('#{}').should == Set.new
      EDN.read('#{ }').should == Set.new
    end

    it "should consume sets of mixed elements" do
      rant(RantlyHelpers::SET).each do |set|
        EDN.read(set)
      end
    end
  end

  context "map" do
    it "should consume maps of mixed elements" do
      rant(RantlyHelpers::MAP).each do |map|
        expect { EDN.read(map) }.not_to raise_error
      end
    end
  end

  context "tagged element" do
    context "#inst" do
      it "should consume #inst" do
        rant(RantlyHelpers::INST).each do |element|
          expect { EDN.read(element) }.not_to raise_error
        end
      end
    end

    it "should consume tagged elements" do
      rant(RantlyHelpers::TAGGED_ELEMENT).each do |element|
        expect { EDN.read(element) }.not_to raise_error
      end
    end
  end
end
