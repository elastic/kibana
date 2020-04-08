require_relative "spec_helper"

describe "Composition plugin" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.plugin :composition
    @c.columns :id, :year, :month, :day
    @o = @c.load(:id=>1, :year=>1, :month=>2, :day=>3)
    DB.reset
  end
  
  it ".composition should add compositions" do
    @o.wont_respond_to(:date)
    @c.composition :date, :mapping=>[:year, :month, :day]
    @o.date.must_equal Date.new(1, 2, 3)
  end

  it "loading the plugin twice should not remove existing compositions" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @c.plugin :composition
    @c.compositions.keys.must_equal [:date]
  end

  it ".composition should raise an error if :composer and :decomposer options are not present and :mapping option is not provided" do
    proc{@c.composition :date}.must_raise(Sequel::Error)
    @c.composition :date, :composer=>proc{}, :decomposer=>proc{}
    @c.composition :date, :mapping=>[]
  end

  it "should handle validations of underlying columns" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    o = @c.new
    def o.validate
      [:year, :month, :day].each{|c| errors.add(c, "not present") unless send(c)}
    end
    o.valid?.must_equal false
    o.date = Date.new(1, 2, 3)
    o.valid?.must_equal true
  end

  it "should have decomposer work with column_conflicts plugin" do
    @c.plugin :column_conflicts
    @c.set_column_conflict! :year
    @c.composition :date, :mapping=>[:year, :month, :day]
    o = @c.new
    def o.validate
      [:year, :month, :day].each{|c| errors.add(c, "not present") unless send(c)}
    end
    o.valid?.must_equal false
    o.date = Date.new(1, 2, 3)
    o.valid?.must_equal true
  end

  it "should set column values even when not validating" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @c.load(id: 1).set(:date=>Date.new(4, 8, 12)).save(:validate=>false)
    DB.sqls.must_equal ['UPDATE items SET year = 4, month = 8, day = 12 WHERE (id = 1)']
  end

  it ".compositions should return the reflection hash of compositions" do
    @c.compositions.must_equal({})
    @c.composition :date, :mapping=>[:year, :month, :day]
    @c.compositions.keys.must_equal [:date]
    r = @c.compositions.values.first
    r[:mapping].must_equal [:year, :month, :day]
    r[:composer].must_be_kind_of Proc
    r[:decomposer].must_be_kind_of Proc
  end

  it "#compositions should be a hash of cached values of compositions" do
    @o.compositions.must_equal({})
    @c.composition :date, :mapping=>[:year, :month, :day]
    @o.date
    @o.compositions.must_equal(:date=>Date.new(1, 2, 3))
  end

  it "should work with custom :composer and :decomposer options" do
    @c.composition :date, :composer=>proc{Date.new(year+1, month+2, day+3)}, :decomposer=>proc{[:year, :month, :day].each{|s| self.send("#{s}=", date.send(s) * 2)}}
    @o.date.must_equal Date.new(2, 4, 6)
    @o.save
    DB.sqls.must_equal ['UPDATE items SET year = 4, month = 8, day = 12 WHERE (id = 1)']
  end

  it "should allow call super in composition getter and setter method definition in class" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @c.class_eval do
      def date
        super + 1
      end
      def date=(v)
        super(v - 3)
      end
    end
    @o.date.must_equal Date.new(1, 2, 4)
    @o.compositions[:date].must_equal Date.new(1, 2, 3)
    @o.date = Date.new(1, 3, 5)
    @o.compositions[:date].must_equal Date.new(1, 3, 2)
    @o.date.must_equal Date.new(1, 3, 3)
  end

  it "should mark the object as modified whenever the composition is set" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @o.modified?.must_equal false
    @o.date = Date.new(3, 4, 5)
    @o.modified?.must_equal true
  end

  it "should only decompose existing compositions" do
    called = false
    @c.composition :date, :composer=>proc{}, :decomposer=>proc{called = true}
    called.must_equal false
    @o.save
    called.must_equal false
    @o.date = Date.new(1,2,3)
    called.must_equal false
    @o.save_changes
    called.must_equal true
  end

  it "should clear compositions cache when refreshing" do
    @c.composition :date, :composer=>proc{}, :decomposer=>proc{}
    @o.date = Date.new(3, 4, 5)
    @o.refresh
    @o.compositions.must_equal({})
  end

  it "should not clear compositions cache when refreshing after save" do
    @c.composition :date, :composer=>proc{}, :decomposer=>proc{}
    @c.create(:date=>Date.new(3, 4, 5)).compositions.must_equal(:date=>Date.new(3, 4, 5))
  end

  it "should not clear compositions cache when saving with insert_select" do
    @c.dataset = @c.dataset.with_extend do
      def supports_insert_select?; true end
      def insert_select(*) {:id=>1} end
    end
    @c.composition :date, :composer=>proc{}, :decomposer=>proc{}
    @c.create(:date=>Date.new(3, 4, 5)).compositions.must_equal(:date=>Date.new(3, 4, 5))
  end

  it "should instantiate compositions lazily" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @o.compositions.must_equal({})
    @o.date
    @o.compositions.must_equal(:date=>Date.new(1,2,3))
  end

  it "should cache value of composition" do
    times = 0
    @c.composition :date, :composer=>proc{times+=1}, :decomposer=>proc{}
    times.must_equal 0
    @o.date
    times.must_equal 1
    @o.date
    times.must_equal 1
  end

  it ":class option should take an string, symbol, or class" do
    @c.composition :date1, :class=>'Date', :mapping=>[:year, :month, :day]
    @c.composition :date2, :class=>:Date, :mapping=>[:year, :month, :day]
    @c.composition :date3, :class=>Date, :mapping=>[:year, :month, :day]
    @o.date1.must_equal Date.new(1, 2, 3)
    @o.date2.must_equal Date.new(1, 2, 3)
    @o.date3.must_equal Date.new(1, 2, 3)
  end

  it ":mapping option should work with a single array of symbols" do
    c = Class.new do
      def initialize(y, m)
        @y, @m = y, m
      end
      def year
        @y * 2
      end
      def month
        @m * 3
      end
    end
    @c.composition :date, :class=>c, :mapping=>[:year, :month]
    @o.date.year.must_equal 2
    @o.date.month.must_equal 6
    @o.date = c.new(3, 4)
    @o.save
    DB.sqls.must_equal ['UPDATE items SET year = 6, month = 12, day = 3 WHERE (id = 1)']
  end

  it ":mapping option should work with an array of two pairs of symbols" do
    c = Class.new do
      def initialize(y, m)
        @y, @m = y, m
      end
      def y
        @y * 2
      end
      def m
        @m * 3
      end
    end
    @c.composition :date, :class=>c, :mapping=>[[:year, :y], [:month, :m]]
    @o.date.y.must_equal 2
    @o.date.m.must_equal 6
    @o.date = c.new(3, 4)
    @o.save
    DB.sqls.must_equal ['UPDATE items SET year = 6, month = 12, day = 3 WHERE (id = 1)']
  end

  it ":mapping option :composer should return nil if all values are nil" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @c.new.date.must_be_nil
  end

  it ":mapping option :decomposer should set all related fields to nil if nil" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @o.date = nil
    @o.save
    DB.sqls.must_equal ['UPDATE items SET year = NULL, month = NULL, day = NULL WHERE (id = 1)']
  end

  it "should work with frozen instances" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @o.freeze
    @o.date.must_equal Date.new(1, 2, 3)
    proc{@o.date = Date.today}.must_raise
  end

  it "should have #dup duplicate compositions" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @o.date.must_equal Date.new(1, 2, 3)
    @o.dup.compositions.must_equal @o.compositions
    @o.dup.compositions.wont_be_same_as(@o.compositions)
  end

  it "should work correctly with subclasses" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    c = Class.new(@c)
    o = c.load(:id=>1, :year=>1, :month=>2, :day=>3)
    o.date.must_equal Date.new(1, 2, 3)
    o.save
    DB.sqls.must_equal ['UPDATE items SET year = 1, month = 2, day = 3 WHERE (id = 1)']
  end

  it "should freeze composition metadata when freezing model class" do
    @c.composition :date, :mapping=>[:year, :month, :day]
    @c.freeze
    @c.compositions.frozen?.must_equal true
    @c.compositions[:date].frozen?.must_equal true
  end
end
