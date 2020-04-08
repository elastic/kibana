require_relative "spec_helper"

describe "Model#values" do
  before do
    @c = Class.new(Sequel::Model(:items))
  end

  it "should return the hash of model values" do
    hash = {:x=>1}
    @c.load(hash).values.must_be_same_as(hash)
  end

  it "should be aliased as to_hash" do
    hash = {:x=>1}
    @c.load(hash).to_hash.must_be_same_as(hash)
  end
end

describe "Model#get_column_value and set_column_value" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.columns :x
    @o = @c.load(:x=>1)
  end

  it "should get and set column values" do
    @o.get_column_value(:x).must_equal 1
    @o.set_column_value(:x=, 2)
    @o.get_column_value(:x).must_equal 2
    @o.x.must_equal 2
  end
end

describe "Model#save server use" do
  before do
    @db = Sequel.mock(:autoid=>proc{|sql| 10}, :fetch=>{:x=>1, :id=>10}, :numrows=>1, :servers=>{:blah=>{}, :read_only=>{}})
    @c = Class.new(Sequel::Model(@db[:items]))
    @c.columns :id, :x, :y
    @c.dataset.columns(:id, :x, :y)
    @db.sqls
  end

  it "should use the :default server if the model doesn't have one already specified" do
    @c.new(:x=>1).save.must_equal @c.load(:x=>1, :id=>10)
    @db.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", 'SELECT * FROM items WHERE (id = 10) LIMIT 1']
  end

  it "should use the model's server if the model has one already specified" do
    @c.dataset = @c.dataset.server(:blah)
    @c.new(:x=>1).save.must_equal @c.load(:x=>1, :id=>10)
    @db.sqls.must_equal ["INSERT INTO items (x) VALUES (1) -- blah", 'SELECT * FROM items WHERE (id = 10) LIMIT 1 -- blah']
  end

  it "should use transactions on the correct server"  do
    @c.use_transactions = true
    @c.dataset = @c.dataset.server(:blah)
    @c.new(:x=>1).save.must_equal @c.load(:x=>1, :id=>10)
    @db.sqls.must_equal ["BEGIN -- blah", "INSERT INTO items (x) VALUES (1) -- blah", 'SELECT * FROM items WHERE (id = 10) LIMIT 1 -- blah', 'COMMIT -- blah']

    o = @c.load(:id=>1)
    o.x = 2
    o.this
    o.save
    @db.sqls.must_equal ["BEGIN -- blah", "UPDATE items SET x = 2 WHERE (id = 1) -- blah", 'COMMIT -- blah']
  end
end

describe "Model#save" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      columns :id, :x, :y
    end
    @c.dataset = @c.dataset.with_autoid(13)
    DB.reset
  end
  
  it "should insert a record for a new model instance" do
    o = @c.new(:x => 1)
    o.save
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 13"]
  end

  it "should raise if the object can't be refreshed after save" do
    o = @c.new(:x => 1)
    @c.dataset = @c.dataset.with_fetch([])
    proc{o.save}.must_raise(Sequel::NoExistingObject)
  end

  it "should use dataset's insert_select method if present" do
    @c.dataset = @c.dataset.with_fetch(:y=>2).with_extend do
      def supports_insert_select?; true end
      def insert_select(hash)
        with_sql_first("INSERT INTO items (y) VALUES (2) RETURNING *")
      end
    end
    o = @c.new(:x => 1)
    o.save
    
    o.values.must_equal(:y=>2)
    DB.sqls.must_equal ["INSERT INTO items (y) VALUES (2) RETURNING *"]
  end

  it "should issue regular insert query if insert_select returns nil" do
    @c.dataset = @c.dataset.with_fetch(:id=>4, :x=>2).with_autoid(4).with_extend do
      def supports_insert_select?; true end
      def insert_select(hash)
      end
    end
    o = @c.new(:x => 1)
    o.save
    
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 4"]
    o.values.must_equal(:id=>4, :x=>2)
  end

  it "should assume insert statement already ran if insert_select returns false" do
    @c.dataset = @c.dataset.with_fetch(:y=>2).with_extend do
      def supports_insert_select?; true end
      def insert_select(hash)
        with_sql_first("INSERT INTO items (y) VALUES (2) RETURNING *")
        false
      end
    end
    o = @c.new(:x => 1)
    o.save
    
    o.values.must_equal(:x=>1)
    DB.sqls.must_equal ["INSERT INTO items (y) VALUES (2) RETURNING *"]
  end

  it "should not use dataset's insert_select method if specific columns are selected" do
    @c.dataset = @c.dataset.select(:y).with_extend{def insert_select(*) raise; end}
    @c.new(:x => 1).save
  end

  it "should use dataset's insert_select method if the dataset uses returning, even if specific columns are selected" do
    @c.dataset = @c.dataset.select(:y).with_fetch(:y=>2).with_extend do
      def supports_returning?(_) true end
      def supports_insert_select?; true end
      def insert_select(hash)
        with_sql_first("INSERT INTO items (y) VALUES (2) RETURNING y")
      end
    end.returning(:y)
    DB.reset
    o = @c.new(:x => 1)
    o.save
    
    o.values.must_equal(:y=>2)
    DB.sqls.must_equal ["INSERT INTO items (y) VALUES (2) RETURNING y"]
  end

  it "should use value returned by insert as the primary key and refresh the object" do
    o = @c.new(:x => 11)
    o.save
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (11)", "SELECT * FROM items WHERE id = 13"]
  end

  it "should allow you to skip refreshing by overridding _save_refresh" do
    @c.send(:define_method, :_save_refresh){}
    @c.create(:x => 11)
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (11)"]
  end

  it "should work correctly for inserting a record without a primary key" do
    @c.no_primary_key
    o = @c.new(:x => 11)
    o.save
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (11)"]
  end

  it "should set the autoincrementing_primary_key value to the value returned by insert" do
    @c.unrestrict_primary_key
    @c.set_primary_key [:x, :y]
    o = @c.new(:x => 11)
    def o.autoincrementing_primary_key() :y end
    o.save
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (11)",
      'SELECT * FROM items WHERE ((x = 11) AND (y = 13)) LIMIT 1']
  end

  it "should update a record for an existing model instance" do
    o = @c.load(:id => 3, :x => 1)
    o.save
    DB.sqls.must_equal ["UPDATE items SET x = 1 WHERE (id = 3)"]
  end
  
  it "should raise a NoExistingObject exception if the dataset update call doesn't return 1, unless require_modification is false" do
    i = 0
    @c.dataset = @c.dataset.with_extend{define_method(:numrows){i}}
    o = @c.load(:id => 3, :x => 1)
    proc{o.save}.must_raise(Sequel::NoExistingObject)
    i = 2
    proc{o.save}.must_raise(Sequel::NoExistingObject)
    i = 1
    o.save
    
    o.require_modification = false
    i = 0
    o.save
    i = 2
    o.save
  end
  
  it "should respect the :columns option to specify the columns to save" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.save(:columns=>:y)
    DB.sqls.first.must_equal "UPDATE items SET y = NULL WHERE (id = 3)"
  end
  
  it "should mark saved columns as not changed" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o[:y] = 4
    o.changed_columns.must_equal [:y]
    o.save(:columns=>:x)
    o.changed_columns.must_equal [:y]
    o.save(:columns=>:y)
    o.changed_columns.must_equal []
  end
  
  it "should mark all columns as not changed if this is a new record" do
    o = @c.new(:x => 1, :y => nil)
    o.x = 4
    o.changed_columns.must_equal [:x]
    o.save
    o.changed_columns.must_equal []
  end
  
  it "should mark all columns as not changed if this is a new record and insert_select was used" do
    @c.dataset = @c.dataset.with_extend{def insert_select(h) h.merge(:id=>1) end}
    o = @c.new(:x => 1, :y => nil)
    o.x = 4
    o.changed_columns.must_equal [:x]
    o.save
    o.changed_columns.must_equal []
  end

  it "should use Model's use_transactions setting by default" do
    @c.use_transactions = true
    @c.load(:id => 3, :x => 1, :y => nil).save(:columns=>:y)
    DB.sqls.must_equal ["BEGIN", "UPDATE items SET y = NULL WHERE (id = 3)", "COMMIT"]
    @c.use_transactions = false
    @c.load(:id => 3, :x => 1, :y => nil).save(:columns=>:y)
    DB.sqls.must_equal ["UPDATE items SET y = NULL WHERE (id = 3)"]
  end

  it "should inherit Model's use_transactions setting" do
    @c.use_transactions = true
    Class.new(@c).load(:id => 3, :x => 1, :y => nil).save(:columns=>:y)
    DB.sqls.must_equal ["BEGIN", "UPDATE items SET y = NULL WHERE (id = 3)", "COMMIT"]
    @c.use_transactions = false
    Class.new(@c).load(:id => 3, :x => 1, :y => nil).save(:columns=>:y)
    DB.sqls.must_equal ["UPDATE items SET y = NULL WHERE (id = 3)"]
  end

  it "should use object's use_transactions setting" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = false
    @c.use_transactions = true
    o.save(:columns=>:y)
    DB.sqls.must_equal ["UPDATE items SET y = NULL WHERE (id = 3)"]
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = true
    @c.use_transactions = false 
    o.save(:columns=>:y)
    DB.sqls.must_equal ["BEGIN", "UPDATE items SET y = NULL WHERE (id = 3)", "COMMIT"]
  end

  it "should use :transaction option if given" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = true
    o.save(:columns=>:y, :transaction=>false)
    DB.sqls.must_equal ["UPDATE items SET y = NULL WHERE (id = 3)"]
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = false
    o.save(:columns=>:y, :transaction=>true)
    DB.sqls.must_equal ["BEGIN", "UPDATE items SET y = NULL WHERE (id = 3)", "COMMIT"]
  end

  it "should rollback if before_save calls cancel_action and raise_on_save_failure = true" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = true
    o.raise_on_save_failure = true
    def o.before_save
      cancel_action
    end
    proc { o.save(:columns=>:y) }.must_raise(Sequel::HookFailed)
    DB.sqls.must_equal ["BEGIN", "ROLLBACK"]
  end

  it "should rollback if before_save calls cancel_action and :raise_on_failure option is true" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = true
    o.raise_on_save_failure = false
    def o.before_save
      cancel_action
    end
    proc { o.save(:columns=>:y, :raise_on_failure => true) }.must_raise(Sequel::HookFailed)
    DB.sqls.must_equal ["BEGIN", "ROLLBACK"]
  end

  it "should not rollback outer transactions if before_save calls cancel_action and raise_on_save_failure = false" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = true
    o.raise_on_save_failure = false
    def o.before_save
      cancel_action
    end
    DB.transaction do
      o.save(:columns=>:y).must_be_nil
      DB.run "BLAH"
    end
    DB.sqls.must_equal ["BEGIN", "BLAH", "COMMIT"]
  end

  it "should rollback if before_save calls cancel_action and raise_on_save_failure = false" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = true
    o.raise_on_save_failure = false
    def o.before_save
      cancel_action
    end
    o.save(:columns=>:y).must_be_nil
    DB.sqls.must_equal ["BEGIN", "ROLLBACK"]
  end

  it "should not rollback if before_save throws Rollback and use_transactions = false" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.use_transactions = false
    def o.before_save
      raise Sequel::Rollback
    end
    proc { o.save(:columns=>:y) }.must_raise(Sequel::Rollback)
    DB.sqls.must_equal []
  end

  it "should support a :server option to set the server/shard to use" do
    db = Sequel.mock(:fetch=>{:id=>13, :x=>1}, :autoid=>proc{13}, :numrows=>1, :servers=>{:s1=>{}})
    c = Class.new(Sequel::Model(db[:items]))
    c.columns :id, :x
    db.sqls
    o = c.new(:x => 1)
    o.save(:server=>:s1)
    db.sqls.must_equal ["INSERT INTO items (x) VALUES (1) -- s1", "SELECT * FROM items WHERE (id = 13) LIMIT 1 -- s1"]
    o.save(:server=>:s1, :transaction=>true)
    db.sqls.must_equal ["BEGIN -- s1", "UPDATE items SET x = 1 WHERE (id = 13) -- s1", 'COMMIT -- s1']
  end
