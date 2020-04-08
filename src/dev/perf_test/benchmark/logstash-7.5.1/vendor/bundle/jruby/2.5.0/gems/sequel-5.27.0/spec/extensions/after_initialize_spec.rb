require_relative "spec_helper"

describe "Sequel::Plugins::AfterInitialize" do
  before do
    @db = Sequel.mock(:host=>'mysql', :numrows=>1)
    @c = Class.new(Sequel::Model(@db[:test]))
    @c.class_eval do
      columns :id, :name
      plugin :after_initialize
      def after_initialize
        self.name *= 2
        self.id *= 3 if id
      end
    end
  end

  it "should have after_initialize hook be called for new objects" do
    @c.new(:name=>'foo').values.must_equal(:name=>'foofoo')
  end

  it "should have after_initialize hook be called for objects loaded from the database" do
    @c.call(:id=>1, :name=>'foo').values.must_equal(:id=>3, :name=>'foofoo')
  end

  it "should not allow .call to be called without arguments" do
    proc{@c.call}.must_raise ArgumentError
  end
end
