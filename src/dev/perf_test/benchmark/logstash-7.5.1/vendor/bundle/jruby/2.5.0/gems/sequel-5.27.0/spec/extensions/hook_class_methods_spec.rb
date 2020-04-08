require_relative "spec_helper"

model_class = proc do |klass, &block|
  c = Class.new(klass)
  c.plugin :hook_class_methods
  c.class_eval(&block) if block
  c
end

describe Sequel::Model, "hook_class_methods plugin" do
  before do
    DB.reset
  end
  
  it "should freeze hooks when freezing model class" do
    c = model_class.call Sequel::Model do
      before_save{adds << 'hi'}
    end
    c.freeze
    hooks = c.instance_variable_get(:@hooks)
    hooks.frozen?.must_equal true
    hooks.values.all?(&:frozen?).must_equal true
  end

  deprecated ".hook_blocks method should yield each hook block" do
    c = model_class.call Sequel::Model
    a = []
    c.hook_blocks(:before_save){|b| a << b}
    a.must_equal []

    pr = proc{adds << 'hi'}
    c.before_save(&pr)
    a = []
    c.hook_blocks(:before_save){|b| a << b}
    a.must_equal [pr]

    c.before_save(&pr)
    a = []
    c.hook_blocks(:before_save){|b| a << b}
    a.must_equal [pr, pr]

    a = []
    c.hook_blocks(:after_save){|b| a << b}
    a.must_equal []
  end

  it "should be definable using a block" do
    adds = []
    c = model_class.call Sequel::Model do
      before_save{adds << 'hi'}
    end
    
    c.new.before_save
    adds.must_equal ['hi']
  end
  
  it "should be definable using a method name" do
    adds = []
    c = model_class.call Sequel::Model do
      define_method(:bye){adds << 'bye'}
      before_save :bye
    end
    
    c.new.before_save
    adds.must_equal ['bye']
  end

  it "should be additive" do
    adds = []
    c = model_class.call Sequel::Model do
      after_save{adds << 'hyiyie'}
      after_save{adds << 'byiyie'}
    end

    c.new.after_save
    adds.must_equal ['hyiyie', 'byiyie']
  end
  
  it "before hooks should run in reverse order" do
    adds = []
    c = model_class.call Sequel::Model do
      before_save{adds << 'hyiyie'}
      before_save{adds << 'byiyie'}
    end
    
    c.new.before_save
    adds.must_equal ['byiyie', 'hyiyie']
  end

  it "should not be additive if the method or tag already exists" do
    adds = []
    c = model_class.call Sequel::Model do
      define_method(:bye){adds << 'bye'}
      before_save :bye
      before_save :bye
    end
    
    c.new.before_save
    adds.must_equal ['bye']

    adds = []
    d = model_class.call Sequel::Model do
      before_save(:bye){adds << 'hyiyie'}
      before_save(:bye){adds << 'byiyie'}
    end
    
    d.new.before_save
    adds.must_equal ['byiyie']

    adds = []
    e = model_class.call Sequel::Model do
      define_method(:bye){adds << 'bye'}
      before_save :bye
      before_save(:bye){adds << 'byiyie'}
    end
    
    e.new.before_save
    adds.must_equal ['byiyie']

    adds = []
    e = model_class.call Sequel::Model do
      define_method(:bye){adds << 'bye'}
      before_save(:bye){adds << 'byiyie'}
      before_save :bye
    end
    
    e.new.before_save
    adds.must_equal ['bye']
  end
  
  it "should be inheritable" do
    adds = []
    a = model_class.call Sequel::Model do
      after_save{adds << '123'}
    end
    
    b = Class.new(a)
    b.class_eval do
      after_save{adds << '456'}
      after_save{adds << '789'}
    end
    
    b.new.after_save
    adds.must_equal ['123', '456', '789']
  end
  
  it "should be overridable in descendant classes" do
    adds = []
    a = model_class.call Sequel::Model do
      before_save{adds << '123'}
    end
    
    b = Class.new(a)
    b.class_eval do
      define_method(:before_save){adds << '456'}
    end
    
    a.new.before_save
    adds.must_equal ['123']
    adds = []
    b.new.before_save
    adds.must_equal ['456']
  end
  
  it "should stop processing if a before hook calls cancel_action" do
    flag = true
    adds = []
    
    a = model_class.call Sequel::Model(:items) do
      before_save{adds << 'cruel'; cancel_action if flag == false}
      before_save{adds << 'blah'; cancel_action if flag == false}
    end
    
    a.raise_on_save_failure = false
    a.new.save
    adds.must_equal ['blah', 'cruel']

    # chain should not break on nil
    adds = []
    flag = nil
    a.new.save
    adds.must_equal ['blah', 'cruel']
    
    adds = []
    flag = false
    a.new.save
    adds.must_equal ['blah']
    
    b = Class.new(a)
    b.class_eval do
      before_save{adds << 'mau'}
    end
    
    adds = []
    b.new.save
    adds.must_equal ['mau', 'blah']
  end