end

describe "Model#set_server" do
  before do
    @db = Sequel.mock(:fetch=>{:id=>13, :x=>1}, :autoid=>proc{13}, :numrows=>1, :servers=>{:s1=>{}})
    @c = Class.new(Sequel::Model(@db[:items])) do
      columns :id, :x
    end
    @db.sqls
  end

  it "should set the server to use when inserting" do
    @c.new(:x => 1).set_server(:s1).save
    @db.sqls.must_equal ["INSERT INTO items (x) VALUES (1) -- s1", "SELECT * FROM items WHERE (id = 13) LIMIT 1 -- s1"]
  end

  it "should set the server to use when updating" do
     @c.load(:id=>13, :x => 1).set_server(:s1).save
    @db.sqls.must_equal ["UPDATE items SET x = 1 WHERE (id = 13) -- s1"]
  end

  it "should set the server to use for transactions when saving" do
    @c.load(:id=>13, :x => 1).set_server(:s1).save(:transaction=>true)
    @db.sqls.must_equal ["BEGIN -- s1", "UPDATE items SET x = 1 WHERE (id = 13) -- s1", 'COMMIT -- s1']
  end

  it "should set the server to use when deleting" do
    @c.load(:id=>13).set_server(:s1).delete
    @db.sqls.must_equal ["DELETE FROM items WHERE (id = 13) -- s1"]
  end

  it "should set the server to use when deleting when using optimized delete" do
    @c.set_primary_key :id
    @c.load(:id=>13).set_server(:s1).delete
    @db.sqls.must_equal ["DELETE FROM items WHERE id = 13 -- s1"]
  end

  it "should set the server to use for transactions when destroying" do
    o = @c.load(:id=>13).set_server(:s1)
    o.use_transactions = true
    o.destroy
    @db.sqls.must_equal ["BEGIN -- s1", "DELETE FROM items WHERE (id = 13) -- s1", 'COMMIT -- s1']
  end

  it "should set the server on this if this is already loaded" do
    o = @c.load(:id=>13, :x => 1)
    o.this
    o.set_server(:s1)
    o.this.opts[:server].must_equal :s1
  end

  it "should set the server on this if this is not already loaded" do
    @c.load(:id=>13, :x => 1).set_server(:s1).this.opts[:server].must_equal :s1
  end
end

describe "Model#freeze" do
  before do
    class ::Album < Sequel::Model
      columns :id
      class B < Sequel::Model
        columns :id, :album_id
      end
    end
    @o = Album.load(:id=>1).freeze
    DB.sqls
  end
  after do
    Object.send(:remove_const, :Album)
  end

  it "should freeze the object" do
    @o.frozen?.must_equal true
  end

  it "should freeze the object if the model doesn't have a primary key" do
    Album.no_primary_key
    @o = Album.load(:id=>1).freeze
    @o.frozen?.must_equal true
  end

  it "should freeze the object's values, associations, changed_columns, errors, and this" do
    @o.values.frozen?.must_equal true
    @o.changed_columns.frozen?.must_equal true
    @o.errors.frozen?.must_equal true
    @o.this.frozen?.must_equal true
  end

  it "should still have working class attr overriddable methods" do
    [:typecast_empty_string_to_nil, :typecast_on_assignment, :strict_param_setting, :raise_on_save_failure, :raise_on_typecast_failure, :require_modification, :use_transactions].each{|m| @o.send(m) == Album.send(m)}
  end

  it "should have working new? method" do
    @o.new?.must_equal false
    Album.new.freeze.new?.must_equal true
  end

  it "should have working valid? method" do
    @o.valid?.must_equal true
    o = Album.new
    def o.validate() errors.add(:foo, '') end
    o.freeze
    o.valid?.must_equal false
  end

  it "should not call validate if errors is already frozen" do
    @o.valid?.must_equal true
    o = Album.new
    o.errors.freeze
    def o.validate() errors.add(:foo, '') end
    o.freeze
    o.valid?.must_equal true
  end

  it "should raise an Error if trying to save/destroy/delete/refresh" do
    proc{@o.save}.must_raise(Sequel::Error)
    proc{@o.destroy}.must_raise(Sequel::Error)
    proc{@o.delete}.must_raise(Sequel::Error)
    proc{@o.refresh}.must_raise(Sequel::Error)
    @o.db.sqls.must_equal []
  end
end

describe "Model#dup" do
  before do
    @Album = Class.new(Sequel::Model(:albums))
    @o = @Album.load(:id=>1)
    DB.sqls
  end

  it "should be equal to existing object" do
    @o.dup.must_equal @o
    @o.dup.values.must_equal @o.values
    @o.dup.changed_columns.must_equal @o.changed_columns
    @o.dup.errors.must_equal @o.errors
    @o.dup.this.must_equal @o.this
  end

  it "should not use identical structures" do
    @o.dup.wont_be_same_as(@o)
    @o.dup.values.wont_be_same_as(@o.values)
    @o.dup.changed_columns.wont_be_same_as(@o.changed_columns)
    @o.dup.errors.wont_be_same_as(@o.errors)
    @o.dup.this.wont_be_same_as(@o.this)
  end

  it "should keep new status" do
    @o.dup.new?.must_equal false
    @Album.new.dup.new?.must_equal true
  end

  it "should not copy frozen status" do
    this_frozen = @o.this.frozen?
    d = @o.freeze.dup
    d.wont_be :frozen?
    d.values.wont_be :frozen?
    d.changed_columns.wont_be :frozen?
    d.errors.wont_be :frozen?
    d.this.frozen?.must_equal this_frozen
  end
