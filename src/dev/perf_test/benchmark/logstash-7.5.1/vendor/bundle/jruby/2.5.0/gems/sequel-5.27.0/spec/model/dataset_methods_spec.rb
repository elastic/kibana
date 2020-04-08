require_relative "spec_helper"

describe Sequel::Model::DatasetMethods, "#destroy"  do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      self::Destroyed = []
      def destroy
        model::Destroyed << self
      end
    end
    @d = @c.dataset
    @d = @d.with_fetch([{:id=>1}, {:id=>2}])
    DB.reset
  end

  it "should instantiate objects in the dataset and call destroy on each" do
    @d.destroy
    @c::Destroyed.collect{|x| x.values}.must_equal [{:id=>1}, {:id=>2}]
  end

  it "should return the number of records destroyed" do
    @d.destroy.must_equal 2
    @d = @d.with_fetch([[{:id=>1}], []])
    @d.destroy.must_equal 1
    @d.destroy.must_equal 0
  end

  it "should use a transaction if use_transactions is true for the model" do
    @c.use_transactions = true
    @d.destroy
    DB.sqls.must_equal ["BEGIN", "SELECT * FROM items", "COMMIT"]
  end

  it "should not use a transaction if use_transactions is false for the model" do
    @c.use_transactions = false
    @d.destroy
    DB.sqls.must_equal ["SELECT * FROM items"]
  end
end

describe Sequel::Model::DatasetMethods, "#as_hash"  do
  before do
    @c = Class.new(Sequel::Model(:items)) do
      set_primary_key :name
    end
    @d = @c.dataset
  end

  it "should result in a hash with primary key value keys and model object values" do
    @d = @d.with_fetch([{:name=>1}, {:name=>2}])
    h = @d.as_hash
    h.must_be_kind_of(Hash)
    a = h.to_a
    a.collect{|x| x[1].class}.must_equal [@c, @c]
    a.sort_by{|x| x[0]}.collect{|x| [x[0], x[1].values]}.must_equal [[1, {:name=>1}], [2, {:name=>2}]]
  end

  it "should be aliased as to_hash" do
    @d = @d.with_fetch([{:name=>1}, {:name=>2}])
    h = @d.to_hash
    h.must_be_kind_of(Hash)
    a = h.to_a
    a.collect{|x| x[1].class}.must_equal [@c, @c]
    a.sort_by{|x| x[0]}.collect{|x| [x[0], x[1].values]}.must_equal [[1, {:name=>1}], [2, {:name=>2}]]
  end

  it "should result in a hash with given value keys and model object values" do
    @d = @d.with_fetch([{:name=>1, :number=>3}, {:name=>2, :number=>4}])
    h = @d.as_hash(:number)
    h.must_be_kind_of(Hash)
    a = h.to_a
    a.collect{|x| x[1].class}.must_equal [@c, @c]
    a.sort_by{|x| x[0]}.collect{|x| [x[0], x[1].values]}.must_equal [[3, {:name=>1, :number=>3}], [4, {:name=>2, :number=>4}]]
  end

  it "should raise an error if the class doesn't have a primary key" do
    @c.no_primary_key
    proc{@d.as_hash}.must_raise(Sequel::Error)
  end
end

