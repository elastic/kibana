require_relative "spec_helper"

describe "Sequel::Plugins::AutoValidations" do
  before do
    db = Sequel.mock(:fetch=>proc{|sql| sql =~ /a{51}/ ? {:v=>0} : {:v=>1}})
    def db.schema_parse_table(*) true; end
    def db.schema(t, *)
      t = t.first_source if t.is_a?(Sequel::Dataset)
      return [] if t != :test
      [[:id, {:primary_key=>true, :type=>:integer, :allow_null=>false}],
       [:name, {:primary_key=>false, :type=>:string, :allow_null=>false, :max_length=>50}],
       [:num, {:primary_key=>false, :type=>:integer, :allow_null=>true}],
       [:d, {:primary_key=>false, :type=>:date, :allow_null=>false}],
       [:nnd, {:primary_key=>false, :type=>:string, :allow_null=>false, :default=>'nnd'}]]
    end
    def db.supports_index_parsing?() true end
    def db.indexes(t, *)
      raise if t.is_a?(Sequel::Dataset)
      return [] if t != :test
      {:a=>{:columns=>[:name, :num], :unique=>true}, :b=>{:columns=>[:num], :unique=>false}}
    end
    @c = Class.new(Sequel::Model(db[:test]))
    @c.send(:def_column_accessor, :id, :name, :num, :d, :nnd)
    @c.raise_on_typecast_failure = false
    @c.plugin :auto_validations
    @m = @c.new
    db.sqls
  end

  it "should have automatically created validations" do
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not present"], :name=>["is not present"])

    @m.name = ''
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not present"])

    @m.set(:d=>'/', :num=>'a', :name=>'1')
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not a valid date"], :num=>["is not a valid integer"])

    @m.set(:d=>Date.today, :num=>1)
    @m.valid?.must_equal false
    @m.errors.must_equal([:name, :num]=>["is already taken"])

    @m.set(:name=>'a'*51)
    @m.valid?.must_equal false
    @m.errors.must_equal(:name=>["is longer than 50 characters"])
  end

  it "should handle simple unique indexes correctly" do
    def (@c.db).indexes(t, *)
      raise if t.is_a?(Sequel::Dataset)
      return [] if t != :test
      {:a=>{:columns=>[:name], :unique=>true}}
    end
    @c.plugin :auto_validations
    @m.set(:name=>'foo', :d=>Date.today)
    @m.valid?.must_equal false
    @m.errors.must_equal(:name=>["is already taken"])
  end

  it "should validate using the underlying column values" do
    @c.send(:define_method, :name){super() * 2}
    @c.db.fetch = {:v=>0}
    @m.set(:d=>Date.today, :num=>1, :name=>'b'*26)
    @m.valid?.must_equal true
  end

  it "should handle databases that don't support index parsing" do
    def (@m.db).supports_index_parsing?() false end
    @m.model.send(:setup_auto_validations)
    @m.set(:d=>Date.today, :num=>1, :name=>'1')
    @m.valid?.must_equal true
  end

  it "should handle models that select from subqueries" do
    @c.set_dataset @c.dataset.from_self
    @c.send(:setup_auto_validations)
  end

  it "should support :not_null=>:presence option" do
    @c.plugin :auto_validations, :not_null=>:presence
    @m.set(:d=>Date.today, :num=>'')
    @m.valid?.must_equal false
    @m.errors.must_equal(:name=>["is not present"])
  end

  it "should automatically validate explicit nil values for columns with not nil defaults" do
    @m.set(:d=>Date.today, :name=>1, :nnd=>nil)
    @m.id = nil
    @m.valid?.must_equal false
    @m.errors.must_equal(:id=>["is not present"], :nnd=>["is not present"])
  end

  it "should allow skipping validations by type" do
    @c = Class.new(@c)
    @m = @c.new
    @m.skip_auto_validations(:not_null) do
      @m.valid?.must_equal true
      @m.nnd = nil
      @m.valid?.must_equal true
    end
    @m.set(:nnd => 'nnd')
    @c.skip_auto_validations(:not_null)
    @m.valid?.must_equal true
    @m.nnd = nil
    @m.valid?.must_equal true

    @m.set(:d=>'/', :num=>'a', :name=>'1')
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not a valid date"], :num=>["is not a valid integer"])

    @m.skip_auto_validations(:types, :unique) do
      @m.valid?.must_equal true
    end
    @m.skip_auto_validations(:types) do
      @m.valid?.must_equal false
      @m.errors.must_equal([:name, :num]=>["is already taken"])
    end
    @c.skip_auto_validations(:types)
    @m.valid?.must_equal false
    @m.errors.must_equal([:name, :num]=>["is already taken"])

    @m.skip_auto_validations(:unique) do
      @m.valid?.must_equal true
    end
    @c.skip_auto_validations(:unique)
    @m.valid?.must_equal true

    @m.set(:name=>'a'*51)
    @m.valid?.must_equal false
    @m.errors.must_equal(:name=>["is longer than 50 characters"])

    @m.skip_auto_validations(:max_length) do
      @m.valid?.must_equal true
    end
    @c.skip_auto_validations(:max_length)
    @m.valid?.must_equal true
  end

  it "should allow skipping all auto validations" do
    @c = Class.new(@c)
    @m = @c.new
    @m.skip_auto_validations(:all) do
      @m.valid?.must_equal true
      @m.set(:d=>'/', :num=>'a', :name=>'1')
      @m.valid?.must_equal true
      @m.set(:name=>'a'*51)
      @m.valid?.must_equal true
    end
    @m = @c.new
    @c.skip_auto_validations(:all)
    @m.valid?.must_equal true
    @m.set(:d=>'/', :num=>'a', :name=>'1')
    @m.valid?.must_equal true
    @m.set(:name=>'a'*51)
    @m.valid?.must_equal true
  end

  it "should work correctly in subclasses" do
    @c = Class.new(@c)
    @m = @c.new
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not present"], :name=>["is not present"])

    @m.set(:d=>'/', :num=>'a', :name=>'1')
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not a valid date"], :num=>["is not a valid integer"])

    @m.set(:d=>Date.today, :num=>1)
    @m.valid?.must_equal false
    @m.errors.must_equal([:name, :num]=>["is already taken"])

    @m.set(:name=>'a'*51)
    @m.valid?.must_equal false
    @m.errors.must_equal(:name=>["is longer than 50 characters"])
  end

  it "should work correctly in STI subclasses" do
    @c.plugin(:single_table_inheritance, :num, :model_map=>{1=>@c}, :key_map=>proc{[1, 2]})
    sc = Class.new(@c)
    @m = sc.new
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not present"], :name=>["is not present"])

    @m.set(:d=>'/', :num=>'a', :name=>'1')
    @m.valid?.must_equal false
    @m.errors.must_equal(:d=>["is not a valid date"], :num=>["is not a valid integer"])

    @m.db.sqls
    @m.set(:d=>Date.today, :num=>1)
    @m.valid?.must_equal false
    @m.errors.must_equal([:name, :num]=>["is already taken"])
    @m.db.sqls.must_equal ["SELECT count(*) AS count FROM test WHERE ((name = '1') AND (num = 1)) LIMIT 1"]

    @m.set(:name=>'a'*51)
    @m.valid?.must_equal false
    @m.errors.must_equal(:name=>["is longer than 50 characters"])
  end

  it "should work correctly when changing the dataset" do
    @c.set_dataset(@c.db[:foo])
    @c.new.valid?.must_equal true
  end

  it "should support setting validator options" do
    sc = Class.new(@c)
    sc.plugin :auto_validations, :max_length_opts=> {:message=> 'ml_message'}, :schema_types_opts=> {:message=> 'st_message'}, :explicit_not_null_opts=> {:message=> 'enn_message'}, :unique_opts=> {:message=> 'u_message'}

    @m = sc.new
    @m.set(:name=>'a'*51, :d => '/', :nnd => nil, :num=>1)
    @m.valid?.must_equal false
    @m.errors.must_equal(:name=>["ml_message"], :d=>["st_message"], :nnd=>["enn_message"])

    @m = sc.new
    @m.set(:name=>1, :num=>1, :d=>Date.today)
    @m.valid?.must_equal false
    @m.errors.must_equal([:name, :num]=>["u_message"])
  end

  it "should not allow modifying auto validation information for frozen model classes" do
    @c.freeze
    @c.auto_validate_not_null_columns.frozen?.must_equal true
    @c.auto_validate_explicit_not_null_columns.frozen?.must_equal true
    @c.auto_validate_max_length_columns.frozen?.must_equal true
    @c.auto_validate_unique_columns.frozen?.must_equal true
  end
end