end

describe "Model#clone" do
  before do
    @Album = Class.new(Sequel::Model(:albums))
    @o = @Album.load(:id=>1)
    DB.sqls
  end

  it "should be equal to existing object" do
    @o.clone.must_equal @o
    @o.clone.values.must_equal @o.values
    @o.clone.changed_columns.must_equal @o.changed_columns
    @o.clone.errors.must_equal @o.errors
    @o.clone.this.must_equal @o.this
  end

  it "should not use identical structures" do
    @o.clone.wont_be_same_as(@o)
    @o.clone.values.wont_be_same_as(@o.values)
    @o.clone.changed_columns.wont_be_same_as(@o.changed_columns)
    @o.clone.errors.wont_be_same_as(@o.errors)
    @o.clone.this.wont_be_same_as(@o.this)
  end

  it "should keep new status" do
    @o.clone.new?.must_equal false
    @Album.new.clone.new?.must_equal true
  end

  it "should copy frozen status" do
    @o.freeze.clone.must_be :frozen?
    @o.freeze.clone.values.must_be :frozen?
    @o.freeze.clone.changed_columns.must_be :frozen?
    @o.freeze.clone.errors.must_be :frozen?
    @o.freeze.clone.this.must_be :frozen?
  end
end

describe "Model#marshallable" do
  before do
    class ::Album < Sequel::Model
      columns :id, :x
    end
  end
  after do
    Object.send(:remove_const, :Album)
  end

  it "should make an object marshallable" do
    i = Album.new(:x=>2)
    s = nil
    i2 = nil
    i.marshallable!
    s = Marshal.dump(i)
    i2 = Marshal.load(s)
    i2.must_equal i

    i.save
    i.marshallable!
    s = Marshal.dump(i)
    i2 = Marshal.load(s)
    i2.must_equal i

    i.save
    i.marshallable!
    s = Marshal.dump(i)
    i2 = Marshal.load(s)
    i2.must_equal i
  end
end

describe "Model#modified?" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.class_eval do
      columns :id, :x
      @db_schema = {:x => {:type => :integer}}
    end
    DB.reset
  end
  
  it "should be true if the object is new" do
    @c.new.modified?.must_equal true
  end
  
  it "should be false if the object has not been modified" do
    @c.load(:id=>1).modified?.must_equal false
  end
  
  it "should be true if the object has been modified" do
    o = @c.load(:id=>1, :x=>2)
    o.x = 3
    o.modified?.must_equal true
  end
  
  it "should be true if the object is marked modified!" do
    o = @c.load(:id=>1, :x=>2)
    o.modified!
    o.modified?.must_equal true
  end
  
  it "should be false if the object is marked modified! after saving until modified! again" do
    o = @c.load(:id=>1, :x=>2)
    o.modified!
    o.save
    o.modified?.must_equal false
    o.modified!
    o.modified?.must_equal true
  end
  
  it "should be false if a column value is set that is the same as the current value after typecasting" do
    o = @c.load(:id=>1, :x=>2)
    o.x = '2'
    o.modified?.must_equal false
  end
  
  it "should be true if a column value is set that is the different as the current value after typecasting" do
    o = @c.load(:id=>1, :x=>'2')
    o.x = '2'
    o.modified?.must_equal true
  end

  it "should be true if given a column argument and the column has been changed" do
    o = @c.new
    o.modified?(:id).must_equal false
    o.id = 1
    o.modified?(:id).must_equal true
  end
end

describe "Model#modified!" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.class_eval do
      columns :id, :x
    end
    DB.reset
  end

  it "should mark the object as modified so that save_changes still runs the callbacks" do
    o = @c.load(:id=>1, :x=>2)
    def o.after_save
      values[:x] = 3
    end
    o.update({})
    o.x.must_equal 2

    o.modified!
    o.update({})
    o.x.must_equal 3
    o.db.sqls.must_equal []
  end

  it "should mark given column argument as modified" do
    o = @c.load(:id=>1, :x=>2)
    o.modified!(:x)
    o.changed_columns.must_equal [:x]
    o.save
    o.db.sqls.must_equal ["UPDATE items SET x = 2 WHERE (id = 1)"]
  end
end
  
describe "Model#save_changes" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      unrestrict_primary_key
      columns :id, :x, :y
    end
    DB.reset
  end
  
  it "should always save if the object is new" do
    o = @c.new(:x => 1)
    o.save_changes
    DB.sqls.first.must_equal "INSERT INTO items (x) VALUES (1)"
  end

  it "should take options passed to save" do
    o = @c.load(:id=>1, :x => 1)
    o.x = 2
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET x = 2 WHERE (id = 1)"]

    o.x = 3
    o.save_changes(:transaction=>true)
    DB.sqls.must_equal ["BEGIN", "UPDATE items SET x = 3 WHERE (id = 1)", "COMMIT"]
  end

  it "should do nothing if no changed columns" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.save_changes
    DB.sqls.must_equal []
  end
  
  it "should do nothing if modified? is false" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    def o.modified?; false; end
    o.save_changes
    DB.sqls.must_equal []
  end
  
  it "should update only changed columns" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.x = 2

    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET x = 2 WHERE (id = 3)"]
    o.save_changes
    o.save_changes
    DB.sqls.must_equal []

    o.y = 4
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET y = 4 WHERE (id = 3)"]
    o.save_changes
    o.save_changes
    DB.sqls.must_equal []
  end
  
  it "should not consider columns changed if the values did not change" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.x = 1

    o.save_changes
    DB.sqls.must_equal []
    o.x = 3
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET x = 3 WHERE (id = 3)"]

    o[:y] = nil
    o.save_changes
    DB.sqls.must_equal []
    o[:y] = 4
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET y = 4 WHERE (id = 3)"]
  end
  
  it "should clear changed_columns" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    o.x = 4
    o.changed_columns.must_equal [:x]
    o.save_changes
    o.changed_columns.must_equal []
  end

  it "should update columns changed in a before_update hook" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    @c.send(:define_method, :before_update){self.x += 1}
    o.save_changes
    DB.sqls.must_equal []
    o.x = 2
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET x = 3 WHERE (id = 3)"]
    o.save_changes
    DB.sqls.must_equal []
    o.x = 4
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET x = 5 WHERE (id = 3)"]
  end

  it "should update columns changed in a before_save hook" do
    o = @c.load(:id => 3, :x => 1, :y => nil)
    @c.send(:define_method, :before_update){self.x += 1}
    o.save_changes
    DB.sqls.must_equal []
    o.x = 2
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET x = 3 WHERE (id = 3)"]
    o.save_changes
    DB.sqls.must_equal []
    o.x = 4
    o.save_changes
    DB.sqls.must_equal ["UPDATE items SET x = 5 WHERE (id = 3)"]
  end
end

describe "Model#new?" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      unrestrict_primary_key
      columns :x
    end
    DB.reset
  end
  
  it "should be true for a new instance" do
    n = @c.new(:x => 1)
    n.must_be :new?
  end
  
  it "should be false after saving" do
    n = @c.new(:x => 1)
    n.save
    n.wont_be :new?
  end
end

describe Sequel::Model, "with a primary key" do
  it "should default to :id" do
    model_a = Class.new Sequel::Model
    model_a.primary_key.must_equal :id
  end

  it "should be changed through 'set_primary_key'" do
    model_a = Class.new(Sequel::Model){ set_primary_key :a }
    model_a.primary_key.must_equal :a
  end

  it "should accept single argument composite keys" do
    model_a = Class.new(Sequel::Model){ set_primary_key [:a, :b] }
    model_a.primary_key.must_equal [:a, :b]
  end
end

describe Sequel::Model, "without a primary key" do
  it "should return nil for primary key" do
    Class.new(Sequel::Model){no_primary_key}.primary_key.must_be_nil
  end

  it "should raise a Sequel::Error on 'this'" do
    instance = Class.new(Sequel::Model){no_primary_key}.new
    proc{instance.this}.must_raise(Sequel::Error)
  end
end

describe Sequel::Model, "#this" do
  before do
    @example = Class.new(Sequel::Model(:examples))
    @example.columns :id, :a, :x, :y
  end

  it "should return a dataset identifying the record" do
    instance = @example.load(:id => 3)
    instance.this.sql.must_equal "SELECT * FROM examples WHERE (id = 3) LIMIT 1"
  end

  it "should support arbitary primary keys" do
    @example.set_primary_key :a

    instance = @example.load(:a => 3)
    instance.this.sql.must_equal "SELECT * FROM examples WHERE (a = 3) LIMIT 1"
  end

  it "should use a subquery if the dataset is joined" do
    @example.dataset = @example.dataset.cross_join(:a)
    instance = @example.load(:id => 3)
    instance.this.sql.must_equal "SELECT * FROM (SELECT * FROM examples CROSS JOIN a) AS examples WHERE (id = 3) LIMIT 1"
  end

  it "should use a primary key if the dataset uses a subquery" do
    @example.dataset = @example.dataset.cross_join(:a).from_self(:alias=>:b)
    instance = @example.load(:id => 3)
    instance.this.sql.must_equal "SELECT * FROM (SELECT * FROM examples CROSS JOIN a) AS b WHERE (id = 3) LIMIT 1"
  end

  it "should support composite primary keys" do
    @example.set_primary_key [:x, :y]
    instance = @example.load(:x => 4, :y => 5)
    instance.this.sql.must_equal 'SELECT * FROM examples WHERE ((x = 4) AND (y = 5)) LIMIT 1'
  end
