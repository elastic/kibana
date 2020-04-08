require_relative "spec_helper"

describe "InstanceHooks plugin" do
  def r(x=nil)
    @r << x
    yield if block_given?
    x
  end
  
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.plugin :instance_hooks
    @c.raise_on_save_failure = false
    @o = @c.new
    @x = @c.load({:id=>1})
    @r = []
  end
  
  it "should support before_create_hook and after_create_hook" do
    @o.after_create_hook{r 1}
    @o.before_create_hook{r 2}
    @o.after_create_hook{r 3}
    @o.before_create_hook{r 4}
    @o.save.wont_equal nil
    @r.must_equal [4, 2, 1, 3]
  end

  it "should cancel the save if before_create_hook block calls cancel_action" do
    @o.after_create_hook{r 1}
    @o.before_create_hook{r{@o.cancel_action}}
    @o.before_create_hook{r 4}
    @o.save.must_be_nil
    @r.must_equal [4, nil]
    @r.clear
    @o.save.must_be_nil
    @r.must_equal [4, nil]
  end

  it "should support before_update_hook and after_update_hook" do
    @x.after_update_hook{r 1}
    @x.before_update_hook{r 2}
    @x.after_update_hook{r 3}
    @x.before_update_hook{r 4}
    @x.save.wont_equal nil
    @r.must_equal [4, 2, 1, 3]
    @x.save.wont_equal nil
    @r.must_equal [4, 2, 1, 3]
  end

  it "should cancel the save if before_update_hook block calls cancel_action" do
    @x.after_update_hook{r 1}
    @x.before_update_hook{r{@x.cancel_action}}
    @x.before_update_hook{r 4}
    @x.save.must_be_nil
    @r.must_equal [4, nil]
    @r.clear
    @x.save.must_be_nil
    @r.must_equal [4, nil]
  end

  it "should support before_save_hook and after_save_hook" do
    @o.after_save_hook{r 1}
    @o.before_save_hook{r 2}
    @o.after_save_hook{r 3}
    @o.before_save_hook{r 4}
    @o.save.wont_equal nil
    @r.must_equal [4, 2, 1, 3]
    @r.clear
    
    @x.after_save_hook{r 1}
    @x.before_save_hook{r 2}
    @x.after_save_hook{r 3}
    @x.before_save_hook{r 4}
    @x.save.wont_equal nil
    @r.must_equal [4, 2, 1, 3]
    @x.save.wont_equal nil
    @r.must_equal [4, 2, 1, 3]
  end

  it "should cancel the save if before_save_hook block calls cancel_action" do
    @x.after_save_hook{r 1}
    @x.before_save_hook{r{@x.cancel_action}}
    @x.before_save_hook{r 4}
    @x.save.must_be_nil
    @r.must_equal [4, nil]
    @r.clear
    
    @x.after_save_hook{r 1}
    @x.before_save_hook{r{@x.cancel_action}}
    @x.before_save_hook{r 4}
    @x.save.must_be_nil
    @r.must_equal [4, nil]
    @r.clear
    @x.save.must_be_nil
    @r.must_equal [4, nil]
  end

  it "should support before_destroy_hook and after_destroy_hook" do
    @x.after_destroy_hook{r 1}
    @x.before_destroy_hook{r 2}
    @x.after_destroy_hook{r 3}
    @x.before_destroy_hook{r 4}
    @x.destroy.wont_equal nil
    @r.must_equal [4, 2, 1, 3]
  end

  it "should cancel the destroy if before_destroy_hook block calls cancel_action" do
    @x.after_destroy_hook{r 1}
    @x.before_destroy_hook{r{@x.cancel_action}}
    @x.before_destroy_hook{r 4}
    @x.destroy.must_be_nil
    @r.must_equal [4, nil]
  end

  it "should support before_validation_hook and after_validation_hook" do
    @o.after_validation_hook{r 1}
    @o.before_validation_hook{r 2}
    @o.after_validation_hook{r 3}
    @o.before_validation_hook{r 4}
    @o.valid?.must_equal true
    @r.must_equal [4, 2, 1, 3]
  end

  it "should cancel the save if before_validation_hook block calls cancel_action" do
    @o.after_validation_hook{r 1}
    @o.before_validation_hook{r{@o.cancel_action}}
    @o.before_validation_hook{r 4}
    @o.valid?.must_equal false
    @r.must_equal [4, nil]
    @r.clear
    @o.valid?.must_equal false
    @r.must_equal [4, nil]
  end

  it "should clear only related hooks on successful create" do
    @o.after_destroy_hook{r 1}
    @o.before_destroy_hook{r 2}
    @o.after_update_hook{r 3}
    @o.before_update_hook{r 4}
    @o.before_save_hook{r 5}
    @o.after_save_hook{r 6}
    @o.before_create_hook{r 7}
    @o.after_create_hook{r 8}
    @o.save.wont_equal nil
    @r.must_equal [5, 7, 8, 6]
    @o.instance_variable_set(:@new, false)
    @o.save.wont_equal nil
    @r.must_equal [5, 7, 8, 6, 4, 3]
    @o.save.wont_equal nil
    @r.must_equal [5, 7, 8, 6, 4, 3]
    @o.destroy
    @r.must_equal [5, 7, 8, 6, 4, 3, 2, 1]
  end

  it "should clear only related hooks on successful update" do
    @x.after_destroy_hook{r 1}
    @x.before_destroy_hook{r 2}
    @x.before_update_hook{r 3}
    @x.after_update_hook{r 4}
    @x.before_save_hook{r 5}
    @x.after_save_hook{r 6}
    @x.save.wont_equal nil
    @r.must_equal [5, 3, 4, 6]
    @x.save.wont_equal nil
    @r.must_equal [5, 3, 4, 6]
    @x.destroy
    @r.must_equal [5, 3, 4, 6, 2, 1]
  end

  it "should clear only related hooks on successful destroy" do
    @x.after_destroy_hook{r 1}
    @x.before_destroy_hook{r 2}
    @x.before_update_hook{r 3}
    @x.before_save_hook{r 4}
    @x.destroy
    @r.must_equal [2, 1]
    @x.save.wont_equal nil
    @r.must_equal [2, 1, 4, 3]
  end

  it "should not clear validations hooks on successful save" do
    @x.after_validation_hook{@x.errors.add(:id, 'a') if @x.id == 1; r 1}
    @x.before_validation_hook{r 2}
    @x.save.must_be_nil
    @r.must_equal [2, 1]
    @x.save.must_be_nil
    @r.must_equal [2, 1, 2, 1]
    @x.id = 2
    @x.save.must_equal @x
    @r.must_equal [2, 1, 2, 1, 2, 1]
    @x.save.must_equal @x
    @r.must_equal [2, 1, 2, 1, 2, 1]
  end

  it "should not allow addition of instance hooks to frozen instances" do
    @x.after_destroy_hook{r 1}
    @x.before_destroy_hook{r 2}
    @x.before_update_hook{r 3}
    @x.before_save_hook{r 4}
    @x.freeze
    proc{@x.after_destroy_hook{r 1}}.must_raise(Sequel::Error)
    proc{@x.before_destroy_hook{r 2}}.must_raise(Sequel::Error)
    proc{@x.before_update_hook{r 3}}.must_raise(Sequel::Error)
    proc{@x.before_save_hook{r 4}}.must_raise(Sequel::Error)
  end
