require_relative "spec_helper"


describe "string_agg extension" do
  dbf = lambda do |db_type|
    db = Sequel.connect("mock://#{db_type}")
    db.extension :string_agg
    db
  end

  before(:all) do
    Sequel.extension :string_agg
  end
  before do
    @sa1 = Sequel.string_agg(:c)
    @sa2 = Sequel.string_agg(:c, '-')
    @sa3 = Sequel.string_agg(:c, '-').order(:o)
    @sa4 = Sequel.string_agg(:c).order(:o).distinct
  end

  it "should use existing method" do
    db = Sequel.mock
    db.extend_datasets do
      def string_agg_sql_append(sql, sa)
        sql << "sa(#{sa.expr})"
      end
    end
    db.extension :string_agg
    db.literal(Sequel.string_agg(:c)).must_equal "sa(c)"
  end

  it "should correctly literalize on Postgres" do
    ds = dbf.call(:postgres).dataset.with_quote_identifiers(false)
    ds.literal(@sa1).must_equal "string_agg(c, ',')"
    ds.literal(@sa2).must_equal "string_agg(c, '-')"
    ds.literal(@sa3).must_equal "string_agg(c, '-' ORDER BY o)"
    ds.literal(@sa4).must_equal "string_agg(DISTINCT c, ',' ORDER BY o)"
  end

  it "should correctly literalize on SQLAnywhere" do
    ds = dbf.call(:sqlanywhere).dataset.with_quote_identifiers(false).with_extend{def input_identifier(v) v.to_s end}
    ds.literal(@sa1).must_equal "list(c, ',')"
    ds.literal(@sa2).must_equal "list(c, '-')"
    ds.literal(@sa3).must_equal "list(c, '-' ORDER BY o)"
    ds.literal(@sa4).must_equal "list(DISTINCT c, ',' ORDER BY o)"
  end

  it "should correctly literalize on MySQL, H2, HSQLDB" do
    [:mysql, :h2, :hsqldb].each do |type|
      db = dbf.call(type)
      db.define_singleton_method(:database_type){type}
      ds = db.dataset.with_quote_identifiers(false).with_extend{def input_identifier(v) v.to_s end}
      ds.literal(@sa1).upcase.must_equal "GROUP_CONCAT(C SEPARATOR ',')"
      ds.literal(@sa2).upcase.must_equal "GROUP_CONCAT(C SEPARATOR '-')"
      ds.literal(@sa3).upcase.must_equal "GROUP_CONCAT(C ORDER BY O SEPARATOR '-')"
      ds.literal(@sa4).upcase.must_equal "GROUP_CONCAT(DISTINCT C ORDER BY O SEPARATOR ',')"
    end
  end

  it "should correctly literalize on Oracle and DB2" do
    [:oracle, :db2].each do |type|
      ds = dbf.call(type).dataset.with_quote_identifiers(false).with_extend{def input_identifier(v) v.to_s end}
      ds.literal(@sa1).must_equal "listagg(c, ',') WITHIN GROUP (ORDER BY 1)"
      ds.literal(@sa2).must_equal "listagg(c, '-') WITHIN GROUP (ORDER BY 1)"
      ds.literal(@sa3).must_equal "listagg(c, '-') WITHIN GROUP (ORDER BY o)"
      proc{ds.literal(@sa4)}.must_raise Sequel::Error
    end
  end

  it "should raise Sequel::Error on unsupported database" do
    proc{dbf.call(:foo).literal(@sa1)}.must_raise Sequel::Error
  end

  it "should handle order without arguments" do
    db = dbf.call(:postgres)
    db.dataset.with_quote_identifiers(false).literal(@sa1.order).must_equal "string_agg(c, ',')"
  end

  it "should handle operations on object" do
    ds = dbf.call(:postgres).dataset.with_quote_identifiers(false)
    ds.literal(@sa1 + 'b').must_equal "(string_agg(c, ',') || 'b')"
    ds.literal(@sa1.like('b')).must_equal "(string_agg(c, ',') LIKE 'b')"
    ds.literal(@sa1 < 'b').must_equal "(string_agg(c, ',') < 'b')"
    ds.literal(@sa1.as(:b)).must_equal "string_agg(c, ',') AS b"
    ds.literal(@sa1.cast(:b)).must_equal "CAST(string_agg(c, ',') AS b)"
    ds.literal(@sa1.desc).must_equal "string_agg(c, ',') DESC"
    ds.literal(@sa1 =~ /a/).must_equal "(string_agg(c, ',') ~ 'a')"
    ds.literal(@sa1.sql_subscript(1)).must_equal "(string_agg(c, ','))[1]"
  end
end