end

describe "Model#before_create && Model#after_create" do
  before do
    DB.reset

    @c = model_class.call Sequel::Model(:items)  do
      columns :x
      no_primary_key
      
      after_create {DB << "BLAH after"}
    end
  end
  
  it "should be called around new record creation" do
    @c.before_create {DB << "BLAH before"}
    @c.create(:x => 2)
    DB.sqls.must_equal ['BLAH before', 'INSERT INTO items (x) VALUES (2)', 'BLAH after']
  end

  it ".create should cancel the save and raise an error if before_create calls cancel_action and raise_on_save_failure is true" do
    @c.before_create{cancel_action}
    proc{@c.create(:x => 2)}.must_raise(Sequel::HookFailed)
    DB.sqls.must_equal []
  end

  it ".create should cancel the save and return nil if before_create calls cancel_action and raise_on_save_failure is false" do
    @c.before_create{cancel_action}
    @c.raise_on_save_failure = false
    @c.create(:x => 2).must_be_nil
    DB.sqls.must_equal []
  end
end

describe "Model#before_update && Model#after_update" do
  before do
    DB.reset

    @c = model_class.call(Sequel::Model(:items)) do
      after_update {DB << "BLAH after"}
    end
  end
  
  it "should be called around record update" do
    @c.before_update {DB << "BLAH before"}
    m = @c.load(:id => 2233, :x=>123)
    m.save
    DB.sqls.must_equal ['BLAH before', 'UPDATE items SET x = 123 WHERE (id = 2233)', 'BLAH after']
  end

  it "#save should cancel the save and raise an error if before_update calls cancel_action and raise_on_save_failure is true" do
    @c.before_update{cancel_action}
    proc{@c.load(:id => 2233).save}.must_raise(Sequel::HookFailed)
    DB.sqls.must_equal []
  end

  it "#save should cancel the save and return nil if before_update calls cancel_action and raise_on_save_failure is false" do
    @c.before_update{cancel_action}
    @c.raise_on_save_failure = false
    @c.load(:id => 2233).save.must_be_nil
    DB.sqls.must_equal []
  end
end

describe "Model#before_save && Model#after_save" do
  before do
    DB.reset

    @c = model_class.call(Sequel::Model(:items)) do
      columns :x
      after_save {DB << "BLAH after"}
    end
  end
  
  it "should be called around record update" do
    @c.before_save {DB << "BLAH before"}
    m = @c.load(:id => 2233, :x=>123)
    m.save
    DB.sqls.must_equal ['BLAH before', 'UPDATE items SET x = 123 WHERE (id = 2233)', 'BLAH after']
  end
  
  it "should be called around record creation" do
    @c.before_save {DB << "BLAH before"}
    @c.no_primary_key
    @c.create(:x => 2)
    DB.sqls.must_equal ['BLAH before', 'INSERT INTO items (x) VALUES (2)', 'BLAH after']
  end

  it "#save should cancel the save and raise an error if before_save calls cancel_action and raise_on_save_failure is true" do
    @c.before_save{cancel_action}
    proc{@c.load(:id => 2233).save}.must_raise(Sequel::HookFailed)
    DB.sqls.must_equal []
  end

  it "#save should cancel the save and return nil if before_save calls cancel_action and raise_on_save_failure is false" do
    @c.before_save{cancel_action}
    @c.raise_on_save_failure = false
    @c.load(:id => 2233).save.must_be_nil
    DB.sqls.must_equal []
  end