describe Sequel::Model::DatasetMethods  do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.columns :id
    @c.db.reset
  end

  it "#first should handle no primary key" do
    @c.no_primary_key
    @c.first.must_be_kind_of(@c)
    @c.db.sqls.must_equal ['SELECT * FROM items LIMIT 1']
  end

  it "#last should reverse order by primary key if not already ordered" do
    @c.last.must_be_kind_of(@c)
    @c.db.sqls.must_equal ['SELECT * FROM items ORDER BY id DESC LIMIT 1']
    @c.where(:id=>2).last(:foo=>2){{bar=>3}}.must_be_kind_of(@c)
    @c.db.sqls.must_equal ['SELECT * FROM items WHERE ((id = 2) AND (foo = 2) AND (bar = 3)) ORDER BY id DESC LIMIT 1']
  end

  it "#last should use existing order if there is one" do
    @c.order(:foo).last.must_be_kind_of(@c)
    @c.db.sqls.must_equal ['SELECT * FROM items ORDER BY foo DESC LIMIT 1']
  end

  it "#last should handle a composite primary key" do
    @c.set_primary_key [:id1, :id2]
    @c.last.must_be_kind_of(@c)
    @c.db.sqls.must_equal ['SELECT * FROM items ORDER BY id1 DESC, id2 DESC LIMIT 1']
  end

  it "#last should raise an error if no primary key" do
    @c.no_primary_key
    proc{@c.last}.must_raise(Sequel::Error)
  end

  it "#paged_each should order by primary key if not already ordered" do
    @c.paged_each{|r| r.must_be_kind_of(@c)}
    @c.db.sqls.must_equal ['BEGIN', 'SELECT * FROM items ORDER BY id LIMIT 1000 OFFSET 0', 'COMMIT']
    @c.paged_each(:rows_per_fetch=>5){|r|}
    @c.db.sqls.must_equal ['BEGIN', 'SELECT * FROM items ORDER BY id LIMIT 5 OFFSET 0', 'COMMIT']
  end

  it "#paged_each should use existing order if there is one" do
    @c.order(:foo).paged_each{|r| r.must_be_kind_of(@c)}
    @c.db.sqls.must_equal ['BEGIN', 'SELECT * FROM items ORDER BY foo LIMIT 1000 OFFSET 0', 'COMMIT']
  end

  it "#paged_each should handle a composite primary key" do
    @c.set_primary_key [:id1, :id2]
    @c.paged_each{|r| r.must_be_kind_of(@c)}
    @c.db.sqls.must_equal ['BEGIN', 'SELECT * FROM items ORDER BY id1, id2 LIMIT 1000 OFFSET 0', 'COMMIT']
  end

  it "#paged_each should raise an error if no primary key" do
    @c.no_primary_key
    proc{@c.paged_each{|r| }}.must_raise(Sequel::Error)
  end
end 

describe Sequel::Model::DatasetMethods, "#where_all"  do
  before do
    @c = Class.new(Sequel::Model(DB[:items].freeze))
    DB.reset
  end

  it "should filter dataset with condition, and return related rows" do
    5.times do
      @c.where_all(:id=>1).must_equal [@c.load(:id=>1, :x=>1)]
      @c.db.sqls.must_equal ['SELECT * FROM items WHERE (id = 1)']
    end
  end

  it "should yield each row to the given block" do
    5.times do
      a = []
      @c.where_all(:id=>1){|r| a << r}.must_equal [@c.load(:id=>1, :x=>1)]
      a.must_equal [@c.load(:id=>1, :x=>1)]
      @c.db.sqls.must_equal ['SELECT * FROM items WHERE (id = 1)']
    end
  end
end

describe Sequel::Model::DatasetMethods, "#where_each"  do
  before do
    @c = Class.new(Sequel::Model(DB[:items].freeze))
    DB.reset
  end

  it "should yield each row to the given block" do
    5.times do
      a = []
      @c.where_each(:id=>1){|r| a << r}
      a.must_equal [@c.load(:id=>1, :x=>1)]
      @c.db.sqls.must_equal ['SELECT * FROM items WHERE (id = 1)']
    end
  end
end

describe Sequel::Model::DatasetMethods, "#where_single_value"  do
  before do
    @c = Class.new(Sequel::Model(DB[:items].freeze))
    @c.class_eval do
      dataset_module do
        select :only_id, :id
      end
    end
    DB.reset
  end

  it "should return single value" do
    5.times do
      @c.only_id.where_single_value(:id=>1).must_equal 1
      @c.db.sqls.must_equal ['SELECT id FROM items WHERE (id = 1) LIMIT 1']
    end
  end
end
