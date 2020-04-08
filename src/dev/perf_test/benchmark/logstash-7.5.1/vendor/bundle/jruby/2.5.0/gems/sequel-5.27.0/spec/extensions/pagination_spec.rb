require_relative "spec_helper"

describe "A paginated dataset" do
  before do
    count = @count = [153]
    @d = Sequel.mock.dataset.extension(:pagination).with_extend{define_method(:count){count.first}}
    @paginated = @d.paginate(1, 20)
  end
  
  it "should raise an error if the dataset already has a limit" do
    proc{@d.limit(10).paginate(1,10)}.must_raise(Sequel::Error)
    proc{@paginated.paginate(2,20)}.must_raise(Sequel::Error)
    proc{@d.limit(10).each_page(10){|ds|}}.must_raise(Sequel::Error)
    proc{@d.limit(10).each_page(10)}.must_raise(Sequel::Error)
  end
  
  it "should set the limit and offset options correctly" do
    @paginated.opts[:limit].must_equal 20
    @paginated.opts[:offset].must_equal 0
  end
  
  it "should set the page count correctly" do
    @paginated.page_count.must_equal 8
    @d.paginate(1, 50).page_count.must_equal 4

    @count[0] = 0
    @d.paginate(1, 50).page_count.must_equal 1
  end
  
  it "should set the current page number correctly" do
    @paginated.current_page.must_equal 1
    @d.paginate(3, 50).current_page.must_equal 3
  end
  
  it "should return the next page number or nil if we're on the last" do
    @paginated.next_page.must_equal 2
    @d.paginate(4, 50).next_page.must_be_nil
  end
  
  it "should return the previous page number or nil if we're on the first" do
    @paginated.prev_page.must_be_nil
    @d.paginate(4, 50).prev_page.must_equal 3
  end
  
  it "should return the page range" do
    @paginated.page_range.must_equal(1..8)
    @d.paginate(4, 50).page_range.must_equal(1..4)
  end
  
  it "should return the record range for the current page" do
    @paginated.current_page_record_range.must_equal(1..20)
    @d.paginate(4, 50).current_page_record_range.must_equal(151..153)
    @d.paginate(5, 50).current_page_record_range.must_equal(0..0)
  end

  it "should return the record count for the current page" do
    @paginated.current_page_record_count.must_equal 20
    @d.paginate(3, 50).current_page_record_count.must_equal 50
    @d.paginate(4, 50).current_page_record_count.must_equal 3
    @d.paginate(5, 50).current_page_record_count.must_equal 0
  end

  it "should know if current page is last page" do
    @paginated.last_page?.must_equal false
    @d.paginate(2, 20).last_page?.must_equal false
    @d.paginate(5, 30).last_page?.must_equal false
    @d.paginate(6, 30).last_page?.must_equal true

    @count[0] = 0
    @d.paginate(1, 30).last_page?.must_equal true
    @d.paginate(2, 30).last_page?.must_equal false
  end

  it "should know if current page is first page" do
    @paginated.first_page?.must_equal true
    @d.paginate(1, 20).first_page?.must_equal true
    @d.paginate(2, 20).first_page?.must_equal false
  end

  it "should work with fixed sql" do
    ds = @d.clone(:sql => 'select * from blah')
    @count[0] = 150
    ds.paginate(2, 50).sql.must_equal 'SELECT * FROM (select * from blah) AS t1 LIMIT 50 OFFSET 50'
  end
end

describe "Dataset#each_page" do
  before do
    @d = Sequel.mock[:items].extension(:pagination).with_extend{def count; 153 end}
  end
  
  it "should raise an error if the dataset already has a limit" do
    proc{@d.limit(10).each_page(10){}}.must_raise(Sequel::Error)
  end
  
  it "should iterate over each page in the resultset as a paginated dataset" do
    a = []
    @d.each_page(50) {|p| a << p}
    a.map {|p| p.sql}.must_equal [
      'SELECT * FROM items LIMIT 50 OFFSET 0',
      'SELECT * FROM items LIMIT 50 OFFSET 50',
      'SELECT * FROM items LIMIT 50 OFFSET 100',
      'SELECT * FROM items LIMIT 50 OFFSET 150',
    ]
  end

  it "should return an enumerator if no block is given" do
    enum = @d.each_page(50)
    enum.map {|p| p.sql}.must_equal [
      'SELECT * FROM items LIMIT 50 OFFSET 0',
      'SELECT * FROM items LIMIT 50 OFFSET 50',
      'SELECT * FROM items LIMIT 50 OFFSET 100',
      'SELECT * FROM items LIMIT 50 OFFSET 150',
    ]
  end
end
