require_relative "spec_helper"

require 'yaml'
require 'json'

describe "Serialization plugin" do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      no_primary_key
      columns :id, :abc, :def, :ghi
    end
    DB.reset
  end
  
  it "should allow setting additional serializable attributes via plugin :serialization call" do
    @c.plugin :serialization, :yaml, :abc
    @c.create(:abc => 1, :def=> 2)
    DB.sqls.map{|s| s.sub("1\n...", '1')}.must_equal ["INSERT INTO items (def, abc) VALUES (2, '--- 1\n')"]

    @c.plugin :serialization, :marshal, :def
    @c.create(:abc => 1, :def=> 1)
    DB.sqls.map{|s| s.sub("1\n...", '1')}.must_equal ["INSERT INTO items (abc, def) VALUES ('--- 1\n', 'BAhpBg==\n')"]
    
    @c.plugin :serialization, :json, :ghi
    @c.create(:ghi => [123])
    DB.sqls.must_equal ["INSERT INTO items (ghi) VALUES ('[123]')"]
  end

  it "should handle validations of underlying column" do
    @c.plugin :serialization, :yaml, :abc
    o = @c.new
    def o.validate
      errors.add(:abc, "not present") unless self[:abc]
    end
    o.valid?.must_equal false
    o.abc = {}
    o.valid?.must_equal true
  end

  it "should set column values even when not validating" do
    @c.set_primary_key :id
    @c.plugin :serialization, :yaml, :abc
    @c.load({:id=>1}).set(:abc=>{}).save(:validate=>false)
    DB.sqls.last.gsub("\n", '').must_equal "UPDATE items SET abc = '--- {}' WHERE (id = 1)"
  end

  it "should allow serializing attributes to yaml" do
    @c.plugin :serialization, :yaml, :abc
    @c.create(:abc => 1)
    @c.create(:abc => "hello")

    DB.sqls.map{|s| s.sub("...\n", '')}.must_equal ["INSERT INTO items (abc) VALUES ('--- 1\n')", "INSERT INTO items (abc) VALUES ('--- hello\n')"]
  end

  it "should allow serializing attributes to marshal" do
    @c.plugin :serialization, :marshal, :abc
    @c.create(:abc => 1)
    @c.create(:abc => "hello")
    x = [Marshal.dump("hello")].pack('m')

    DB.sqls.must_equal [ \
      "INSERT INTO items (abc) VALUES ('BAhpBg==\n')", \
      "INSERT INTO items (abc) VALUES ('#{x}')", \
    ]
  end
  
  it "should allow serializing attributes to json" do
    @c.plugin :serialization, :json, :ghi
    @c.create(:ghi => [1])
    @c.create(:ghi => ["hello"])
    
    x = ["hello"].to_json
    DB.sqls.must_equal [ \
      "INSERT INTO items (ghi) VALUES ('[1]')", \
      "INSERT INTO items (ghi) VALUES ('#{x}')", \
    ]
  end

  it "should allow serializing attributes using arbitrary callable" do
    @c.plugin :serialization, [proc{|s| s.reverse}, proc{}], :abc
    @c.create(:abc => "hello")
    DB.sqls.must_equal ["INSERT INTO items (abc) VALUES ('olleh')"]
  end
  
  it "should raise an error if specificing serializer as an unregistered symbol" do
    proc{@c.plugin :serialization, :foo, :abc}.must_raise(Sequel::Error)
  end
  
  it "should translate values to and from yaml serialization format using accessor methods" do
    @c.set_primary_key :id
    @c.plugin :serialization, :yaml, :abc, :def
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => "--- 1\n", :def => "--- hello\n")

    o = @c.first
    o.id.must_equal 1
    o.abc.must_equal 1
    o.abc.must_equal 1
    o.def.must_equal "hello"
    o.def.must_equal "hello"

    o.update(:abc => 23)
    @c.create(:abc => [1, 2, 3])
    DB.sqls.must_equal ["SELECT * FROM items LIMIT 1",
      "UPDATE items SET abc = '#{23.to_yaml}' WHERE (id = 1)",
      "INSERT INTO items (abc) VALUES ('#{[1, 2, 3].to_yaml}')",
      "SELECT * FROM items WHERE id = 10"]
  end

  it "should translate values to and from marshal serialization format using accessor methods" do
    @c.set_primary_key :id
    @c.plugin :serialization, :marshal, :abc, :def
    @c.dataset = @c.dataset.with_fetch([:id => 1, :abc =>[Marshal.dump(1)].pack('m'), :def =>[Marshal.dump('hello')].pack('m')])

    o = @c.first
    o.id.must_equal 1
    o.abc.must_equal 1
    o.abc.must_equal 1
    o.def.must_equal "hello"
    o.def.must_equal "hello"

    o.update(:abc => 23)
    @c.create(:abc => [1, 2, 3])
    DB.sqls.must_equal ["SELECT * FROM items LIMIT 1",
      "UPDATE items SET abc = '#{[Marshal.dump(23)].pack('m')}' WHERE (id = 1)",
      "INSERT INTO items (abc) VALUES ('#{[Marshal.dump([1, 2, 3])].pack('m')}')",
      "SELECT * FROM items WHERE id = 10"]
  end
  
  it "should handle old non-base-64 encoded marshal serialization format" do
    @c.set_primary_key :id
    @c.plugin :serialization, :marshal, :abc, :def
    @c.dataset = @c.dataset.with_fetch([:id => 1, :abc =>Marshal.dump(1), :def =>Marshal.dump('hello')])

    o = @c.first
    o.abc.must_equal 1
    o.def.must_equal "hello"
  end

  it "should raise exception for bad marshal data" do
    @c.set_primary_key :id
    @c.plugin :serialization, :marshal, :abc, :def
    @c.dataset = @c.dataset.with_fetch([:id => 1, :abc =>'foo', :def =>'bar'])

    o = @c.first
    proc{o.abc}.must_raise TypeError, ArgumentError
    proc{o.def}.must_raise TypeError, ArgumentError
  end
  
  it "should translate values to and from json serialization format using accessor methods" do
    @c.set_primary_key :id
    @c.plugin :serialization, :json, :abc, :def
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => [1].to_json, :def => ["hello"].to_json)
    
    o = @c.first
    o.id.must_equal 1
    o.abc.must_equal [1]
    o.abc.must_equal [1]
    o.def.must_equal ["hello"]
    o.def.must_equal ["hello"]
    
    o.update(:abc => [23])
    @c.create(:abc => [1,2,3])
    
    DB.sqls.must_equal ["SELECT * FROM items LIMIT 1",
      "UPDATE items SET abc = '#{[23].to_json}' WHERE (id = 1)",
      "INSERT INTO items (abc) VALUES ('#{[1,2,3].to_json}')",
      "SELECT * FROM items WHERE id = 10"]
  end

  it "should translate values to and from arbitrary callables using accessor methods" do
    @c.set_primary_key :id
    @c.plugin :serialization, [proc{|s| s.reverse}, proc{|s| s.reverse}], :abc, :def
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => 'cba', :def => 'olleh')
    
    o = @c.first
    o.id.must_equal 1
    o.abc.must_equal 'abc'
    o.abc.must_equal 'abc'
    o.def.must_equal "hello"
    o.def.must_equal "hello"
    
    o.update(:abc => 'foo')
    @c.create(:abc => 'bar')
    
    DB.sqls.must_equal ["SELECT * FROM items LIMIT 1",
      "UPDATE items SET abc = 'oof' WHERE (id = 1)",
      "INSERT INTO items (abc) VALUES ('rab')",
      "SELECT * FROM items WHERE id = 10"]
  end

  it "should handle registration of custom serializer/deserializer pairs" do
    @c.set_primary_key :id
    require_relative '../../lib/sequel/plugins/serialization'
    Sequel::Plugins::Serialization.register_format(:reverse, proc{|s| s.reverse}, proc{|s| s.reverse})
    @c.plugin :serialization, :reverse, :abc, :def
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => 'cba', :def => 'olleh')
    
    o = @c.first
    o.id.must_equal 1
    o.abc.must_equal 'abc'
    o.abc.must_equal 'abc'
    o.def.must_equal "hello"
    o.def.must_equal "hello"
    
    o.update(:abc => 'foo')
    @c.create(:abc => 'bar')
    
    DB.sqls.must_equal ["SELECT * FROM items LIMIT 1",
      "UPDATE items SET abc = 'oof' WHERE (id = 1)",
      "INSERT INTO items (abc) VALUES ('rab')",
      "SELECT * FROM items WHERE id = 10"]
  end

  it "should copy serialization formats and columns to subclasses" do
    @c.set_primary_key :id
    @c.plugin :serialization, :yaml, :abc, :def
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => "--- 1\n", :def => "--- hello\n")

    o = Class.new(@c).first
    o.id.must_equal 1
    o.abc.must_equal 1
    o.abc.must_equal 1
    o.def.must_equal "hello"
    o.def.must_equal "hello"

    o.update(:abc => 23)
    Class.new(@c).create(:abc => [1, 2, 3])
    DB.sqls.must_equal ["SELECT * FROM items LIMIT 1",
      "UPDATE items SET abc = '#{23.to_yaml}' WHERE (id = 1)",
      "INSERT INTO items (abc) VALUES ('#{[1, 2, 3].to_yaml}')",
      "SELECT * FROM items WHERE id = 10"]
  end

  it "should clear the deserialized columns when refreshing" do
    @c.set_primary_key :id
    @c.plugin :serialization, :yaml, :abc, :def
    o = @c.load(:id => 1, :abc => "--- 1\n", :def => "--- hello\n")
    o.abc = 23
    o.deserialized_values.length.must_equal 1
    o.abc.must_equal 23
    o.refresh
    o.deserialized_values.length.must_equal 0
  end
  
  it "should not clear the deserialized columns when refreshing after saving a new object" do
    @c.set_primary_key :id
    @c.plugin :serialization, :yaml, :abc, :def
    o = @c.new(:abc => "--- 1\n", :def => "--- hello\n")
    o.deserialized_values.length.must_equal 2
    o.save
    o.deserialized_values.length.must_equal 2
  end
  
  it "should not clear the deserialized columns when refreshing after saving a new object with insert_select" do
    @c.set_primary_key :id
    @c.plugin :serialization, :yaml, :abc, :def
    @c.dataset = @c.dataset.with_extend do
      def supports_insert_select?; true end
      def insert_select(*) {:id=>1} end
    end
    o = @c.new(:abc => "--- 1\n", :def => "--- hello\n")
    o.deserialized_values.length.must_equal 2
    o.save
    o.deserialized_values.length.must_equal 2
  end
  
  it "should raise an error if calling internal serialization methods with bad columns" do
    @c.set_primary_key :id
    @c.plugin :serialization
    o = @c.load(:id => 1, :abc => "--- 1\n", :def => "--- hello\n")
    lambda{o.send(:serialize_value, :abc, 1)}.must_raise(Sequel::Error)
    lambda{o.send(:deserialize_value, :abc, "--- hello\n")}.must_raise(Sequel::Error)
  end

  it "should add the accessors to a module included in the class, so they can be easily overridden" do
    @c.class_eval do
      def abc
        "#{super}-blah"
      end
    end
    @c.plugin :serialization, :yaml, :abc
    o = @c.load(:abc => "--- 1\n")
    o.abc.must_equal "1-blah"
  end

  it "should call super to get the deserialized value from a previous accessor" do
    m = Module.new do
      def abc
        "--- #{@values[:abc]*3}\n"
      end
    end
    @c.send(:include, m)
    @c.plugin :serialization, :yaml, :abc
    o = @c.load(:abc => 3)
    o.abc.must_equal 9
  end

  it "should work correctly with frozen instances" do
    @c.set_primary_key :id
    @c.plugin :serialization, :yaml, :abc, :def
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => "--- 1\n", :def => "--- hello\n")

    o = @c.first
    o.freeze
    o.abc.must_equal 1
    o.abc.must_equal 1
    o.def.must_equal "hello"
    o.def.must_equal "hello"
    proc{o.abc = 2}.must_raise
    proc{o.def = 'h'}.must_raise
  end

  it "should have dup duplicate internal structures" do
    @c.plugin :serialization, :yaml, :abc, :def
    o = @c.new
    o.dup.deserialized_values.must_equal o.deserialized_values
    o.dup.deserialized_values.wont_be_same_as(o.deserialized_values)
  end

  it "should have changed_columns include serialized columns if those columns have changed" do
    @c.plugin :serialization, :yaml, :abc, :def
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => "--- 1\n", :def => "--- hello\n")
    o = @c.first
    o.changed_columns.must_equal []
    o.abc = 1
    o.changed_columns.must_equal []
    o.abc = 1
    o.changed_columns.must_equal []
    o.abc = 2
    o.changed_columns.must_equal [:abc]
    o.def = 'hello'
    o.changed_columns.must_equal [:abc]
    o.def = 'hello'
    o.changed_columns.must_equal [:abc]
    o.def = 'hello2'
    o.changed_columns.must_equal [:abc, :def]
  end

  it "should update column_changes if the dirty plugin is used" do
    @c.plugin :serialization, :yaml, :abc, :def
    @c.plugin :dirty
    @c.dataset = @c.dataset.with_fetch(:id => 1, :abc => "--- 1\n", :def => "--- hello\n")
    o = @c.first
    o.column_changes.must_equal({})
    o.abc = 1
    o.column_changes.must_equal({})
    o.abc = 1
    o.column_changes.must_equal({})
    o.abc = 2
    o.column_changes.must_equal(:abc=>[1, 2])
    o.def = 'hello'
    o.column_changes.must_equal(:abc=>[1, 2])
    o.def = 'hello'
    o.column_changes.must_equal(:abc=>[1, 2])
    o.def = 'hello2'
    o.column_changes.must_equal(:abc=>[1, 2], :def=>["hello", "hello2"])
  end

  it "should freeze serialization metadata when freezing model class" do
    @c.plugin :serialization, :yaml, :abc, :def
    @c.freeze
    @c.serialization_map.frozen?.must_equal true
    @c.deserialization_map.frozen?.must_equal true
  end
end
