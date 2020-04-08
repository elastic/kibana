require_relative "spec_helper"

describe "index_caching extension" do
  before do
    @db = Sequel.connect('mock://postgres').extension(:index_caching)
    @indexes = {'"table"'=>{:table_idx_unique=>{:columns=>[:first_col, :second_col], :unique=>true, :deferrable=>nil}}}
    @filename = "spec/files/test_indexes_#$$.dump"
    @db.instance_variable_set(:@indexes, @indexes)
  end
  after do
    File.delete(@filename) if File.exist?(@filename)
  end

  it "#indexes should return cached index information" do
    @db.indexes(:table).must_equal @indexes['"table"']
    @db.indexes(:table, {}).must_equal @indexes['"table"']
  end 

  it "#indexes should skip cached information if given options" do
    @db.indexes(:table, :schema=>:b).must_equal({})
  end 

  it "Database should remove cached indexes when schema is changed" do
    @db.create_table(:table){Integer :a}
    @db.indexes(:table).must_equal({})
  end

  it "Database#freeze should allow cached information to work" do
    @db.freeze.indexes(:table).must_equal @indexes['"table"']
  end
  
  it "Database#freeze should allow removing index information" do
    @db.freeze
    @db.create_table(:table){Integer :a}
    @db.indexes(:table).must_equal({})
  end

  it "Database#dump_index_cache should dump the index cache to the given file" do
    File.exist?(@filename).must_equal false
    @db.dump_index_cache(@filename)
    File.exist?(@filename).must_equal true
    File.size(@filename).must_be :>,  0
  end

  it "Database#load_index_cache should load the index cache from the given file dumped by #dump_index_cache" do
    @db.dump_index_cache(@filename)
    db = Sequel::Database.new.extension(:index_caching)
    db.load_index_cache(@filename)
    db.extension(:index_caching)
    @db.instance_variable_get(:@indexes).must_equal @indexes
  end

  it "Database#dump_index_cache? should dump the index cache to the given file unless the file exists" do
    File.open(@filename, 'wb'){|f|}
    File.size(@filename).must_equal 0
    @db.dump_index_cache?(@filename)
    File.size(@filename).must_equal 0
  end

  it "Database#load_index_cache? should load the index cache from the given file if it exists" do
    db = Sequel::Database.new.extension(:index_caching)
    File.exist?(@filename).must_equal false
    db.load_index_cache?(@filename)
    db.instance_variable_get(:@indexes).must_equal({})
  end
end
