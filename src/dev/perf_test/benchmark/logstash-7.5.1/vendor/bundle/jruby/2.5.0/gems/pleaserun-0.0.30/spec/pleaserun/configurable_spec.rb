require "testenv"
require "pleaserun/configurable"

# rubocop complains that 'insist { ... } == ...' is Void. It's wrong, in this
# case, so let's disable that check.
# rubocop:disable Void

describe PleaseRun::Configurable::Facet do
  subject { PleaseRun::Configurable::Facet  }

  it "should have nil value by default" do
    facet = subject.new(:name, "description")
    insist { facet.value }.nil?
  end

  context "#name" do
    subject { PleaseRun::Configurable::Facet.new(:hello, "world") }
    it "returns the name" do
      insist { subject.name } == :hello
    end
  end

  context "#description" do
    subject { PleaseRun::Configurable::Facet.new(:hello, "world") }
    it "returns the description" do
      insist { subject.description } == "world"
    end
  end

  context "#value=" do
    it "returns the given value" do
      facet = subject.new(:name, "description")

      # Check return value of assignment
      insist { facet.value = 3 } == 3

      # Check return value of read
      insist { facet.value } == 3
    end

    it "invokes the validation block when value is set" do
      count = 0
      facet = subject.new(:name, "description") do
        validate do |v| 
          count += 1
          insist { v } == 3
        end
      end
      insist { count } == 0
      insist { facet.value }.nil?
      facet.value = 3
      insist { facet.value } == 3
      insist { count } == 1
    end

    it "invokes the munger" do
      count = 0
      facet = subject.new(:name, "description") do
        munge do |v|
          count += 1
          next v.to_s
        end
      end

      insist { count } == 0
      facet.value = 1000
      insist { facet.value } == "1000"
      facet.value = "hello"
      insist { facet.value } == "hello"
      facet.value = { "foo" => "bar" }
      insist { facet.value } == '{"foo"=>"bar"}'
      insist { count } == 3
    end

    it "invokes munger prior to validation" do
      order = []
      facet = subject.new(:name, "description") do
        validate do |v|
          order << :validate
          insist { v.is_a?(Array) }
        end
        munge do |v|
          order << :munge
          if !v.is_a?(Array)
            next [v]
          else
            v
          end
        end
      end

      facet.value = "hello"
      insist { facet.value } == ["hello"]
      insist { order } == [:munge, :validate]
    end
  end
  
  context "#set?" do
    it "returns false if value isn't set" do
      facet = subject.new(:name, "description")
      reject { facet }.set?
    end
    it "returns false if value isn't set and we have a default" do
      facet = subject.new(:name, "description", :default => 100)
      reject { facet }.set?
      insist { facet.value } == 100
    end
    it "returns true if value is set" do
      facet = subject.new(:name, "description")
      reject { facet }.set?
      facet.value = "hello"
      insist { facet }.set?
    end
  end

  context "with :default => ..." do
    it "uses default when no value is set" do
      facet = subject.new(:name, "description", :default => 4)
      insist { facet.value } == 4
      facet.value = 5
      insist { facet.value } == 5
    end

    it "fails if default is invalid" do
      insist do
        subject.new(:name, "description", :default => 4) do
          validate do |v|
            insist { v } != 4
          end
        end
      end.raises(PleaseRun::Configurable::ValidationError)
    end
    
    it "succeeds if default is valid" do
      subject.new(:name, "description", :default => 4) do
        validate do |v|
          insist { v } == 4
        end
      end
    end
  end

  context "attribute" do
    subject do
      next Class.new do
        include PleaseRun::Configurable
        attribute :whatever, "whatever"
      end
    end

    it "creates accessor methods" do
      foo = subject.new
      insist { foo }.respond_to?(:whatever)
      insist { foo }.respond_to?(:whatever=)
      insist { foo }.respond_to?(:whatever?)
    end

    it "doesn't share values with other instances" do
      foo1 = subject.new
      foo2 = subject.new
      foo1.whatever = "fancy"
      insist { foo1.whatever } != foo2.whatever
    end

    context "#<attribute>?" do
      it "returns false if the value isn't set" do
        reject { subject.new }.whatever?
      end
      it "returns true if the value is set" do
        foo = subject.new
        reject { foo }.whatever?
        foo.whatever = "pants"
        insist { foo }.whatever?
      end
    end

    context "via configurable_setup" do
      subject do
        next Class.new do
          include PleaseRun::Configurable
          attribute :whatever, "whatever", :default => "Hello"

          def initialize(something)
            @something = something
            configurable_setup
          end
        end
      end

      it "creates accessor methods" do
        foo = subject.new(1234)
        insist { foo }.respond_to?(:whatever)
        insist { foo }.respond_to?(:whatever=)
        insist { foo.whatever } == "Hello"
      end
    end

    context "validation" do
      subject do
        next Class.new do
          include PleaseRun::Configurable
          attribute :number, "something" do
            validate do |v|
              insist { v }.is_a?(Numeric)
            end
          end
        end
      end

      it "fails if it raises an exception" do
        insist { subject.new.number = "hello" }.raises(PleaseRun::Configurable::ValidationError)
      end

      it "succeeds if no exception is raised" do
        subject.new.number = 33
      end
    end
  end
end