end

describe "InstanceHooks plugin with transactions" do
  before do
    @db = Sequel.mock(:numrows=>1)
    @c = Class.new(Sequel::Model(@db[:items])) do
      attr_accessor :rb
      def after_save
        super
        db.execute('as')
        raise Sequel::Rollback if rb
      end
      def after_destroy
        super
        db.execute('ad')
        raise Sequel::Rollback if rb
      end
    end
    @c.use_transactions = true
    @c.plugin :instance_hooks
    @o = @c.load({:id=>1})
    @or = @c.load({:id=>1})
    @or.rb = true
    @r = []
    @db.sqls
  end
  
  it "should have *_hook methods return self "do
    @o.before_destroy_hook{r 1}.must_be_same_as(@o)
    @o.before_validation_hook{r 1}.must_be_same_as(@o)
    @o.before_save_hook{r 1}.must_be_same_as(@o)
    @o.before_update_hook{r 1}.must_be_same_as(@o)
    @o.before_create_hook{r 1}.must_be_same_as(@o)

    @o.after_destroy_hook{r 1}.must_be_same_as(@o)
    @o.after_validation_hook{r 1}.must_be_same_as(@o)
    @o.after_save_hook{r 1}.must_be_same_as(@o)
    @o.after_update_hook{r 1}.must_be_same_as(@o)
    @o.after_create_hook{r 1}.must_be_same_as(@o)
  end
end