end

describe "Model#pk" do
  before do
    @m = Class.new(Sequel::Model)
    @m.columns :id, :x, :y
  end
  
  it "should by default return the value of the :id column" do
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.pk.must_equal 111
  end

  it "should return the primary key value for custom primary key" do
    @m.set_primary_key :x
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.pk.must_equal 2
  end

  it "should return the primary key value for composite primary key" do
    @m.set_primary_key [:y, :x]
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.pk.must_equal [3, 2]
  end

  it "should raise if no primary key" do
    @m.set_primary_key nil
    m = @m.new(:id => 111, :x => 2, :y => 3)
    proc {m.pk}.must_raise(Sequel::Error)

    @m.no_primary_key
    m = @m.new(:id => 111, :x => 2, :y => 3)
    proc {m.pk}.must_raise(Sequel::Error)
  end
end

describe "Model#pk_hash" do
  before do
    @m = Class.new(Sequel::Model)
    @m.columns :id, :x, :y
  end
  
  it "should by default return a hash with the value of the :id column" do
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.pk_hash.must_equal(:id => 111)
  end

  it "should return a hash with the primary key value for custom primary key" do
    @m.set_primary_key :x
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.pk_hash.must_equal(:x => 2)
  end

  it "should return a hash with the primary key values for composite primary key" do
    @m.set_primary_key [:y, :x]
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.pk_hash.must_equal(:y => 3, :x => 2)
  end

  it "should raise if no primary key" do
    @m.set_primary_key nil
    m = @m.new(:id => 111, :x => 2, :y => 3)
    proc{m.pk_hash}.must_raise(Sequel::Error)

    @m.no_primary_key
    m = @m.new(:id => 111, :x => 2, :y => 3)
    proc{m.pk_hash}.must_raise(Sequel::Error)
  end
end

describe "Model#qualified_pk_hash" do
  before do
    @m = Class.new(Sequel::Model(:items))
    @m.columns :id, :x, :y
  end
  
  it "should by default return a hash with the value of the :id column" do
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.qualified_pk_hash.must_equal(Sequel.qualify(:items, :id) => 111)
  end

  it "should accept a custom qualifier" do
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.qualified_pk_hash(:foo).must_equal(Sequel.qualify(:foo, :id) => 111)
  end

  it "should return a hash with the primary key value for custom primary key" do
    @m.set_primary_key :x
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.qualified_pk_hash.must_equal(Sequel.qualify(:items, :x) => 2)
  end

  it "should return a hash with the primary key values for composite primary key" do
    @m.set_primary_key [:y, :x]
    m = @m.load(:id => 111, :x => 2, :y => 3)
    m.qualified_pk_hash.must_equal(Sequel.qualify(:items, :y) => 3, Sequel.qualify(:items, :x) => 2)
  end

  it "should raise if no primary key" do
    @m.set_primary_key nil
    m = @m.new(:id => 111, :x => 2, :y => 3)
    proc{m.qualified_pk_hash}.must_raise(Sequel::Error)

    @m.no_primary_key
    m = @m.new(:id => 111, :x => 2, :y => 3)
    proc{m.qualified_pk_hash}.must_raise(Sequel::Error)
  end
end