end

describe "Model#before_destroy && Model#after_destroy" do
  before do
    DB.reset

    @c = model_class.call(Sequel::Model(:items)) do
      after_destroy {DB << "BLAH after"}
    end
  end
  
  it "should be called around record destruction" do
    @c.before_destroy {DB << "BLAH before"}
    m = @c.load(:id => 2233)
    m.destroy
    DB.sqls.must_equal ['BLAH before', "DELETE FROM items WHERE id = 2233", 'BLAH after']
  end

  it "#destroy should cancel the destroy and raise an error if before_destroy calls cancel_action and raise_on_save_failure is true" do
    @c.before_destroy{cancel_action}
    proc{@c.load(:id => 2233).destroy}.must_raise(Sequel::HookFailed)
    DB.sqls.must_equal []
  end

  it "#destroy should cancel the destroy and return nil if before_destroy calls cancel_action and raise_on_save_failure is false" do
    @c.before_destroy{cancel_action}
    @c.raise_on_save_failure = false
    @c.load(:id => 2233).destroy.must_be_nil
    DB.sqls.must_equal []
  end
end

describe "Model#before_validation && Model#after_validation" do
  before do
    DB.reset

    @c = model_class.call(Sequel::Model(:items)) do
      plugin :validation_class_methods
      after_validation{DB << "BLAH after"}

      def self.validate(o)
        o.errors.add(:id, 'not valid') unless o[:id] == 2233
      end
      columns :id
    end
  end
  
  it "should be called around validation" do
    @c.before_validation{DB << "BLAH before"}
    m = @c.load(:id => 2233)
    m.must_be :valid?
    DB.sqls.must_equal ['BLAH before', 'BLAH after']

    DB.sqls.clear
    m = @c.load(:id => 22)
    m.wont_be :valid?
    DB.sqls.must_equal ['BLAH before', 'BLAH after']
  end

  it "should be called when calling save" do
    @c.before_validation{DB << "BLAH before"}
    m = @c.load(:id => 2233, :x=>123)
    m.save.must_equal m
    DB.sqls.must_equal ['BLAH before', 'BLAH after', 'UPDATE items SET x = 123 WHERE (id = 2233)']

    DB.sqls.clear
    m = @c.load(:id => 22)
    m.raise_on_save_failure = false
    m.save.must_be_nil
    DB.sqls.must_equal ['BLAH before', 'BLAH after']
  end

  it "#save should cancel the save and raise an error if before_validation calls cancel_action and raise_on_save_failure is true" do
    @c.before_validation{cancel_action}
    proc{@c.load(:id => 2233).save}.must_raise(Sequel::HookFailed)
    DB.sqls.must_equal []
  end

  it "#save should cancel the save and return nil if before_validation calls cancel_action and raise_on_save_failure is false" do
    @c.before_validation{cancel_action}
    @c.raise_on_save_failure = false
    @c.load(:id => 2233).save.must_be_nil
    DB.sqls.must_equal []
  end
end

describe "Model.has_hooks?" do
  before do
    @c = model_class.call(Sequel::Model(:items))
  end
  
  it "should return false if no hooks are defined" do
    @c.has_hooks?(:before_save).must_equal false
  end
  
  it "should return true if hooks are defined" do
    @c.before_save {'blah'}
    @c.has_hooks?(:before_save).must_equal true
  end
  
  it "should return true if hooks are inherited" do
    @d = Class.new(@c)
    @d.has_hooks?(:before_save).must_equal false
  end
end
