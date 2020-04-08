require_relative "spec_helper"

begin
  require 'active_model'
rescue LoadError
  warn "Skipping test of active_model plugin: can't load active_model"
else
describe "ActiveModel plugin" do
  before do
    class ::AMLintTest < Sequel::Model
      set_primary_key :id
      columns :id, :id2
      def delete; end
    end
    module ::Blog
      class Post < Sequel::Model
         plugin :active_model
      end
    end
    @c = AMLintTest
    @c.plugin :active_model
    @c.freeze if @freeze_class
    @m = @model = @c.new
    @o = @c.load({})
  end
  after do
    Object.send(:remove_const, :AMLintTest)
    Object.send(:remove_const, :Blog)
  end

  it ".to_model should return self, not a proxy object" do
    @m.object_id.must_equal @m.to_model.object_id
  end
  
  it "#to_key should return a key array, or nil" do
    @o.to_key.must_be_nil
    @o.id = 1
    @o.to_key.must_equal [1]
    @o.id = nil
    @o.to_key.must_be_nil

    @c.set_primary_key [:id2, :id]
    @c.freeze
    @o.to_key.must_be_nil
    @o.id = 1
    @o.id2 = 2
    @o.to_key.must_equal [2, 1]
    @o.destroy
    @o.to_key.must_equal [2, 1]
    @o.id = nil
    @o.to_key.must_be_nil
  end
  
  it "#to_param should return a param string or nil" do
    @o.to_param.must_be_nil
    @o.id = 1
    @o.to_param.must_equal '1'
    @c.set_primary_key [:id2, :id]
    @c.freeze
    @o.id2 = 2
    @o.to_param.must_equal '2-1'
    def @o.to_param_joiner; '|' end
    @o.to_param.must_equal '2|1'
    @o.destroy
    @o.to_param.must_be_nil
  end

  it "#persisted? should return true if the object exists and has not been destroyed" do
    @m.persisted?.must_equal false
    @o.persisted?.must_equal true
    @m.destroy
    @o.destroy
    @m.persisted?.must_equal false
    @o.persisted?.must_equal false
  end

  it "#persisted? should return false if the object is created and the transaction is rolled back" do
    DB.transaction(:rollback=>:always){@m.save}
    @m.persisted?.must_equal false
  end

  it "#to_partial_path should return a path string" do
    @m.to_partial_path.must_equal 'am_lint_tests/am_lint_test'
    Blog::Post.new.to_partial_path.must_equal 'blog/posts/post'
  end

  describe "with unfrozen model class" do
    include ActiveModel::Lint::Tests
  end

  describe "with frozen model class" do
    before do
      @freeze_class = true
    end

    include ActiveModel::Lint::Tests
  end
end
end 
