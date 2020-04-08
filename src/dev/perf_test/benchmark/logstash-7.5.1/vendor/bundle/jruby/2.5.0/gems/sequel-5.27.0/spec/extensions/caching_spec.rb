require_relative "spec_helper"

describe Sequel::Model, "caching" do
  before do
    @cache_class = Class.new(Hash) do
      attr_accessor :ttl
      def set(k, v, ttl); self[k] = v; @ttl = ttl; end
      def get(k); self[k]; end
    end
    cache = @cache_class.new
    @cache = cache
    
    @memcached_class = Class.new(Hash) do
      attr_accessor :ttl
      def set(k, v, ttl); self[k] = v; @ttl = ttl; end
      def get(k); if self[k] then return self[k]; else raise ArgumentError; end end
      def delete(k); if self[k] then super; else raise ArgumentError; end end
    end
    cache2 = @memcached_class.new
    @memcached = cache2
    
    @c = Class.new(Sequel::Model(:items))
    @c.class_eval do
      plugin :caching, cache
      def self.name; 'Item' end
      
      columns :name, :id
    end
  
    @c3 = Class.new(Sequel::Model(:items))
    @c3.class_eval do
      plugin :caching, cache2
      def self.name; 'Item' end
      
      columns :name, :id
    end

    @c4 = Class.new(Sequel::Model(:items))
    @c4.class_eval do
      plugin :caching, cache2, :ignore_exceptions => true
      def self.name; 'Item' end
      
      columns :name, :id
    end
   
    
    @c2 = Class.new(@c) do
      def self.name; 'SubItem' end
    end    

    [@c, @c2, @c3, @c4].each do |c|
      c.dataset = c.dataset.with_fetch(:name => 'sharon'.dup, :id => 1).with_numrows(1)
    end

    @c.db.reset
  end
  
  it "should set the model's cache store" do
    @c.cache_store.wont_be_nil
    @c2.cache_store.wont_be_nil
  end
  
  it "should have a default ttl of 3600" do
    @c.cache_ttl.must_equal 3600
    @c2.cache_ttl.must_equal 3600
  end
  
  it "should take a ttl option" do
    c = Class.new(Sequel::Model(:items))
    c.plugin :caching, @cache, :ttl => 1234
    c.cache_ttl.must_equal 1234
    Class.new(c).cache_ttl.must_equal 1234
  end
  
  it "should allow overriding the ttl option via a plugin :caching call" do
    @c.plugin :caching, @cache, :ttl => 1234
    @c.cache_ttl.must_equal 1234
    Class.new(@c).cache_ttl.must_equal 1234
  end
  
  it "should offer a set_cache_ttl method for setting the ttl" do
    @c.cache_ttl.must_equal 3600
    @c.set_cache_ttl 1234
    @c.cache_ttl.must_equal 1234
    Class.new(@c).cache_ttl.must_equal 1234
  end
  
  it "should generate a cache key appropriate to the class via the Model#cache_key" do
    m = @c.new
    m.values[:id] = 1
    m.cache_key.must_equal "#{m.class}:1"
    m = @c2.new
    m.values[:id] = 1
    m.cache_key.must_equal "#{m.class}:1"
    
    # custom primary key
    @c.set_primary_key :ttt
    m = @c.new
    m.values[:ttt] = 333
    m.cache_key.must_equal "#{m.class}:333"
    c = Class.new(@c)
    m = c.new
    m.values[:ttt] = 333
    m.cache_key.must_equal "#{m.class}:333"
    
    # composite primary key
    @c.set_primary_key [:a, :b, :c]
    m = @c.new
    m.values[:a] = 123
    m.values[:c] = 456
    m.values[:b] = 789
    m.cache_key.must_equal "#{m.class}:123,789,456"
    c = Class.new(@c)
    m = c.new
    m.values[:a] = 123
    m.values[:c] = 456
    m.values[:b] = 789
    m.cache_key.must_equal "#{m.class}:123,789,456"
  end

  it "should generate a cache key via the Model.cache_key method" do
    @c.cache_key(1).must_equal "#{@c}:1"
    @c.cache_key([1, 2]).must_equal "#{@c}:1,2"
  end
  
  it "should raise error if attempting to generate cache_key and primary key value is null" do
    m = @c.new
    proc {m.cache_key}.must_raise(Sequel::Error)
    m.values[:id] = 1
    m.cache_key

    m = @c2.new
    proc {m.cache_key}.must_raise(Sequel::Error)
    m.values[:id] = 1
    m.cache_key
  end
  
  it "should not raise error if trying to save a new record" do
    @c.new(:name=>'blah').save
    @c.create(:name=>'blah')
    @c2.new(:name=>'blah').save
    @c2.create(:name=>'blah')
  end
  
  it "should set the cache when reading from the database" do
    @c.db.sqls.must_equal []
    @cache.must_be :empty?
    
    m = @c[1]
    @c.db.sqls.must_equal ['SELECT * FROM items WHERE id = 1']
    m.values.must_equal(:name=>"sharon", :id=>1)
    @cache[m.cache_key].must_equal m
    m2 = @c[1]
    @c.db.sqls.must_equal []
    m2.must_equal m
    m2.values.must_equal(:name=>"sharon", :id=>1)

    m = @c2[1]
    @c.db.sqls.must_equal ['SELECT * FROM items WHERE id = 1']
    m.values.must_equal(:name=>"sharon", :id=>1)
    @cache[m.cache_key].must_equal m
    m2 = @c2[1]
    @c.db.sqls.must_equal []
    m2.must_equal m
    m2.values.must_equal(:name=>"sharon", :id=>1)
  end

  it "should handle lookups by nil primary keys" do
    @c[nil].must_be_nil
    @c.db.sqls.must_equal []
  end
  
  it "should delete the cache when writing to the database" do
    m = @c[1]
    @cache[m.cache_key].must_equal m
    m.name = 'hey'
    m.save
    @cache.has_key?(m.cache_key).must_equal false
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE id = 1", "UPDATE items SET name = 'hey' WHERE (id = 1)"]

    m = @c2[1]
    @cache[m.cache_key].must_equal m
    m.name = 'hey'
    m.save
    @cache.has_key?(m.cache_key).must_equal false
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE id = 1", "UPDATE items SET name = 'hey' WHERE (id = 1)"]
  end

  it "should delete the cache when deleting the record" do
    m = @c[1]
    @cache[m.cache_key].must_equal m
    m.delete
    @cache.has_key?(m.cache_key).must_equal false
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE id = 1", "DELETE FROM items WHERE id = 1"]

    m = @c2[1]
    @cache[m.cache_key].must_equal m
    m.delete
    @cache.has_key?(m.cache_key).must_equal false
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE id = 1", "DELETE FROM items WHERE id = 1"]
  end
  
  it "should support #[] as a shortcut to #find with hash" do
    m = @c[:id => 3]
    @cache[m.cache_key].must_be_nil
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE (id = 3) LIMIT 1"]
    m = @c[1]
    @cache[m.cache_key].must_equal m
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE id = 1"]
    @c[:id => 4]
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE (id = 4) LIMIT 1"]

    m = @c2[:id => 3]
    @cache[m.cache_key].must_be_nil
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE (id = 3) LIMIT 1"]
    m = @c2[1]
    @cache[m.cache_key].must_equal m
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE id = 1"]
    @c2[:id => 4]
    @c.db.sqls.must_equal ["SELECT * FROM items WHERE (id = 4) LIMIT 1"]
  end
  
  it "should support ignore_exception option" do
    c = Class.new(Sequel::Model(:items))
    c.plugin :caching, @cache, :ignore_exceptions => true
    Class.new(c).cache_ignore_exceptions.must_equal true
  end
  
  it "should raise an exception if cache_store is memcached and ignore_exception is not enabled" do
    proc{@c3[1]}.must_raise ArgumentError
    m = @c3.new.save
    proc{m.update({:name=>'blah'})}.must_raise ArgumentError
  end
  
  it "should rescue an exception if cache_store is memcached and ignore_exception is enabled" do
    @c4[1].values.must_equal(:name => 'sharon', :id => 1)
    @c4.dataset = @c4.dataset.with_fetch(:name => 'sharon', :id => 1, :x=>1)
    m = @c4.new.save
    m.update({:name=>'blah'})
    m.values.must_equal(:name => 'blah', :id => 1, :x => 1)
  end
  
  it "should support Model.cache_get_pk for getting a value from the cache by primary key" do
    @c.cache_get_pk(1).must_be_nil
    m = @c[1]
    @c.cache_get_pk(1).must_equal m
  end
  
  it "should support Model.cache_delete_pk for removing a value from the cache by primary key" do
    @c[1]
    @c.cache_get_pk(1).wont_equal nil
    @c.cache_delete_pk(1).must_be_nil
    @c.cache_get_pk(1).must_be_nil
  end

  it "should support overriding the cache key prefix" do
    c2 = Class.new(@c)
    def c2.cache_key_prefix; "ceetwo" end
    c3 = Class.new(c2)
    @c.cache_key(:id).wont_equal c2.cache_key(:id)
    c2.cache_key(:id).must_equal c3.cache_key(:id)
    
    @c[1]
    c2.cache_get_pk(1).must_be_nil
    m = c2[1]
    c2.cache_get_pk(1).values.must_equal @c[1].values
    c3.cache_get_pk(1).values.must_equal m.values

    m.name << m.name
    m.save
    c2[1].values.must_equal c3[1].values
  end
end
