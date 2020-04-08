require_relative "spec_helper"

describe "Sequel::Plugins::StaticCache" do
  before do
    @db = Sequel.mock
    @db.fetch = [{:id=>1}, {:id=>2}]
    @db.numrows = 1
    @c = Class.new(Sequel::Model(@db[:t]))
    @c.columns :id, :name
  end

  it "should not attempt to validate objects" do
    @c.send(:define_method, :validate){errors.add(:name, 'bad')}
    @c.plugin(:static_cache)
    @c.map{|o| o.valid?}.must_equal [true, true]
  end

  static_cache_specs = shared_description do
    it "should use a ruby hash as a cache of all model instances" do
      @c.cache.must_equal(1=>@c.load(:id=>1), 2=>@c.load(:id=>2))
      @c.cache[1].must_be_same_as(@c1)
      @c.cache[2].must_be_same_as(@c2)
    end

    it "should make .[] method with primary key use the cache" do
      @c[1].must_equal @c1
      @c[2].must_equal @c2
      @c[3].must_be_nil
      @c[[1, 2]].must_be_nil
      @c[nil].must_be_nil
      @c[].must_be_nil
      @db.sqls.must_equal []
    end

    it "should have .[] with a hash not use the cache" do
      @db.fetch = {:id=>2}
      @c[:id=>2].must_equal @c2
      @db.sqls.must_equal ['SELECT * FROM t WHERE (id = 2) LIMIT 1']
    end

    it "should support cache_get_pk" do
      @c.cache_get_pk(1).must_equal @c1
      @c.cache_get_pk(2).must_equal @c2
      @c.cache_get_pk(3).must_be_nil
      @db.sqls.must_equal []
    end

    it "should have first just returns instances without sending a query" do
      @c.first.must_equal @c1
      @c.first(2).must_equal [@c1, @c2]
      @c.first(0).must_equal []
      @db.sqls.must_equal []
    end

    it "should have first just returns instances with sending a query" do
      @db.fetch = lambda do |s|
        case s
        when /id = '?(\d+)'?/
          id = $1.to_i
          id <= 2 ? { id: id } : nil
        when /id >= '?(\d+)'?/
          id = $1.to_i
          id <= 2 ? (id..2).map { |i| { id: i } } : []
        end
      end

      @c.first(id: 2).must_equal @c2
      @c.first(id: '2').must_equal @c2
      @c.first(id: 3).must_be_nil
      @c.first { id >= 2 }.must_equal @c2
      @c.first(2) { id >= 1 }.must_equal [@c1, @c2]
      @c.first(Sequel.lit('id = ?', 2)).must_equal @c2
      @db.sqls.must_equal [
        "SELECT * FROM t WHERE (id = 2) LIMIT 1",
        "SELECT * FROM t WHERE (id = '2') LIMIT 1",
        "SELECT * FROM t WHERE (id = 3) LIMIT 1",
        "SELECT * FROM t WHERE (id >= 2) LIMIT 1",
        "SELECT * FROM t WHERE (id >= 1) LIMIT 2",
        "SELECT * FROM t WHERE (id = 2) LIMIT 1"
      ]
    end

    it "should have each just iterate over the hash's values without sending a query" do
      a = []
      @c.each{|o| a << o}
      a = a.sort_by{|o| o.id}
      a.first.must_equal @c1
      a.last.must_equal @c2
      @db.sqls.must_equal []
    end

    it "should have map just iterate over the hash's values without sending a query if no argument is given" do
      @c.map{|v| v.id}.sort.must_equal [1, 2]
      @db.sqls.must_equal []
    end

    it "should have count with no argument or block not issue a query" do
      @c.count.must_equal 2
      @db.sqls.must_equal []
    end

    it "should have count with argument or block not issue a query" do
      @db.fetch = [[{:count=>1}], [{:count=>2}]]
      @c.count(:a).must_equal 1
      @c.count{b}.must_equal 2
      @db.sqls.must_equal ["SELECT count(a) AS count FROM t LIMIT 1", "SELECT count(b) AS count FROM t LIMIT 1"]
    end

    it "should have map not send a query if given an argument" do
      @c.map(:id).sort.must_equal [1, 2]
      @db.sqls.must_equal []
      @c.map([:id,:id]).sort.must_equal [[1,1], [2,2]]
      @db.sqls.must_equal []
    end

    it "should have map without a block or argument not raise an exception or issue a query" do
      @c.map.to_a.must_equal @c.all
      @db.sqls.must_equal []
    end

    it "should have map without a block not return a frozen object" do
      @c.map.frozen?.must_equal false
    end

    it "should have map without a block return an Enumerator" do
      @c.map.class.must_equal Enumerator
    end

    it "should have map with a block and argument raise" do
      proc{@c.map(:id){}}.must_raise(Sequel::Error)
    end

    it "should have other enumerable methods work without sending a query" do
      a = @c.sort_by{|o| o.id}
      a.first.must_equal @c1
      a.last.must_equal @c2
      @db.sqls.must_equal []
    end

    it "should have all return all objects" do
      a = @c.all.sort_by{|o| o.id}
      a.first.must_equal @c1
      a.last.must_equal @c2
      @db.sqls.must_equal []
    end

    it "should have all not return a frozen object" do
      @c.all.frozen?.must_equal false
    end

    it "should have all return things in dataset order" do
      @c.all.must_equal [@c1, @c2]
    end

    it "should have all receiving block" do
      a = []
      b = @c.all { |o| a << o }
      a.must_equal [@c1, @c2]
      a.must_equal b
      @db.sqls.must_equal []
    end

    it "should have as_hash/to_hash without arguments run without a query" do
      a = @c.to_hash
      a.must_equal(1=>@c1, 2=>@c2)
      a[1].must_equal @c1
      a[2].must_equal @c2

      a = @c.as_hash
      a.must_equal(1=>@c1, 2=>@c2)
      a[1].must_equal @c1
      a[2].must_equal @c2
      @db.sqls.must_equal []
    end

    it "should have as_hash handle :hash option" do
      h = {}
      a = @c.as_hash(nil, nil, :hash=>h)
      a.must_be_same_as h
      a.must_equal(1=>@c1, 2=>@c2)
      a[1].must_equal @c1
      a[2].must_equal @c2

      h = {}
      a = @c.as_hash(:id, nil, :hash=>h)
      a.must_be_same_as h
      a.must_equal(1=>@c1, 2=>@c2)
      a[1].must_equal @c1
      a[2].must_equal @c2

      @db.sqls.must_equal []
    end

    it "should have as_hash with arguments return results without a query" do
      a = @c.as_hash(:id)
      a.must_equal(1=>@c1, 2=>@c2)
      a[1].must_equal @c1
      a[2].must_equal @c2

      a = @c.as_hash([:id])
      a.must_equal([1]=>@c1, [2]=>@c2)
      a[[1]].must_equal @c1
      a[[2]].must_equal @c2

      @c.as_hash(:id, :id).must_equal(1=>1, 2=>2)
      @c.as_hash([:id], :id).must_equal([1]=>1, [2]=>2)
      @c.as_hash(:id, [:id]).must_equal(1=>[1], 2=>[2])
      @c.as_hash([:id], [:id]).must_equal([1]=>[1], [2]=>[2])

      @db.sqls.must_equal []
    end

    it "should have as_hash not return a frozen object" do
      @c.as_hash.frozen?.must_equal false
    end

    it "should have to_hash_groups without arguments return the cached objects without a query" do
      a = @c.to_hash_groups(:id)
      a.must_equal(1=>[@c1], 2=>[@c2])
      a[1].first.must_equal @c1
      a[2].first.must_equal @c2

      a = @c.to_hash_groups([:id])
      a.must_equal([1]=>[@c1], [2]=>[@c2])
      a[[1]].first.must_equal @c1
      a[[2]].first.must_equal @c2

      @c.to_hash_groups(:id, :id).must_equal(1=>[1], 2=>[2])
      @c.to_hash_groups([:id], :id).must_equal([1]=>[1], [2]=>[2])
      @c.to_hash_groups(:id, [:id]).must_equal(1=>[[1]], 2=>[[2]])
      @c.to_hash_groups([:id], [:id]).must_equal([1]=>[[1]], [2]=>[[2]])

      @db.sqls.must_equal []
    end

    it "should have to_hash_groups handle :hash option" do
      h = {}
      a = @c.to_hash_groups(:id, nil, :hash=>h)
      a.must_be_same_as h
      a.must_equal(1=>[@c1], 2=>[@c2])
      a[1].first.must_equal @c1
      a[2].first.must_equal @c2
    end

    it "should have as_hash_groups without arguments return the cached objects without a query" do
      a = @c.to_hash_groups(:id)
      a.must_equal(1=>[@c1], 2=>[@c2])
      a[1].first.must_equal @c1
      a[2].first.must_equal @c2

      a = @c.to_hash_groups([:id])
      a.must_equal([1]=>[@c1], [2]=>[@c2])
      a[[1]].first.must_equal @c1
      a[[2]].first.must_equal @c2

      @c.to_hash_groups(:id, :id).must_equal(1=>[1], 2=>[2])
      @c.to_hash_groups([:id], :id).must_equal([1]=>[1], [2]=>[2])
      @c.to_hash_groups(:id, [:id]).must_equal(1=>[[1]], 2=>[[2]])
      @c.to_hash_groups([:id], [:id]).must_equal([1]=>[[1]], [2]=>[[2]])

      @db.sqls.must_equal []
    end

    it "subclasses should work correctly" do
      c = Class.new(@c)
      c.all.must_equal [c.load(:id=>1), c.load(:id=>2)]
      c.as_hash.must_equal(1=>c.load(:id=>1), 2=>c.load(:id=>2))
      @db.sqls.must_equal ['SELECT * FROM t']
    end

    it "set_dataset should work correctly" do
      ds = @c.dataset.from(:t2).columns(:id).with_fetch(:id=>3)
      @c.dataset = ds
      @c.all.must_equal [@c.load(:id=>3)]
      @c.as_hash.must_equal(3=>@c.load(:id=>3))
      @c.as_hash[3].must_equal @c.all.first
      @db.sqls.must_equal ['SELECT * FROM t2']
    end

    it "should have load_cache" do
      a = @c.all.sort_by{|o| o.id}
      a.first.must_equal @c1
      a.last.must_equal @c2
      @db.sqls.must_equal []

      @c.load_cache

      a = @c.all.sort_by{|o| o.id}
      a.first.must_equal @c1
      a.last.must_equal @c2
      @db.sqls.must_equal ['SELECT * FROM t']
    end
  end

  describe "without options" do
    before do
      @c.plugin :static_cache
      @c1 = @c.cache[1]
      @c2 = @c.cache[2]
      @db.sqls
    end

    include static_cache_specs

    it "should work correctly with composite keys" do
      @db.fetch = [{:id=>1, :id2=>1}, {:id=>2, :id2=>1}]
      @c = Class.new(Sequel::Model(@db[:t]))
      @c.columns :id, :id2
      @c.set_primary_key([:id, :id2])
      @c.plugin :static_cache
      @db.sqls
      @c1 = @c.cache[[1, 2]]
      @c2 = @c.cache[[2, 1]]
      @c[[1, 2]].must_be_same_as(@c1)
      @c[[2, 1]].must_be_same_as(@c2)
      @db.sqls.must_equal []
    end

    it "all of the static cache values (model instances) should be frozen" do
      @c.all.all?{|o| o.frozen?}.must_equal true
    end

    it "should make .[] method with primary key return cached instances" do
      @c[1].must_be_same_as(@c1)
      @c[2].must_be_same_as(@c2)
    end

    it "should have cache_get_pk return cached instances" do
      @c.cache_get_pk(1).must_be_same_as(@c1)
      @c.cache_get_pk(2).must_be_same_as(@c2)
    end

    it "should have each yield cached objects" do
      a = []
      @c.each{|o| a << o}
      a = a.sort_by{|o| o.id}
      a.first.must_be_same_as(@c1)
      a.last.must_be_same_as(@c2)
    end

    it "should have other enumerable methods work yield cached objects" do
      a = @c.sort_by{|o| o.id}
      a.first.must_be_same_as(@c1)
      a.last.must_be_same_as(@c2)
    end

    it "should have all return cached instances" do
      a = @c.all.sort_by{|o| o.id}
      a.first.must_be_same_as(@c1)
      a.last.must_be_same_as(@c2)
    end

    it "should have as_hash without arguments use cached instances" do
      a = @c.as_hash
      a[1].must_be_same_as(@c1)
      a[2].must_be_same_as(@c2)
    end

    it "should have as_hash with arguments return cached instances" do
      a = @c.as_hash(:id)
      a[1].must_be_same_as(@c1)
      a[2].must_be_same_as(@c2)

      a = @c.as_hash([:id])
      a[[1]].must_be_same_as(@c1)
      a[[2]].must_be_same_as(@c2)
    end

    it "should have to_hash_groups without single argument return the cached instances" do
      a = @c.to_hash_groups(:id)
      a[1].first.must_be_same_as(@c1)
      a[2].first.must_be_same_as(@c2)

      a = @c.to_hash_groups([:id])
      a[[1]].first.must_be_same_as(@c1)
      a[[2]].first.must_be_same_as(@c2)
    end

    it "should not allow the saving of new objects" do
      proc{@c.create}.must_raise(Sequel::HookFailed)
    end

    it "should not allow the saving of existing objects" do
      @db.fetch = {:id=>1}
      proc{@c.first(:id=>1).save}.must_raise(Sequel::HookFailed)
    end

    it "should not allow the destroying of existing objects" do
      @db.fetch = {:id=>1}
      proc{@c.first(:id=>1).destroy}.must_raise(Sequel::HookFailed)
    end
  end

  describe "with :frozen=>false option" do
    before do
      @c.plugin :static_cache, :frozen=>false
      @c1 = @c.cache[1]
      @c2 = @c.cache[2]
      @db.sqls
    end

    include static_cache_specs

    it "record retrieved by primary key should not be frozen" do
      @c[1].frozen?.must_equal false
      @c.cache_get_pk(1).frozen?.must_equal false
    end

    it "none of values returned in #all should be frozen" do
      @c.all.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values yielded by each should be frozen" do
      a = []
      @c.each{|o| a << o}
      a.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values yielded by Enumerable method should be frozen" do
      @c.sort_by{|o| o.id}.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values returned by map without an argument or block should be frozen" do
      @c.map{|o| o}.all?{|o| !o.frozen?}.must_equal true
      @c.map.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values in the hash returned by as_hash without an argument should be frozen" do
      @c.as_hash.values.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values in the hash returned by as_hash with a single argument should be frozen" do
      @c.as_hash(:id).values.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values in the hash returned by as_hash with a single array argument should be frozen" do
      @c.as_hash([:id, :id]).values.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values in the hash returned by to_hash_groups with a single argument should be frozen" do
      @c.to_hash_groups(:id).values.flatten.all?{|o| !o.frozen?}.must_equal true
    end

    it "none of values in the hash returned by to_hash_groups with a single array argument should be frozen" do
      @c.to_hash_groups([:id, :id]).values.flatten.all?{|o| !o.frozen?}.must_equal true
    end

    it "should not automatically update the cache when creating new model objects" do
      o = @c.new
      o.id = 3
      @db.autoid = 3
      @db.fetch = [[{:id=>1}, {:id=>2}, {:id=>3}], [{:id=>3}]]
      o.save
      @c[3].must_be_nil
    end

    it "should not automatically update the cache when updating model objects" do
      o = @c[2]
      @db.fetch = [[{:id=>1}, {:id=>2, :name=>'a'}]]
      o.update(:name=>'a')
      @c[2].values.must_equal(:id=>2)
    end

    it "should not automatically update the cache when updating model objects" do
      o = @c[2]
      @db.fetch = [[{:id=>1}]]
      o.destroy
      @c[2].must_equal @c2
    end
  end
end
