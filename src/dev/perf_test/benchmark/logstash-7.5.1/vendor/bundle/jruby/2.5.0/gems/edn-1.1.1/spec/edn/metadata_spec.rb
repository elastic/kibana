require 'spec_helper'

describe EDN do
  describe "metadata" do
    it "reads metadata, which does not change the element's equality" do
      EDN.read('[1 2 3]').should == EDN.read('^{:doc "My vec"} [1 2 3]')
    end

    it "reads metadata recursively from right to left" do
      element = EDN.read('^String ^:foo ^{:foo false :tag Boolean :bar 2} [1 2]')
      element.should == [1, 2]
      element.metadata.should == {:tag => ~"String", :foo => true, :bar => 2}
    end

    it "writes metadata" do
      element = EDN.read('^{:doc "My vec"} [1 2 3]')
      element.to_edn.should == '^{:doc "My vec"} [1 2 3]'
    end

    it "only writes metadata for elements that can have it" do
      apply_metadata = lambda { |o|
        o.extend(EDN::Metadata)
        o.metadata = {:foo => 1}
        o
      }

      apply_metadata[[1, 2]].to_edn.should == '^{:foo 1} [1 2]'
      apply_metadata[~[1, 2]].to_edn.should == '^{:foo 1} (1 2)'
      apply_metadata[{1 => 2}].to_edn.should == '^{:foo 1} {1 2}'
      apply_metadata[Set.new([1, 2])].to_edn.should == '^{:foo 1} #{1 2}'
      apply_metadata[~"bar"].to_edn.should == '^{:foo 1} bar'

      apply_metadata["bar"].to_edn.should == '"bar"'

      # Cannot extend symbols, booleans, and nil, so no test for them.
    end
  end
end
