require_relative "spec_helper"

describe "force_encoding plugin" do
  before do
    @c = Class.new(Sequel::Model)
    @c.columns :id, :x
    @c.plugin :force_encoding, 'UTF-8'
    @e1 = Encoding.find('UTF-8')
  end

  it "should force encoding to given encoding on load" do
    s = 'blah'.dup
    s.force_encoding('US-ASCII')
    o = @c.load(:id=>1, :x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal @e1
  end
  
  it "should force encoding to given encoding when setting column values" do
    s = 'blah'.dup
    s.force_encoding('US-ASCII')
    o = @c.new(:x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal @e1
  end
  
  it "should not force encoding of blobs to given encoding on load" do
    s = Sequel.blob('blah'.dup.force_encoding('BINARY'))
    o = @c.load(:id=>1, :x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal Encoding.find('BINARY')
  end
  
  it "should not force encoding of blobs to given encoding when setting column values" do
    s = Sequel.blob('blah'.dup.force_encoding('BINARY'))
    o = @c.new(:x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal Encoding.find('BINARY')
  end
  
  it "should work correctly when given a frozen string" do
    s = 'blah'.dup
    s.force_encoding('US-ASCII')
    s.freeze
    o = @c.new(:x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal @e1
  end
  
  it "should have a forced_encoding class accessor" do
    s = 'blah'.dup
    s.force_encoding('US-ASCII')
    @c.forced_encoding = 'Windows-1258'
    o = @c.load(:id=>1, :x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal Encoding.find('Windows-1258')
  end
  
  it "should not force encoding if forced_encoding is nil" do
    s = 'blah'.dup
    s.force_encoding('US-ASCII')
    @c.forced_encoding = nil
    o = @c.load(:id=>1, :x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal Encoding.find('US-ASCII')
  end
  
  it "should work correctly when subclassing" do
    c = Class.new(@c)
    s = 'blah'.dup
    s.force_encoding('US-ASCII')
    o = c.load(:id=>1, :x=>s)
    o.x.must_equal 'blah'
    o.x.encoding.must_equal @e1
    
    c.plugin :force_encoding, 'UTF-16LE'
    s = String.new
    s.force_encoding('US-ASCII')
    o = c.load(:id=>1, :x=>s)
    o.x.must_equal ''
    o.x.encoding.must_equal Encoding.find('UTF-16LE')
    
    @c.plugin :force_encoding, 'UTF-32LE'
    s = String.new
    s.force_encoding('US-ASCII')
    o = @c.load(:id=>1, :x=>s)
    o.x.must_equal ''
    o.x.encoding.must_equal Encoding.find('UTF-32LE')
    
    s = String.new
    s.force_encoding('US-ASCII')
    o = c.load(:id=>1, :x=>s)
    o.x.must_equal ''
    o.x.encoding.must_equal Encoding.find('UTF-16LE')
  end
  
  it "should work when saving new model instances" do
    o = @c.new
    @c.dataset = DB[:a].with_extend do
      def first
        s = 'blah'.dup
        s.force_encoding('US-ASCII')
        {:id=>1, :x=>s}
      end
    end
    @c.instance_variable_set(:@fast_pk_lookup_sql, nil)
    o.save
    o.x.must_equal 'blah'
    o.x.encoding.must_equal @e1
  end
  
  it "should work when refreshing model instances" do
    o = @c.load(:id=>1, :x=>'as'.dup)
    @c.dataset = DB[:a].with_extend do
      def first
        s = 'blah'.dup
        s.force_encoding('US-ASCII')
        {:id=>1, :x=>s}
      end
    end
    @c.instance_variable_set(:@fast_pk_lookup_sql, nil)
    o.refresh
    o.x.must_equal 'blah'
    o.x.encoding.must_equal @e1
  end
end 
