require_relative "spec_helper"

describe Sequel::Model, "single table inheritance plugin" do
  before do
    class ::StiTest < Sequel::Model
      columns :id, :kind, :blah
      plugin :single_table_inheritance, :kind
    end 
    class ::StiTestSub1 < StiTest
    end 
    class ::StiTestSub2 < StiTest
    end 
    @ds = StiTest.dataset
    DB.reset
  end
  after do
    Object.send(:remove_const, :StiTestSub1)
    Object.send(:remove_const, :StiTestSub2)
    Object.send(:remove_const, :StiTest)
  end

  describe ".sti_load" do
    it "should load instances of the correct type" do
      StiTest.sti_load(:id => 3).must_be_instance_of StiTest
      StiTest.sti_load(:id => 3, :kind => 'StiTestSub1').must_be_instance_of StiTestSub1
      StiTest.sti_load(:id => 3, :kind => 'StiTestSub2').must_be_instance_of StiTestSub2
    end
  end

  describe ".sti_class_from_sti_key" do
    it "should load the correct subclass based on the key" do
      StiTest.sti_class_from_sti_key('StiTest').must_equal StiTest
      StiTest.sti_class_from_sti_key('StiTestSub1').must_equal StiTestSub1
      StiTest.sti_class_from_sti_key('StiTestSub2').must_equal StiTestSub2
    end
  end

  it "should freeze sti metadata when freezing model class" do
    StiTest.freeze
    StiTest.sti_dataset.frozen?.must_equal true

    StiTestSub1.freeze
    StiTestSub1.sti_key_array.frozen?.must_equal true

    proc{class ::StiTestSub1Sub1 < StiTestSub1; end}.must_raise RuntimeError, TypeError
  end

  it "should have simple_table = nil" do
    StiTest.simple_table.must_equal "sti_tests"
    StiTestSub1.simple_table.must_be_nil
  end
  
  it "should allow changing the inheritance column via a plugin :single_table_inheritance call" do
    StiTest.plugin :single_table_inheritance, :blah
    Object.send(:remove_const, :StiTestSub1)
    Object.send(:remove_const, :StiTestSub2)
    class ::StiTestSub1 < StiTest; end 
    class ::StiTestSub2 < StiTest; end 
    StiTest.dataset = StiTest.dataset.with_fetch([{:blah=>'StiTest'}, {:blah=>'StiTestSub1'}, {:blah=>'StiTestSub2'}])
    StiTest.all.collect{|x| x.class}.must_equal [StiTest, StiTestSub1, StiTestSub2]
    StiTest.dataset.sql.must_equal "SELECT * FROM sti_tests"
    StiTestSub1.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.blah IN ('StiTestSub1'))"
    StiTestSub2.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.blah IN ('StiTestSub2'))"
  end 
  
  it "should return rows with the correct class based on the polymorphic_key value" do
    StiTest.dataset = StiTest.dataset.with_fetch([{:kind=>'StiTest'}, {:kind=>'StiTestSub1'}, {:kind=>'StiTestSub2'}])
    StiTest.all.collect{|x| x.class}.must_equal [StiTest, StiTestSub1, StiTestSub2]
  end 

  it "should return rows with the correct class based on the polymorphic_key value when retreiving by primary key" do
    StiTest.dataset = StiTest.dataset.with_fetch([{:kind=>'StiTestSub1'}])
    StiTest[1].class.must_equal StiTestSub1
  end 

  it "should return rows with the correct class for subclasses based on the polymorphic_key value" do
    class ::StiTestSub1Sub < StiTestSub1; end 
    StiTestSub1.dataset = StiTestSub1.dataset.with_fetch([{:kind=>'StiTestSub1'}, {:kind=>'StiTestSub1Sub'}])
    StiTestSub1.all.collect{|x| x.class}.must_equal [StiTestSub1, StiTestSub1Sub]
  end 

  it "should fallback to the main class if the given class does not exist" do
    StiTest.dataset = StiTest.dataset.with_fetch(:kind=>'StiTestSub3')
    StiTest.all.collect{|x| x.class}.must_equal [StiTest]
  end

  it "should inherit dataset_modules correctly in subclass" do
    StiTest.dataset_module{def foo; 1; end}
    Object.send(:remove_const, :StiTestSub1)
    Object.send(:remove_const, :StiTestSub2)
    class ::StiTestSub1 < StiTest; end 
    StiTestSub1.dataset_module{def bar; 2; end}
    class ::StiTestSub2 < StiTestSub1; end 
    StiTestSub2.dataset_module{def baz; 3; end}

    StiTest.dataset.foo.must_equal 1
    proc{StiTest.dataset.bar}.must_raise NoMethodError
    proc{StiTest.dataset.baz}.must_raise NoMethodError
    StiTestSub1.dataset.foo.must_equal 1
    StiTestSub1.dataset.bar.must_equal 2
    proc{StiTestSub1.dataset.baz}.must_raise NoMethodError
    StiTestSub2.dataset.foo.must_equal 1
    StiTestSub2.dataset.bar.must_equal 2
    StiTestSub2.dataset.baz.must_equal 3
  end

  it "should fallback to the main class if the sti_key field is empty or nil without calling constantize" do
    called = false
    StiTest.define_singleton_method(:constantize){|_| called = true}
    StiTest.plugin :single_table_inheritance, :kind
    StiTest.dataset = StiTest.dataset.with_fetch([{:kind=>''}, {:kind=>nil}])
    StiTest.all.collect{|x| x.class}.must_equal [StiTest, StiTest]
    called.must_equal false
  end

  it "should set the model class name when saving" do
    StiTest.new.save
    StiTestSub1.new.save
    StiTestSub2.new.save
    DB.sqls.must_equal ["INSERT INTO sti_tests (kind) VALUES ('StiTest')", "SELECT * FROM sti_tests WHERE id = 10", "INSERT INTO sti_tests (kind) VALUES ('StiTestSub1')", "SELECT * FROM sti_tests WHERE ((sti_tests.kind IN ('StiTestSub1')) AND (id = 10)) LIMIT 1", "INSERT INTO sti_tests (kind) VALUES ('StiTestSub2')", "SELECT * FROM sti_tests WHERE ((sti_tests.kind IN ('StiTestSub2')) AND (id = 10)) LIMIT 1"]
  end

  it "should destroy the model correctly" do
    StiTest.load(:id=>1).destroy
    StiTestSub1.load(:id=>1).destroy
    StiTestSub2.load(:id=>1).destroy
    DB.sqls.must_equal ["DELETE FROM sti_tests WHERE id = 1", "DELETE FROM sti_tests WHERE ((sti_tests.kind IN ('StiTestSub1')) AND (id = 1))", "DELETE FROM sti_tests WHERE ((sti_tests.kind IN ('StiTestSub2')) AND (id = 1))"]
  end

  it "should handle validations on the type column field" do
    o = StiTestSub1.new
    def o.validate
      errors.add(:kind, 'not present') unless kind
    end
    o.valid?.must_equal true
  end

  it "should set type column field even if validations are skipped" do
    StiTestSub1.new.save(:validate=>false)
    DB.sqls.must_equal ["INSERT INTO sti_tests (kind) VALUES ('StiTestSub1')", "SELECT * FROM sti_tests WHERE ((sti_tests.kind IN ('StiTestSub1')) AND (id = 10)) LIMIT 1"]
  end

  it "should override an existing value in the class name field" do
    StiTest.create(:kind=>'StiTestSub1')
    DB.sqls.must_equal ["INSERT INTO sti_tests (kind) VALUES ('StiTestSub1')", "SELECT * FROM sti_tests WHERE id = 10"]
  end

  it "should handle type column with the same name as existing method names" do
    StiTest.plugin :single_table_inheritance, :type
    StiTest.columns :id, :type
    StiTest.create
    DB.sqls.must_equal ["INSERT INTO sti_tests (type) VALUES ('StiTest')", "SELECT * FROM sti_tests WHERE id = 10"]
  end

  it "should add a filter to model datasets inside subclasses hook to only retreive objects with the matching key" do
    StiTest.dataset.sql.must_equal "SELECT * FROM sti_tests"
    StiTestSub1.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub1'))"
    StiTestSub2.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub2'))"
  end

  it "should add a correct filter for multiple levels of subclasses" do
    class ::StiTestSub1A < StiTestSub1; end
    StiTestSub1.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub1', 'StiTestSub1A'))"
    StiTestSub1A.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub1A'))"
    class ::StiTestSub2A < StiTestSub2; end
    StiTestSub2.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub2', 'StiTestSub2A'))"
    StiTestSub2A.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub2A'))"
    class ::StiTestSub1B < StiTestSub1A; end
    StiTestSub1.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub1', 'StiTestSub1A', 'StiTestSub1B'))"
    StiTestSub1A.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub1A', 'StiTestSub1B'))"
    StiTestSub1B.dataset.sql.must_equal "SELECT * FROM sti_tests WHERE (sti_tests.kind IN ('StiTestSub1B'))"
  end
  
  it "should work correctly with the :caching plugin" do
    cache_class = Class.new(Hash) do
      attr_accessor :ttl
      def set(k, v, ttl); self[k] = v; @ttl = ttl; end
      def get(k); self[k]; end
    end
    cache = cache_class.new

    StiTest.plugin :caching, cache
    def StiTest.cache_key_prefix; "stitest" end
    c2 = Class.new StiTest
    c2.cache_key(:id).must_equal StiTest.cache_key(:id)

    obj2 = c2.new
    obj2.values[:x] = 2
    obj2.save
    c2[obj2.id]
    c2.cache_get_pk(obj2.id).values.must_equal StiTest.cache_get_pk(obj2.id).values
    obj2.save
    c2.cache_get_pk(obj2.id).must_be_nil
    StiTest.cache_get_pk(obj2.id).must_be_nil
  end

  describe "with custom options" do
    before do
      class ::StiTest2 < Sequel::Model
        columns :id, :kind
        def _save_refresh; end
      end
    end
    after do
      Object.send(:remove_const, :StiTest2)
      Object.send(:remove_const, :StiTest3) if defined?(StiTest3)
      Object.send(:remove_const, :StiTest4) if defined?(StiTest4)
    end

    it "should freeze sti key and model map if given as hashes when freezing model class" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>{0=>StiTest2, 1=>:StiTest3, 2=>'StiTest4'}, :key_map=>{StiTest2=>4, 'StiTest3'=>5, 'StiTest4'=>6}
      StiTest2.freeze
      StiTest2.sti_key_map.frozen?.must_equal true
      StiTest2.sti_model_map.frozen?.must_equal true
    end

    it "should have working row_proc if using set_dataset in subclass to remove columns" do
      StiTest2.plugin :single_table_inheritance, :kind
      class ::StiTest3 < ::StiTest2
        set_dataset(dataset.select(*(columns - [:blah])))
      end
      class ::StiTest4 < ::StiTest3; end
      StiTest3.dataset = StiTest3.dataset.with_fetch(:id=>1, :kind=>'StiTest4')
      StiTest3[1].must_equal StiTest4.load(:id=>1, :kind=>'StiTest4')
    end

    it "should work with custom procs with strings" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>proc{|v| v == 1 ? 'StiTest3' : 'StiTest4'}, :key_map=>proc{|klass| klass.name == 'StiTest3' ? 1 : 2}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
      StiTest2.dataset.row_proc.call(:kind=>0).must_be_instance_of(StiTest4)
      StiTest2.dataset.row_proc.call(:kind=>1).must_be_instance_of(StiTest3)
      StiTest2.dataset.row_proc.call(:kind=>2).must_be_instance_of(StiTest4)

      StiTest2.create.kind.must_equal 2
      StiTest3.create.kind.must_equal 1
      StiTest4.create.kind.must_equal 2
    end

    it "should work with custom procs with symbols" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>proc{|v| v == 1 ? :StiTest3 : :StiTest4}, :key_map=>proc{|klass| klass.name == 'StiTest3' ? 1 : 2}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
      StiTest2.dataset.row_proc.call(:kind=>0).must_be_instance_of(StiTest4)
      StiTest2.dataset.row_proc.call(:kind=>1).must_be_instance_of(StiTest3)
      StiTest2.dataset.row_proc.call(:kind=>2).must_be_instance_of(StiTest4)

      StiTest2.create.kind.must_equal 2
      StiTest3.create.kind.must_equal 1
      StiTest4.create.kind.must_equal 2
    end

    it "should work with custom hashes" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>{0=>StiTest2, 1=>:StiTest3, 2=>'StiTest4'}, :key_map=>{StiTest2=>4, 'StiTest3'=>5, 'StiTest4'=>6}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
      StiTest2.dataset.row_proc.call(:kind=>0).must_be_instance_of(StiTest2)
      StiTest2.dataset.row_proc.call(:kind=>1).must_be_instance_of(StiTest3)
      StiTest2.dataset.row_proc.call(:kind=>2).must_be_instance_of(StiTest4)
      StiTest3.sti_model_map.must_equal StiTest2.sti_model_map

      StiTest2.create.kind.must_equal 4
      StiTest3.create.kind.must_equal 5
      StiTest4.create.kind.must_equal 6

      class ::StiTest5 < ::StiTest4; end
      StiTest5.create.kind.must_be_nil
    end

    it "should infer key_map from model_map if provided as a hash" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>{0=>StiTest2, 1=>'StiTest3', 2=>:StiTest4}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
      StiTest2.dataset.row_proc.call(:kind=>0).must_be_instance_of(StiTest2)
      StiTest2.dataset.row_proc.call(:kind=>1).must_be_instance_of(StiTest3)
      StiTest2.dataset.row_proc.call(:kind=>2).must_be_instance_of(StiTest4)

      StiTest2.create.kind.must_equal 0
      StiTest3.create.kind.must_equal 1
      StiTest4.create.kind.must_equal 2
    end

    it "should raise exceptions if a bad model value is used" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>{0=>1,1=>1.5, 2=>Date.today}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
      proc{StiTest2.dataset.row_proc.call(:kind=>0)}.must_raise(Sequel::Error)
      proc{StiTest2.dataset.row_proc.call(:kind=>1)}.must_raise(Sequel::Error)
      proc{StiTest2.dataset.row_proc.call(:kind=>2)}.must_raise(Sequel::Error)
    end

    it "should work with non-bijective mappings" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>{0=>'StiTest3', 1=>'StiTest3', 2=>'StiTest4'}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
      StiTest2.dataset.row_proc.call(:kind=>0).must_be_instance_of(StiTest3)
      StiTest2.dataset.row_proc.call(:kind=>1).must_be_instance_of(StiTest3)
      StiTest2.dataset.row_proc.call(:kind=>2).must_be_instance_of(StiTest4)

      [0,1].must_include(StiTest3.create.kind)
      StiTest4.create.kind.must_equal 2
    end

    it "should work with non-bijective mappings and key map procs" do
      StiTest2.plugin :single_table_inheritance, :kind,
        :key_map=>proc{|model| model.to_s == 'StiTest4' ? 2 : [0,1] }
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end

      StiTest2.dataset.sql.must_equal "SELECT * FROM sti_test2s"
      StiTest3.dataset.sql.must_equal "SELECT * FROM sti_test2s WHERE (sti_test2s.kind IN (0, 1))"
      StiTest4.dataset.sql.must_equal "SELECT * FROM sti_test2s WHERE (sti_test2s.kind IN (2))"
    end

    it "should create correct sql with non-bijective mappings" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>{0=>'StiTest3', 1=>'StiTest3', 2=>'StiTest4'}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
    
      StiTest2.dataset.sql.must_equal "SELECT * FROM sti_test2s"
      ["SELECT * FROM sti_test2s WHERE (sti_test2s.kind IN (0, 1))",
       "SELECT * FROM sti_test2s WHERE (sti_test2s.kind IN (1, 0))"].must_include(StiTest3.dataset.sql)
    end

    it "should destroy the model correctly" do
      StiTest2.plugin :single_table_inheritance, :kind, :model_map=>{'sti3'=>'StiTest3', 'sti3b'=>'StiTest3', 'sti4'=>'StiTest4'}
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end
      StiTest2.load(:id=>1).destroy
      StiTest3.load(:id=>1).destroy
      sqls = DB.sqls
      sqls.shift.must_equal "DELETE FROM sti_test2s WHERE id = 1"
      ["DELETE FROM sti_test2s WHERE ((sti_test2s.kind IN ('sti3', 'sti3b')) AND (id = 1))",
       "DELETE FROM sti_test2s WHERE ((sti_test2s.kind IN ('sti3b', 'sti3')) AND (id = 1))"].must_include(sqls.pop)
      sqls.must_equal []
    end

    it "should honor a :key_chooser" do
      StiTest2.plugin :single_table_inheritance, :kind, :key_chooser => proc{|inst| inst.model.to_s.downcase }
      class ::StiTest3 < ::StiTest2; end
      class ::StiTest4 < ::StiTest2; end

      StiTest3.create.kind.must_equal 'stitest3'
      StiTest4.create.kind.must_equal 'stitest4'
    end
  end
end
