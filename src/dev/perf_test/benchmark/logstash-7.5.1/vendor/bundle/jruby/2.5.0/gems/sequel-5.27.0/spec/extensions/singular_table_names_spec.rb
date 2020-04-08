require_relative "spec_helper"

describe "Sequel::Plugins::SingularTableNames" do
  before do
    @c = Class.new(Sequel::Model)
    @c.plugin :singular_table_names
  end
  after do
    Object.send(:remove_const, :Foo)
  end

  it "should not used the pluralized table name" do
    class ::Foo < @c; end
    Foo.table_name.must_equal :foo
  end

  it "should handle nested moedls name" do
    module ::Foo; end
    class Foo::Bar < @c; end
    Foo::Bar.table_name.must_equal :bar
  end
end
