require_relative "spec_helper"

describe "schema_caching extension" do
  before do
    @db = Sequel.mock.extension(:schema_caching)
    @schemas = {'"table"'=>[[:column, {:db_type=>"integer", :default=>"nextval('table_id_seq'::regclass)", :allow_null=>false, :primary_key=>true, :type=>:integer, :ruby_default=>nil}]]}
    @filename = "spec/files/test_schema_#$$.dump" 
    @db.instance_variable_set(:@schemas, @schemas)
  end
  after do
    File.delete(@filename) if File.exist?(@filename)
  end

  it "Database#dump_schema_cache should dump cached schema to the given file" do
    File.exist?(@filename).must_equal false
    @db.dump_schema_cache(@filename)
    File.exist?(@filename).must_equal true
    File.size(@filename).must_be :>,  0
  end

  it "Database#dump_schema_cache/load_schema_cache should work with :callable_default values set in schema_post_process" do
    @schemas['"table"'][0][1][:callable_default] = lambda{1}
    @schemas['"table"'][0][1][:default] = 'call_1'
    @db.dump_schema_cache(@filename)
    db = Sequel.mock(:host=>'postgres').extension(:schema_caching)
    def db.schema_post_process(_)
      super.each{|_, c| c[:callable_default] = lambda{1} if c[:default] == 'call_1'}
    end
    db.load_schema_cache(@filename)
    db.schema(:table)[0][1][:callable_default].call.must_equal 1
  end

  it "Database#load_schema_cache should load cached schema from the given file dumped by #dump_schema_cache" do
    @db.dump_schema_cache(@filename)
    db = Sequel::Database.new.extension(:schema_caching)
    db.load_schema_cache(@filename)
    @db.instance_variable_get(:@schemas).must_equal @schemas
  end

  it "Database#load_schema_cache should have frozen string values in the schema caches" do
    @db.dump_schema_cache(@filename)
    db = Sequel.mock(:host=>'postgres').extension(:schema_caching)
    db.load_schema_cache(@filename)
    h = db.schema(:table)[0][1]
    h[:db_type].must_equal 'integer'
    h[:db_type].frozen?.must_equal true
    h[:default].must_equal "nextval('table_id_seq'::regclass)"
    h[:default].frozen?.must_equal true
  end

  it "Database#dump_schema_cache? should dump cached schema to the given file unless the file exists" do
    File.open(@filename, 'wb'){|f|}
    File.size(@filename).must_equal 0
    @db.dump_schema_cache?(@filename)
    File.size(@filename).must_equal 0
  end

  it "Database#load_schema_cache? should load cached schema from the given file if it exists" do
    db = Sequel::Database.new.extension(:schema_caching)
    File.exist?(@filename).must_equal false
    db.load_schema_cache?(@filename)
    db.instance_variable_get(:@schemas).must_equal({})
  end
end
