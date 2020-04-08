require_relative "spec_helper"

describe "boolean_subsets plugin" do
  before do
    @db = Sequel.mock
    def @db.supports_schema_parsing?() true end
    def @db.schema(*args)
      [[:asdaf9898as, {}], [:active, {:type=>:boolean}]]
    end

    @c = Class.new(Sequel::Model(@db[:items]))
    @p = proc do
      @columns = [:asdaf9898as, :active]
      def columns; @columns; end
    end
    @c.instance_eval(&@p)
  end 

  it "should create subsets only for boolean attributes" do
    @c.plugin(:boolean_subsets)
    @c.active.sql.must_equal "SELECT * FROM items WHERE (active IS TRUE)"
    @c.respond_to?(:asdaf9898as).must_equal false
  end

  it "should handle a block passed to the plugin" do
    @c.plugin(:boolean_subsets){|c| ["where_#{c}", c]}
    @c.where_active.sql.must_equal "SELECT * FROM items WHERE active"
    @c.respond_to?(:active).must_equal false
  end

  it "should create boolean subsets when set_dataset is called" do
    c = Class.new(Sequel::Model(@db))
    c.instance_eval(&@p)
    c.plugin(:boolean_subsets)
    c.respond_to?(:active).must_equal false

    c.set_dataset(@db[:items])
    c.active.sql.must_equal "SELECT * FROM items WHERE (active IS TRUE)"
    c.respond_to?(:asdaf9898as).must_equal false
  end

  it "should handle cases where getting the columns raises an error" do
    def @c.columns; raise Sequel::Error end
    @c.plugin(:boolean_subsets)
    @c.respond_to?(:active).must_equal false
  end
end