describe Sequel::Model, "#set" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      set_primary_key :id
      columns :x, :y, :id
    end
    @c.strict_param_setting = false
    @o1 = @c.new
    @o2 = @c.load(:id => 5)
    DB.reset
  end

  it "should filter the given params using the model columns" do
    @o1.set(:x => 1, :z => 2)
    @o1.values.must_equal(:x => 1)
    DB.sqls.must_equal []

    @o2.set(:y => 1, :abc => 2)
    @o2.values.must_equal(:y => 1, :id=> 5)
    DB.sqls.must_equal []
  end
  
  it "should work with both strings and symbols" do
    @o1.set('x'=> 1, 'z'=> 2)
    @o1.values.must_equal(:x => 1)
    DB.sqls.must_equal []

    @o2.set('y'=> 1, 'abc'=> 2)
    @o2.values.must_equal(:y => 1, :id=> 5)
    DB.sqls.must_equal []
  end
  
  it "should support virtual attributes" do
    @c.send(:define_method, :blah=){|v| self.x = v}
    @o1.set(:blah => 333)
    @o1.values.must_equal(:x => 333)
    DB.sqls.must_equal []
    @o1.set('blah'=> 334)
    @o1.values.must_equal(:x => 334)
    DB.sqls.must_equal []
  end
  
  it "should not modify the primary key" do
    @o1.set(:x => 1, :id => 2)
    @o1.values.must_equal(:x => 1)
    DB.sqls.must_equal []
    @o2.set('y'=> 1, 'id'=> 2)
    @o2.values.must_equal(:y => 1, :id=> 5)
    DB.sqls.must_equal []
  end

  it "should return self" do
    returned_value = @o1.set(:x => 1, :z => 2)
    returned_value.must_equal @o1
    DB.sqls.must_equal []
  end

  it "should raise error if strict_param_setting is true and method does not exist" do
    @o1.strict_param_setting = true
    proc{@o1.set('foo' => 1)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should raise error if strict_param_setting is true and column is a primary key" do
    @o1.strict_param_setting = true
    proc{@o1.set('id' => 1)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should raise error if strict_param_setting is true and column is restricted" do
    @o1.strict_param_setting = true
    @c.setter_methods.delete("x=")
    proc{@o1.set('x' => 1)}.must_raise(Sequel::MassAssignmentRestriction)
  end

  it "should not create a symbol if strict_param_setting is true and string is given" do
    @o1.strict_param_setting = true
    proc{@o1.set('sadojafdso' => 1)}.must_raise(Sequel::MassAssignmentRestriction)
    Symbol.all_symbols.map(&:to_s).wont_include('sadojafdso')
  end

  it "#set should correctly handle cases where an instance method is added to the class" do
    @o1.set(:x => 1)
    @o1.values.must_equal(:x => 1)

    @c.class_eval do
      def z=(v)
        self[:z] = v
      end
    end
    @o1.set(:x => 2, :z => 3)
    @o1.values.must_equal(:x => 2, :z=>3)
  end

  it "#set should correctly handle cases where a singleton method is added to the object" do
    @o1.set(:x => 1)
    @o1.values.must_equal(:x => 1)

    def @o1.z=(v)
      self[:z] = v
    end
    @o1.set(:x => 2, :z => 3)
    @o1.values.must_equal(:x => 2, :z=>3)
  end

  it "#set should correctly handle cases where a module with a setter method is included in the class" do
    @o1.set(:x => 1)
    @o1.values.must_equal(:x => 1)

    @c.send(:include, Module.new do
      def z=(v)
        self[:z] = v
      end
    end)
    @o1.set(:x => 2, :z => 3)
    @o1.values.must_equal(:x => 2, :z=>3)
  end

  it "#set should correctly handle cases where the object extends a module with a setter method " do
    @o1.set(:x => 1)
    @o1.values.must_equal(:x => 1)

    @o1.extend(Module.new do
      def z=(v)
        self[:z] = v
      end
    end)
    @o1.set(:x => 2, :z => 3)
    @o1.values.must_equal(:x => 2, :z=>3)
  end
end

describe Sequel::Model, "#update" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      set_primary_key :id
      columns :x, :y, :id
    end
    @c.strict_param_setting = false
    @o1 = @c.new
    @o2 = @c.load(:id => 5)
    DB.reset
  end
  
  it "should filter the given params using the model columns" do
    @o1.update(:x => 1, :z => 2)
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 10"]

    DB.reset
    @o2.update(:y => 1, :abc => 2)
    DB.sqls.must_equal ["UPDATE items SET y = 1 WHERE (id = 5)"]
  end
  
  it "should support virtual attributes" do
    @c.send(:define_method, :blah=){|v| self.x = v}
    @o1.update(:blah => 333)
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (333)", "SELECT * FROM items WHERE id = 10"]
  end
  
  it "should not modify the primary key" do
    @o1.update(:x => 1, :id => 2)
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (1)", "SELECT * FROM items WHERE id = 10"]
    DB.reset
    @o2.update('y'=> 1, 'id'=> 2)
    @o2.values.must_equal(:y => 1, :id=> 5)
    DB.sqls.must_equal ["UPDATE items SET y = 1 WHERE (id = 5)"]
  end
end

describe Sequel::Model, "#set_fields" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      set_primary_key :id
      columns :x, :y, :z, :id
    end
    @o1 = @c.new
    DB.reset
  end

  it "should set only the given fields" do
    @o1.set_fields({:x => 1, :y => 2, :z=>3, :id=>4}, [:x, :y])
    @o1.values.must_equal(:x => 1, :y => 2)
    @o1.set_fields({:x => 9, :y => 8, :z=>6, :id=>7}, [:x, :y, :id])
    @o1.values.must_equal(:x => 9, :y => 8, :id=>7)
    DB.sqls.must_equal []
  end

  it "should lookup into the hash without checking if the entry exists" do
    @o1.set_fields({:x => 1}, [:x, :y])
    @o1.values.must_equal(:x => 1, :y => nil)
    @o1.set_fields(Hash.new(2), [:x, :y])
    @o1.values.must_equal(:x => 2, :y => 2)
  end

  it "should skip missing fields if :missing=>:skip option is used" do
    @o1.set_fields({:x => 3}, [:x, :y], :missing=>:skip)
    @o1.values.must_equal(:x => 3)
    @o1.set_fields({"x" => 4}, [:x, :y], :missing=>:skip)
    @o1.values.must_equal(:x => 4)
    @o1.set_fields(Hash.new(2).merge(:x=>2), [:x, :y], :missing=>:skip)
    @o1.values.must_equal(:x => 2)
    @o1.set_fields({:x => 1, :y => 2, :z=>3, :id=>4}, [:x, :y], :missing=>:skip)
    @o1.values.must_equal(:x => 1, :y => 2)
  end

  it "should raise for missing fields if :missing=>:raise option is used" do
    proc{@o1.set_fields({:x => 1}, [:x, :y], :missing=>:raise)}.must_raise(Sequel::Error)
    proc{@o1.set_fields(Hash.new(2).merge(:x=>2), [:x, :y], :missing=>:raise)}.must_raise(Sequel::Error)
    proc{@o1.set_fields({"x" => 1}, [:x, :y], :missing=>:raise)}.must_raise(Sequel::Error)
    @o1.set_fields({:x => 5, "y"=>2}, [:x, :y], :missing=>:raise)
    @o1.values.must_equal(:x => 5, :y => 2)
    @o1.set_fields({:x => 1, :y => 3, :z=>3, :id=>4}, [:x, :y], :missing=>:raise)
    @o1.values.must_equal(:x => 1, :y => 3)
  end

  it "should use default behavior for an unrecognized :missing option" do
    @o1.set_fields({:x => 1, :y => 2, :z=>3, :id=>4}, [:x, :y], :missing=>:foo)
    @o1.values.must_equal(:x => 1, :y => 2)
    @o1.set_fields({:x => 9, :y => 8, :z=>6, :id=>7}, [:x, :y, :id], :missing=>:foo)
    @o1.values.must_equal(:x => 9, :y => 8, :id=>7)
    DB.sqls.must_equal []
  end

  it "should respect model's default_set_fields_options" do
    @c.default_set_fields_options = {:missing=>:skip}
    @o1.set_fields({:x => 3}, [:x, :y])
    @o1.values.must_equal(:x => 3)
    @o1.set_fields({:x => 4}, [:x, :y], {})
    @o1.values.must_equal(:x => 4)
    proc{@o1.set_fields({:x => 3}, [:x, :y], :missing=>:raise)}.must_raise(Sequel::Error)
    @c.default_set_fields_options = {:missing=>:raise}
    proc{@o1.set_fields({:x => 3}, [:x, :y])}.must_raise(Sequel::Error)
    proc{@o1.set_fields({:x => 3}, [:x, :y], {})}.must_raise(Sequel::Error)
    @o1.set_fields({:x => 5}, [:x, :y], :missing=>:skip)
    @o1.values.must_equal(:x => 5)
    @o1.set_fields({:x => 5}, [:x, :y], :missing=>nil)
    @o1.values.must_equal(:x => 5, :y=>nil)
    DB.sqls.must_equal []
  end

  it "should respect model's default_set_fields_options in a subclass" do
    @c.default_set_fields_options = {:missing=>:skip}
    o = Class.new(@c).new
    o.set_fields({:x => 3}, [:x, :y])
    o.values.must_equal(:x => 3)
  end

  it "should respect set_column_value" do
    @c.class_eval do
      def set_column_value(c, v)
        if c.to_s == 'model='
          self[:model] = v
        else
          send(c, v)
        end
      end
    end
    @o1.set_fields({:model=>2, :x=>3}, [:model, :x])
    @o1[:model].must_equal 2
    @o1.x.must_equal 3
  end
end

describe Sequel::Model, "#update_fields" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      set_primary_key :id
      columns :x, :y, :z, :id
    end
    @c.strict_param_setting = true 
    @o1 = @c.load(:id=>1)
    DB.reset
  end

  it "should set only the given fields, and then save the changes to the record" do
    @o1.update_fields({:x => 1, :y => 2, :z=>3, :id=>4}, [:x, :y])
    @o1.values.must_equal(:x => 1, :y => 2, :id=>1)
    DB.sqls.must_equal ['UPDATE items SET x = 1, y = 2 WHERE (id = 1)']

    @o1.update_fields({:x => 1, :y => 5, :z=>6, :id=>7}, [:x, :y])
    @o1.values.must_equal(:x => 1, :y => 5, :id=>1)
    DB.sqls.must_equal ["UPDATE items SET y = 5 WHERE (id = 1)"]
  end

  it "should support :missing=>:skip option" do
    @o1.update_fields({:x => 1, :z=>3, :id=>4}, [:x, :y], :missing=>:skip)
    @o1.values.must_equal(:x => 1, :id=>1)
    DB.sqls.must_equal ["UPDATE items SET x = 1 WHERE (id = 1)"]
  end

  it "should support :missing=>:raise option" do
    proc{@o1.update_fields({:x => 1}, [:x, :y], :missing=>:raise)}.must_raise(Sequel::Error)
  end

  it "should respect model's default_set_fields_options" do
    @c.default_set_fields_options = {:missing=>:skip}
    @o1.update_fields({:x => 3}, [:x, :y])
    @o1.values.must_equal(:x => 3, :id=>1)
    DB.sqls.must_equal ["UPDATE items SET x = 3 WHERE (id = 1)"]

    @c.default_set_fields_options = {:missing=>:raise}
    proc{@o1.update_fields({:x => 3}, [:x, :y])}.must_raise(Sequel::Error)
    DB.sqls.must_equal []
  end
end

describe Sequel::Model, "#destroy with filtered dataset" do
  before do
    @model = Class.new(Sequel::Model(DB[:items].where(:a=>1)))
    @model.columns :id, :a
    @instance = @model.load(:id => 1234)
    DB.reset
  end

  it "should raise a NoExistingObject exception if the dataset delete call doesn't return 1" do
    i = 0
    @model.dataset = @model.dataset.with_extend{define_method(:execute_dui){|*| i}}
    proc{@instance.delete}.must_raise(Sequel::NoExistingObject)
    i = 2
    proc{@instance.delete}.must_raise(Sequel::NoExistingObject)
    i = 1
    @instance.delete
    
    @instance.require_modification = false
    i = 0
    @instance.delete
    i = 2
    @instance.delete
  end

  it "should include WHERE clause when deleting" do
    @instance.destroy
    DB.sqls.must_equal ["DELETE FROM items WHERE ((a = 1) AND (id = 1234))"]
  end
end

describe Sequel::Model, "#destroy" do
  before do
    @model = Class.new(Sequel::Model(:items))
    @model.columns :id
    @instance = @model.load(:id => 1234)
    DB.reset
  end

  it "should return self" do
    @model.send(:define_method, :after_destroy){3}
    @instance.destroy.must_equal @instance
  end
  
  it "should raise a NoExistingObject exception if the dataset delete call doesn't return 1" do
    i = 0
    @model.dataset = @model.dataset.with_extend{define_method(:execute_dui){|*| i}}
    proc{@instance.delete}.must_raise(Sequel::NoExistingObject)
    i = 2
    proc{@instance.delete}.must_raise(Sequel::NoExistingObject)
    i = 1
    @instance.delete
    
    @instance.require_modification = false
    i = 0
    @instance.delete
    i = 2
    @instance.delete
  end

  it "should run within a transaction if use_transactions is true" do
    @instance.use_transactions = true
    @instance.destroy
    DB.sqls.must_equal ["BEGIN", "DELETE FROM items WHERE id = 1234", "COMMIT"]
  end

  it "should not run within a transaction if use_transactions is false" do
    @instance.use_transactions = false
    @instance.destroy
    DB.sqls.must_equal ["DELETE FROM items WHERE id = 1234"]
  end

  it "should run within a transaction if :transaction option is true" do
    @instance.use_transactions = false
    @instance.destroy(:transaction => true)
    DB.sqls.must_equal ["BEGIN", "DELETE FROM items WHERE id = 1234", "COMMIT"]
  end

  it "should not run within a transaction if :transaction option is false" do
    @instance.use_transactions = true
    @instance.destroy(:transaction => false)
    DB.sqls.must_equal ["DELETE FROM items WHERE id = 1234"]
  end

  it "should run before_destroy and after_destroy hooks" do
    @model.send(:define_method, :before_destroy){DB.execute('before blah')}
    @model.send(:define_method, :after_destroy){DB.execute('after blah')}
    @instance.destroy
    DB.sqls.must_equal ["before blah", "DELETE FROM items WHERE id = 1234", "after blah"]
  end
end

describe Sequel::Model, "#exists?" do
  before do
    @model = Class.new(Sequel::Model(:items))
    @model.dataset = @model.dataset.with_fetch(proc{|sql| {:x=>1} if sql =~ /id = 1/})
    DB.reset
  end

  it "should do a query to check if the record exists" do
    @model.load(:id=>1).exists?.must_equal true
    DB.sqls.must_equal ['SELECT 1 AS one FROM items WHERE (id = 1) LIMIT 1']
  end

  it "should return false when #this.count == 0" do
    @model.load(:id=>2).exists?.must_equal false
    DB.sqls.must_equal ['SELECT 1 AS one FROM items WHERE (id = 2) LIMIT 1']
  end

  it "should return false without issuing a query if the model object is new" do
    @model.new.exists?.must_equal false
    DB.sqls.must_equal []
  end
end

describe Sequel::Model, "#each" do
  before do
    @model = Class.new(Sequel::Model(:items))
    @model.columns :a, :b, :id
    @m = @model.load(:a => 1, :b => 2, :id => 4444)
  end
  
  it "should iterate over the values" do
    h = {}
    @m.each{|k, v| h[k] = v}
    h.must_equal(:a => 1, :b => 2, :id => 4444)
  end
end

describe Sequel::Model, "#keys" do
  before do
    @model = Class.new(Sequel::Model(:items))
    @model.columns :a, :b, :id
    @m = @model.load(:a => 1, :b => 2, :id => 4444)
  end
  
  it "should return the value keys" do
    @m.keys.sort_by{|k| k.to_s}.must_equal [:a, :b, :id]
    @model.new.keys.must_equal []
  end
end

describe Sequel::Model, "#==" do
  it "should compare instances by values" do
    z = Class.new(Sequel::Model)
    z.columns :id, :x
    a = z.load(:id => 1, :x => 3)
    b = z.load(:id => 1, :x => 4)
    c = z.load(:id => 1, :x => 3)
    
    a.wont_equal b
    a.must_equal c
    b.wont_equal c
  end

  it "should be aliased to #eql?" do
    z = Class.new(Sequel::Model)
    z.columns :id, :x
    a = z.load(:id => 1, :x => 3)
    b = z.load(:id => 1, :x => 4)
    c = z.load(:id => 1, :x => 3)
    
    a.eql?(b).must_equal false
    a.eql?(c).must_equal true
    b.eql?(c).must_equal false
  end
end

[:===, :pk_equal?].each do |method_name|
  describe Sequel::Model, "##{method_name}" do
    it "should compare instances by class and pk if pk is not nil" do
      z = Class.new(Sequel::Model)
      z.columns :id, :x
      y = Class.new(Sequel::Model)
      y.columns :id, :x
      a = z.load(:id => 1, :x => 3)
      b = z.load(:id => 1, :x => 4)
      c = z.load(:id => 2, :x => 3)
      d = y.load(:id => 1, :x => 3)

      a.must_be method_name, b
      a.wont_be method_name, c
      a.wont_be method_name, d
    end

    it "should always be false if the primary key is nil" do
      z = Class.new(Sequel::Model)
      z.columns :id, :x
      y = Class.new(Sequel::Model)
      y.columns :id, :x
      a = z.new(:x => 3)
      b = z.new(:x => 4)
      c = z.new(:x => 3)
      d = y.new(:x => 3)

      a.wont_be method_name, b
      a.wont_be method_name, c
      a.wont_be method_name, d
    end

    it "should always be false if the primary key is an array containing nil" do
      z = Class.new(Sequel::Model)
      z.columns :id, :x
      z.set_primary_key [:id, :x]
      z.load(:id => nil, :x => nil).wont_be method_name, z.load(:id => nil, :x => nil)
      z.load(:id => 1, :x => nil).wont_be method_name, z.load(:id => 1, :x => nil)
      z.load(:id => nil, :x => 2).wont_be method_name, z.load(:id => nil, :x => 2)
    end
  end
end

describe Sequel::Model, "#hash" do
  it "should be the same only for objects with the same class and pk if the pk is not nil" do
    z = Class.new(Sequel::Model)
    z.columns :id, :x
    y = Class.new(Sequel::Model)
    y.columns :id, :x
    a = z.load(:id => 1, :x => 3)
    
    a.hash.must_equal z.load(:id => 1, :x => 4).hash
    a.hash.wont_equal z.load(:id => 2, :x => 3).hash
    a.hash.wont_equal y.load(:id => 1, :x => 3).hash
  end

  it "should be the same only for objects with the same class and values if the pk is nil" do
    z = Class.new(Sequel::Model)
    z.columns :id, :x
    y = Class.new(Sequel::Model)
    y.columns :id, :x
    a = z.new(:x => 3)
    
    a.hash.wont_equal z.new(:x => 4).hash
    a.hash.must_equal z.new(:x => 3).hash
    a.hash.wont_equal y.new(:x => 3).hash
  end

  it "should be the same only for objects with the same class and pk if pk is composite and all values are non-NULL" do
    z = Class.new(Sequel::Model)
    z.columns :id, :id2, :x
    z.set_primary_key([:id, :id2])
    y = Class.new(Sequel::Model)
    y.columns :id, :id2, :x
    y.set_primary_key([:id, :id2])
    a = z.load(:id => 1, :id2=>2, :x => 3)
    
    a.hash.must_equal z.load(:id => 1, :id2=>2, :x => 4).hash
    a.hash.wont_equal z.load(:id => 2, :id2=>1, :x => 3).hash
    a.hash.wont_equal y.load(:id => 1, :id2=>1, :x => 3).hash
  end

  it "should be the same only for objects with the same class and value if pk is composite and one values is NULL" do
    z = Class.new(Sequel::Model)
    z.columns :id, :id2, :x
    z.set_primary_key([:id, :id2])
    y = Class.new(Sequel::Model)
    y.columns :id, :id2, :x
    y.set_primary_key([:id, :id2])

    a = z.load(:id => 1, :id2 => nil, :x => 3)
    a.hash.must_equal z.load(:id => 1, :id2=>nil, :x => 3).hash
    a.hash.wont_equal z.load(:id => 1, :id2=>nil, :x => 4).hash
    a.hash.wont_equal y.load(:id => 1, :id2=>nil, :x => 3).hash

    a = z.load(:id =>nil, :id2 => nil, :x => 3)
    a.hash.must_equal z.load(:id => nil, :id2=>nil, :x => 3).hash
    a.hash.wont_equal z.load(:id => nil, :id2=>nil, :x => 4).hash
    a.hash.wont_equal y.load(:id => nil, :id2=>nil, :x => 3).hash

    a = z.load(:id => 1, :x => 3)
    a.hash.must_equal z.load(:id => 1, :x => 3).hash
    a.hash.wont_equal z.load(:id => 1, :id2=>nil, :x => 3).hash
    a.hash.wont_equal z.load(:id => 1, :x => 4).hash
    a.hash.wont_equal y.load(:id => 1, :x => 3).hash

    a = z.load(:x => 3)
    a.hash.must_equal z.load(:x => 3).hash
    a.hash.wont_equal z.load(:id => nil, :id2=>nil, :x => 3).hash
    a.hash.wont_equal z.load(:x => 4).hash
    a.hash.wont_equal y.load(:x => 3).hash
  end

  it "should be the same only for objects with the same class and values if the no primary key" do
    z = Class.new(Sequel::Model)
    z.columns :id, :x
    z.no_primary_key
    y = Class.new(Sequel::Model)
    y.columns :id, :x
    y.no_primary_key
    a = z.new(:x => 3)
    
    a.hash.wont_equal z.new(:x => 4).hash
    a.hash.must_equal z.new(:x => 3).hash
    a.hash.wont_equal y.new(:x => 3).hash
  end

end

describe Sequel::Model, "#initialize" do
  before do
    @c = Class.new(Sequel::Model) do
      columns :id, :x
    end
    @c.strict_param_setting = false
  end
  
  it "should accept values" do
    m = @c.new(:x => 2)
    m.values.must_equal(:x => 2)
  end
  
  it "should not modify the primary key" do
    m = @c.new(:id => 1, :x => 2)
    m.values.must_equal(:x => 2)
  end
  
  it "should accept no values" do
    m = @c.new
    m.values.must_equal({})
  end
  
  it "should accept a block to execute" do
    m = @c.new {|o| o[:id] = 1234}
    m.id.must_equal 1234
  end
  
  it "should accept virtual attributes" do
    @c.send(:define_method, :blah=){|x| @blah = x}
    @c.send(:define_method, :blah){@blah}
    
    m = @c.new(:x => 2, :blah => 3)
    m.values.must_equal(:x => 2)
    m.blah.must_equal 3
  end
  
  it "should convert string keys into symbol keys" do
    m = @c.new('x' => 2)
    m.values.must_equal(:x => 2)
  end
end
  
describe Sequel::Model, "#initialize_set" do
  before do
    @c = Class.new(Sequel::Model){columns :id, :x, :y}
  end

  it "should be called by initialize to set the column values" do
    @c.send(:define_method, :initialize_set){|h| set(:y => 3)}
    @c.new(:x => 2).values.must_equal(:y => 3)
  end

  it "should be called with the hash given to initialize " do
    x = nil
    @c.send(:define_method, :initialize_set){|y| x = y}
    @c.new(:x => 2)
    x.must_equal(:x => 2)
  end

  it "should not cause columns modified by the method to be considered as changed" do
    @c.send(:define_method, :initialize_set){|h| set(:y => 3)}
    @c.new(:x => 2).changed_columns.must_equal []
  end
end

describe Sequel::Model, ".create" do
  before do
    DB.reset
    @c = Class.new(Sequel::Model(:items)) do
      unrestrict_primary_key
      columns :x
    end
  end

  it "should be able to create rows in the associated table" do
    o = @c.create(:x => 1)
    o.class.must_equal @c
    DB.sqls.must_equal ['INSERT INTO items (x) VALUES (1)', "SELECT * FROM items WHERE id = 10"]
  end

  it "should be able to create rows without any values specified" do
    o = @c.create
    o.class.must_equal @c
    DB.sqls.must_equal ["INSERT INTO items DEFAULT VALUES", "SELECT * FROM items WHERE id = 10"]
  end

  it "should accept a block and call it" do
    o1, o2, o3 =  nil, nil, nil
    o = @c.create {|o4| o1 = o4; o3 = o4; o2 = :blah; o3.x = 333}
    o.class.must_equal @c
    o1.must_be :===, o
    o3.must_be :===, o
    o2.must_equal :blah
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (333)", "SELECT * FROM items WHERE id = 10"]
  end
  
  it "should create a row for a model with custom primary key" do
    @c.set_primary_key :x
    o = @c.create(:x => 30)
    o.class.must_equal @c
    DB.sqls.must_equal ["INSERT INTO items (x) VALUES (30)", "SELECT * FROM items WHERE x = 30"]
  end
end

describe Sequel::Model, "#refresh" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      unrestrict_primary_key
      columns :id, :x
    end
    DB.reset
  end

  it "should reload the instance values from the database" do
    @m = @c.new(:id => 555)
    @m[:x] = 'blah'
    @c.dataset = @c.dataset.with_fetch(:x => 'kaboom', :id => 555)
    @m.refresh
    @m[:x].must_equal 'kaboom'
    DB.sqls.must_equal ["SELECT * FROM items WHERE id = 555"]
  end
  
  it "should raise if the instance is not found" do
    @m = @c.new(:id => 555)
    @c.dataset = @c.dataset.with_fetch([])
    proc {@m.refresh}.must_raise(Sequel::NoExistingObject)
    DB.sqls.must_equal ["SELECT * FROM items WHERE id = 555"]
  end
  
  it "should be aliased by #reload" do
    @m = @c.new(:id => 555)
    @c.dataset = @c.dataset.with_fetch(:x => 'kaboom', :id => 555)
    @m.reload
    @m[:x].must_equal 'kaboom'
    DB.sqls.must_equal ["SELECT * FROM items WHERE id = 555"]
  end
end

describe Sequel::Model, "typecasting" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      columns :x
    end
    @c.db_schema = {:x=>{:type=>:integer}}
    @c.raise_on_typecast_failure = true
    DB.reset
  end

  after do
    Sequel.datetime_class = Time
  end

  it "should not convert if typecasting is turned off" do
    @c.typecast_on_assignment = false
    m = @c.new
    m.x = '1'
    m.x.must_equal '1'
  end

  it "should convert to integer for an integer field" do
    @c.db_schema = {:x=>{:type=>:integer}}
    m = @c.new
    m.x = '1'
    m.x.must_equal 1
    m.x = 1
    m.x.must_equal 1
    m.x = 1.3
    m.x.must_equal 1
  end

  it "should typecast '' to nil unless type is string or blob" do
    [:integer, :float, :decimal, :boolean, :date, :time, :datetime].each do |x|
      @c.db_schema = {:x=>{:type=>x}}
      m = @c.new
      m.x = ''
      m.x.must_be_nil
    end
   [:string, :blob].each do |x|
      @c.db_schema = {:x=>{:type=>x}}
      m = @c.new
      m.x = ''
      m.x.must_equal ''
    end
  end

  it "should not typecast '' to nil if typecast_empty_string_to_nil is false" do
    m = @c.new
    m.typecast_empty_string_to_nil = false
    proc{m.x = ''}.must_raise Sequel::InvalidValue
    @c.typecast_empty_string_to_nil = false
    proc{@c.new.x = ''}.must_raise Sequel::InvalidValue
  end

  it "should handle typecasting where == raises an error on the object" do
    m = @c.new
    o = Object.new
    def o.==(v) raise ArgumentError end
    def o.to_i() 4 end
    m.x = o
    m.x.must_equal 4
  end

  it "should not typecast nil if NULLs are allowed" do
    @c.db_schema[:x][:allow_null] = true
    m = @c.new
    m.x = nil
    m.x.must_be_nil
  end

  it "should raise an error if attempting to typecast nil and NULLs are not allowed" do
    @c.db_schema[:x][:allow_null] = false
    proc{@c.new.x = nil}.must_raise(Sequel::InvalidValue)
    proc{@c.new.x = ''}.must_raise(Sequel::InvalidValue)
  end

  it "should not raise an error if NULLs are not allowed and typecasting is turned off" do
    @c.typecast_on_assignment = false
    @c.db_schema[:x][:allow_null] = false
    m = @c.new
    m.x = nil
    m.x.must_be_nil
  end

  it "should not raise when typecasting nil to NOT NULL column but raise_on_typecast_failure is off" do
    @c.raise_on_typecast_failure = false
    @c.typecast_on_assignment = true
    m = @c.new
    m.x = ''
    m.x.must_be_nil
    m.x = nil
    m.x.must_be_nil
  end

  it "should raise an error if invalid data is used in an integer field" do
    proc{@c.new.x = 'a'}.must_raise(Sequel::InvalidValue)
  end

  it "should assign value if raise_on_typecast_failure is off and assigning invalid integer" do
    @c.raise_on_typecast_failure = false
    model = @c.new
    model.x = '1d'
    model.x.must_equal '1d'
  end

  it "should convert to float for a float field" do
    @c.db_schema = {:x=>{:type=>:float}}
    m = @c.new
    m.x = '1.3'
    m.x.must_equal 1.3
    m.x = 1
    m.x.must_equal 1.0
    m.x = 1.3
    m.x.must_equal 1.3
  end

  it "should raise an error if invalid data is used in an float field" do
    @c.db_schema = {:x=>{:type=>:float}}
    proc{@c.new.x = 'a'}.must_raise(Sequel::InvalidValue)
  end

  it "should assign value if raise_on_typecast_failure is off and assigning invalid float" do
    @c.raise_on_typecast_failure = false
    @c.db_schema = {:x=>{:type=>:float}}
    model = @c.new
    model.x = '1d'
    model.x.must_equal '1d'
  end

  it "should convert to BigDecimal for a decimal field" do
    @c.db_schema = {:x=>{:type=>:decimal}}
    m = @c.new
    bd = BigDecimal('1.0')
    m.x = '1.0'
    m.x.must_equal bd
    m.x = 1.0
    m.x.must_equal bd
    m.x = 1
    m.x.must_equal bd
    m.x = bd
    m.x.must_equal bd
    m.x = '0'
    m.x.must_equal 0
  end

  it "should raise an error if invalid data is used in an decimal field" do
    @c.db_schema = {:x=>{:type=>:decimal}}
    proc{@c.new.x = Date.today}.must_raise(Sequel::InvalidValue)
    proc{@c.new.x = 'foo'}.must_raise(Sequel::InvalidValue)
  end

  it "should assign value if raise_on_typecast_failure is off and assigning invalid decimal" do
    @c.raise_on_typecast_failure = false
    @c.db_schema = {:x=>{:type=>:decimal}}
    model = @c.new
    time = Time.now
    model.x = time
    model.x.must_equal time
  end

  it "should convert to string for a string field" do
    @c.db_schema = {:x=>{:type=>:string}}
    m = @c.new
    m.x = '1.3'
    m.x.must_equal '1.3'
    m.x = 1
    m.x.must_equal '1'
    m.x = 1.3
    m.x.must_equal '1.3'
  end

  it "should convert to boolean for a boolean field" do
    @c.db_schema = {:x=>{:type=>:boolean}}
    m = @c.new
    m.x = '1.3'
    m.x.must_equal true
    m.x = 1
    m.x.must_equal true
    m.x = 1.3
    m.x.must_equal true
    m.x = 't'
    m.x.must_equal true
    m.x = 'T'
    m.x.must_equal true
    m.x = 'y'
    m.x.must_equal true
    m.x = 'Y'
    m.x.must_equal true
    m.x = true
    m.x.must_equal true
    m.x = nil
    m.x.must_be_nil
    m.x = ''
    m.x.must_be_nil
    m.x = []
    m.x.must_be_nil
    m.x = 'f'
    m.x.must_equal false
    m.x = 'F'
    m.x.must_equal false
    m.x = 'false'
    m.x.must_equal false
    m.x = 'FALSE'
    m.x.must_equal false
    m.x = 'n'
    m.x.must_equal false
    m.x = 'N'
    m.x.must_equal false
    m.x = 'no'
    m.x.must_equal false
    m.x = 'NO'
    m.x.must_equal false
    m.x = '0'
    m.x.must_equal false
    m.x = 0
    m.x.must_equal false
    m.x = false
    m.x.must_equal false
  end

  it "should convert to date for a date field" do
    @c.db_schema = {:x=>{:type=>:date}}
    m = @c.new
    y = Date.new(2007,10,21)
    m.x = '2007-10-21'
    m.x.must_equal y
    m.x = Date.parse('2007-10-21')
    m.x.must_equal y
    m.x = Time.parse('2007-10-21')
    m.x.must_equal y
    m.x = DateTime.parse('2007-10-21')
    m.x.must_equal y
  end

  it "should accept a hash with symbol or string keys for a date field" do
    @c.db_schema = {:x=>{:type=>:date}}
    m = @c.new
    y = Date.new(2007,10,21)
    m.x = {:year=>2007, :month=>10, :day=>21}
    m.x.must_equal y
    m.x = {'year'=>'2007', 'month'=>'10', 'day'=>'21'}
    m.x.must_equal y
  end

  it "should raise an error if invalid data is used in a date field" do
    @c.db_schema = {:x=>{:type=>:date}}
    proc{@c.new.x = 'a'}.must_raise(Sequel::InvalidValue)
    proc{@c.new.x = 100}.must_raise(Sequel::InvalidValue)
  end

  it "should assign value if raise_on_typecast_failure is off and assigning invalid date" do
    @c.raise_on_typecast_failure = false
    @c.db_schema = {:x=>{:type=>:date}}
    model = @c.new
    model.x = 4
    model.x.must_equal 4
  end

  it "should convert to Sequel::SQLTime for a time field" do
    @c.db_schema = {:x=>{:type=>:time}}
    m = @c.new
    x = '10:20:30'
    y = Sequel::SQLTime.parse(x)
    m.x = x
    m.x.must_equal y
    m.x = y
    m.x.must_equal y
    m.x.must_be_kind_of(Sequel::SQLTime)
  end

  it "should accept a hash with symbol or string keys for a time field" do
    @c.db_schema = {:x=>{:type=>:time}}
    m = @c.new
    y = Time.parse('10:20:30')
    m.x = {:hour=>10, :minute=>20, :second=>30}
    m.x.must_equal y
    m.x = {'hour'=>'10', 'minute'=>'20', 'second'=>'30'}
    m.x.must_equal y
  end

  it "should raise an error if invalid data is used in a time field" do
    @c.db_schema = {:x=>{:type=>:time}}
    proc{@c.new.x = '0000'}.must_raise(Sequel::InvalidValue)
    proc{@c.new.x = Date.parse('2008-10-21')}.must_raise(Sequel::InvalidValue)
    proc{@c.new.x = DateTime.parse('2008-10-21')}.must_raise(Sequel::InvalidValue)
  end

  it "should assign value if raise_on_typecast_failure is off and assigning invalid time" do
    @c.raise_on_typecast_failure = false
    @c.db_schema = {:x=>{:type=>:time}}
    model = @c.new
    model.x = '0000'
    model.x.must_equal '0000'
  end

  it "should convert to the Sequel.datetime_class for a datetime field" do
    @c.db_schema = {:x=>{:type=>:datetime}}
    m = @c.new
    x = '2007-10-21T10:20:30-07:00'
    y = Time.parse(x)
    m.x = x
    m.x.must_equal y
    m.x = DateTime.parse(x)
    m.x.must_equal y
    m.x = Time.parse(x)
    m.x.must_equal y
    m.x = Date.parse('2007-10-21')
    m.x.must_equal Time.parse('2007-10-21')
    Sequel.datetime_class = DateTime
    y = DateTime.parse(x)
    m.x = x
    m.x.must_equal y
    m.x = DateTime.parse(x)
    m.x.must_equal y
    m.x = Time.parse(x)
    m.x.must_equal y
    m.x = Date.parse('2007-10-21')
    m.x.must_equal DateTime.parse('2007-10-21')
  end

  it "should accept a hash with symbol or string keys for a datetime field" do
    @c.db_schema = {:x=>{:type=>:datetime}}
    m = @c.new
    y = Time.parse('2007-10-21 10:20:30')
    m.x = {:year=>2007, :month=>10, :day=>21, :hour=>10, :minute=>20, :second=>30}
    m.x.must_equal y
    m.x = {'year'=>'2007', 'month'=>'10', 'day'=>'21', 'hour'=>'10', 'minute'=>'20', 'second'=>'30'}
    m.x.must_equal y
    Sequel.datetime_class = DateTime
    y = DateTime.parse('2007-10-21 10:20:30')
    m.x = {:year=>2007, :month=>10, :day=>21, :hour=>10, :minute=>20, :second=>30}
    m.x.must_equal y
    m.x = {'year'=>'2007', 'month'=>'10', 'day'=>'21', 'hour'=>'10', 'minute'=>'20', 'second'=>'30'}
    m.x.must_equal y
  end

  it "should raise an error if invalid data is used in a datetime field" do
    @c.db_schema = {:x=>{:type=>:datetime}}
    proc{@c.new.x = '0000'}.must_raise(Sequel::InvalidValue)
    Sequel.datetime_class = DateTime
    proc{@c.new.x = '0000'}.must_raise(Sequel::InvalidValue)
    proc{@c.new.x = 'a'}.must_raise(Sequel::InvalidValue)
  end

  it "should assign value if raise_on_typecast_failure is off and assigning invalid datetime" do
    @c.raise_on_typecast_failure = false
    @c.db_schema = {:x=>{:type=>:datetime}}
    model = @c.new
    model.x = '0000'
    model.x.must_equal '0000'
    Sequel.datetime_class = DateTime
    model = @c.new
    model.x = '0000'
    model.x.must_equal '0000'
    model.x = 'a'
    model.x.must_equal 'a'
  end
end

describe "Model#lock!" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      columns :id
    end
    @c.dataset = @c.dataset.with_fetch(:id=>1)
    DB.reset
  end
  
  it "should do nothing if the record is a new record" do
    o = @c.new
    def o._refresh(x) raise Sequel::Error; super(x) end
    x = o.lock!
    x.must_equal o
    DB.sqls.must_equal []
  end
    
  it "should refresh the record using for_update if it is not a new record" do
    o = @c.load(:id => 1)
    def o._refresh(x) instance_variable_set(:@a, 1); super(x) end
    x = o.lock!
    x.must_equal o
    o.instance_variable_get(:@a).must_equal 1
    DB.sqls.must_equal ["SELECT * FROM items WHERE (id = 1) LIMIT 1 FOR UPDATE"]
  end

  it "should refresh the record using the specified lock when it is not a new record and a style is given" do
    o = @c.load(:id => 1)
    def o._refresh(x) instance_variable_set(:@a, 1); super(x) end
    x = o.lock!('FOR NO KEY UPDATE')
    x.must_equal o
    o.instance_variable_get(:@a).must_equal 1
    DB.sqls.must_equal ["SELECT * FROM items WHERE (id = 1) LIMIT 1 FOR NO KEY UPDATE"]
  end
end

describe "Model#schema_type_class" do
  it "should return the class or array of classes for the given type symbol" do
    @c = Class.new(Sequel::Model(:items))
    @c.class_eval{@db_schema = {:id=>{:type=>:integer}}}
    @c.new.send(:schema_type_class, :id).must_equal Integer
  end
end
