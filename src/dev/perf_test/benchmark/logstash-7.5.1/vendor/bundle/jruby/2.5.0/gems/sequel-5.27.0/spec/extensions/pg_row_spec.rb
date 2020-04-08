require_relative "spec_helper"

describe "pg_row extension" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    @db.extension(:pg_array, :pg_row)
    @m = Sequel::Postgres::PGRow
    @db.sqls
  end

  it "should parse record objects as arrays" do
    a = @db.conversion_procs[2249].call("(a,b,c)")
    a.class.must_equal(@m::ArrayRow)
    a.to_a.must_be_kind_of(Array)
    a[0].must_equal 'a'
    a.must_equal %w'a b c'
    a.db_type.must_be_nil
    @db.literal(a).must_equal "ROW('a', 'b', 'c')"
  end

  it "should parse arrays of record objects as arrays of arrays" do
    as = @db.conversion_procs[2287].call('{"(a,b,c)","(d,e,f)"}')
    as.must_equal [%w'a b c', %w'd e f']
    as.each do |a|
      a.class.must_equal(@m::ArrayRow)
      a.to_a.must_be_kind_of(Array)
      a.db_type.must_be_nil
    end
    @db.literal(as).must_equal "ARRAY[ROW('a', 'b', 'c'),ROW('d', 'e', 'f')]::record[]"
  end

  it "should be able to register custom parsing of row types as array-like objects" do
    klass = @m::ArrayRow.subclass(:foo)
    parser = @m::Parser.new(:converter=>klass)
    a = parser.call("(a,b,c)")
    a.class.must_equal(klass)
    a.to_a.must_be_kind_of(Array)
    a[0].must_equal 'a'
    a.must_equal %w'a b c'
    a.db_type.must_equal :foo
    @db.literal(a).must_equal "ROW('a', 'b', 'c')::foo"
  end

  it "should be able to register custom parsing of row types as hash-like objects" do
    klass = @m::HashRow.subclass(:foo, [:a, :b, :c])
    parser = @m::Parser.new(:converter=>klass, :columns=>[:a, :b, :c])
    a = parser.call("(a,b,c)")
    a.class.must_equal(klass)
    a.to_hash.must_be_kind_of(Hash)
    a[:a].must_equal 'a'
    a.must_equal(:a=>'a', :b=>'b', :c=>'c')
    a.db_type.must_equal :foo
    a.columns.must_equal [:a, :b, :c]
    @db.literal(a).must_equal "ROW('a', 'b', 'c')::foo"
  end

  it "should raise an error if attempting to literalize a HashRow without column information" do
    h = @m::HashRow.call(:a=>'a', :b=>'b', :c=>'c')
    proc{@db.literal(h)}.must_raise(Sequel::Error)
  end

  it "should be able to manually override db_type per ArrayRow instance" do
    a = @m::ArrayRow.call(%w'a b c')
    a.db_type = :foo
    @db.literal(a).must_equal "ROW('a', 'b', 'c')::foo"
  end

  it "should be able to manually override db_type and columns per HashRow instance" do
    h = @m::HashRow.call(:a=>'a', :c=>'c', :b=>'b')
    h.db_type = :foo
    h.columns = [:a, :b, :c]
    @db.literal(h).must_equal "ROW('a', 'b', 'c')::foo"
  end

  it "should correctly split an empty row" do
    @m::Splitter.new("()").parse.must_equal [nil]
  end

  it "should correctly split a row with a single value" do
    @m::Splitter.new("(1)").parse.must_equal %w'1'
  end

  it "should correctly split a row with multiple values" do
    @m::Splitter.new("(1,2)").parse.must_equal %w'1 2'
  end

  it "should correctly NULL values when splitting" do
    @m::Splitter.new("(1,)").parse.must_equal ['1', nil]
  end

  it "should correctly empty string values when splitting" do
    @m::Splitter.new('(1,"")').parse.must_equal ['1', '']
  end

  it "should handle quoted values when splitting" do
    @m::Splitter.new('("1","2")').parse.must_equal %w'1 2'
  end

  it "should handle escaped backslashes in quoted values when splitting" do
    @m::Splitter.new('("\\\\1","2\\\\")').parse.must_equal ['\\1', '2\\']
  end

  it "should handle doubled quotes in quoted values when splitting" do
    @m::Splitter.new('("""1","2""")').parse.must_equal ['"1', '2"']
  end

  it "should correctly convert types when parsing into an array" do
    @m::Parser.new(:column_converters=>[proc{|s| s*2}, proc{|s| s*3}, proc{|s| s*4}]).call("(a,b,c)").must_equal %w'aa bbb cccc'
  end

  it "should correctly convert types into hashes if columns are known" do
    @m::Parser.new(:columns=>[:a, :b, :c]).call("(a,b,c)").must_equal(:a=>'a', :b=>'b', :c=>'c')
  end

  it "should correctly handle type conversion when converting into hashes" do
    @m::Parser.new(:column_converters=>[proc{|s| s*2}, proc{|s| s*3}, proc{|s| s*4}], :columns=>[:a, :b, :c]).call("(a,b,c)").must_equal(:a=>'aa', :b=>'bbb', :c=>'cccc')
  end

  it "should correctly wrap arrays when converting" do
    @m::Parser.new(:converter=>proc{|s| [:foo, s]}).call("(a,b,c)").must_equal [:foo, %w'a b c']
  end

  it "should correctly wrap hashes when converting" do
    @m::Parser.new(:converter=>proc{|s| [:foo, s]}, :columns=>[:a, :b, :c]).call("(a,b,c)").must_equal [:foo, {:a=>'a', :b=>'b', :c=>'c'}]
  end

  it "should have parser store reflection information" do
    p = @m::Parser.new(:oid=>1, :column_oids=>[2], :columns=>[:a], :converter=>Array, :typecaster=>Hash, :column_converters=>[Array])
    p.oid.must_equal 1
    p.column_oids.must_equal [2]
    p.columns.must_equal [:a]
    p.converter.must_equal Array
    p.typecaster.must_equal Hash
    p.column_converters.must_equal [Array]
  end

  it "should handle ArrayRows and HashRows in bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg(@m::ArrayRow.call(["1", "abc\\'\","]), nil).must_equal '("1","abc\\\\\'\\",")'
    @db.bound_variable_arg(@m::HashRow.subclass(nil, [:a, :b]).call(:a=>"1", :b=>"abc\\'\","), nil).must_equal '("1","abc\\\\\'\\",")'
  end

  it "should handle ArrayRows and HashRows in arrays in bound variables" do
    @db.bound_variable_arg(1, nil).must_equal 1
    @db.bound_variable_arg([@m::ArrayRow.call(["1", "abc\\'\","])], nil).must_equal '{"(\\"1\\",\\"abc\\\\\\\\\'\\\\\\",\\")"}'
    @db.bound_variable_arg([@m::HashRow.subclass(nil, [:a, :b]).call(:a=>"1", :b=>"abc\\'\",")], nil).must_equal '{"(\\"1\\",\\"abc\\\\\\\\\'\\\\\\",\\")"}'
  end

  it "should handle nils in bound variables" do
    @db.bound_variable_arg(@m::ArrayRow.call([nil, nil]), nil).must_equal '(,)'
    @db.bound_variable_arg(@m::HashRow.subclass(nil, [:a, :b]).call(:a=>nil, :b=>nil), nil).must_equal '(,)'
    @db.bound_variable_arg([@m::ArrayRow.call([nil, nil])], nil).must_equal '{"(,)"}'
    @db.bound_variable_arg([@m::HashRow.subclass(nil, [:a, :b]).call(:a=>nil, :b=>nil)], nil).must_equal '{"(,)"}'
  end
  
  it "should allow registering row type parsers by introspecting system tables" do
    @db.conversion_procs[4] = p4 = proc{|s| s.to_i}
    @db.conversion_procs[5] = p5 = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo)
    @db.sqls.must_equal ["SELECT pg_type.oid, typrelid, typarray FROM pg_type WHERE ((typtype = 'c') AND (typname = 'foo')) LIMIT 1",
      "SELECT attname, (CASE pg_type.typbasetype WHEN 0 THEN atttypid ELSE pg_type.typbasetype END) AS atttypid FROM pg_attribute INNER JOIN pg_type ON (pg_type.oid = pg_attribute.atttypid) WHERE ((attrelid = 2) AND (attnum > 0) AND NOT attisdropped) ORDER BY attnum"]
    p1 = @db.conversion_procs[1]
    p1.columns.must_equal [:bar, :baz]
    p1.column_oids.must_equal [4, 5]
    p1.column_converters.must_equal [p4, p5]
    p1.oid.must_equal 1
    @db.send(:schema_column_type, 'foo').must_equal :pg_row_foo
    @db.send(:schema_column_type, 'integer').must_equal :integer

    c = p1.converter
    c.superclass.must_equal @m::HashRow
    c.columns.must_equal [:bar, :baz]
    c.db_type.must_equal :foo
    p1.typecaster.must_equal c

    p1.call('(1,b)').must_equal(:bar=>1, :baz=>'bb')
    @db.typecast_value(:pg_row_foo, %w'1 b').class.must_be :<, @m::HashRow
    @db.typecast_value(:pg_row_foo, %w'1 b').must_equal(:bar=>'1', :baz=>'b')
    @db.typecast_value(:pg_row_foo, :bar=>'1', :baz=>'b').must_equal(:bar=>'1', :baz=>'b')
    @db.literal(p1.call('(1,b)')).must_equal "ROW(1, 'bb')::foo"
  end

  it "should allow registering row type parsers for schema qualify types" do
    @db.conversion_procs[4] = p4 = proc{|s| s.to_i}
    @db.conversion_procs[5] = p5 = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(Sequel[:foo][:bar])
    @db.sqls.must_equal ["SELECT pg_type.oid, typrelid, typarray FROM pg_type INNER JOIN pg_namespace ON ((pg_namespace.oid = pg_type.typnamespace) AND (pg_namespace.nspname = 'foo')) WHERE ((typtype = 'c') AND (typname = 'bar')) LIMIT 1",
      "SELECT attname, (CASE pg_type.typbasetype WHEN 0 THEN atttypid ELSE pg_type.typbasetype END) AS atttypid FROM pg_attribute INNER JOIN pg_type ON (pg_type.oid = pg_attribute.atttypid) WHERE ((attrelid = 2) AND (attnum > 0) AND NOT attisdropped) ORDER BY attnum"]
    p1 = @db.conversion_procs[1]
    p1.columns.must_equal [:bar, :baz]
    p1.column_oids.must_equal [4, 5]
    p1.column_converters.must_equal [p4, p5]
    p1.oid.must_equal 1

    c = p1.converter
    c.superclass.must_equal @m::HashRow
    c.columns.must_equal [:bar, :baz]
    c.db_type.must_equal Sequel[:foo][:bar]
    p1.typecaster.must_equal c

    p1.call('(1,b)').must_equal(:bar=>1, :baz=>'bb')
    @db.typecast_value(:pg_row_foo__bar, %w'1 b').must_equal(:bar=>'1', :baz=>'b')
    @db.typecast_value(:pg_row_foo__bar, :bar=>'1', :baz=>'b').must_equal(:bar=>'1', :baz=>'b')
    @db.literal(p1.call('(1,b)')).must_equal "ROW(1, 'bb')::foo.bar"
  end

  with_symbol_splitting "should allow registering row type parsers for schema qualify type symbols" do
    @db.conversion_procs[4] = p4 = proc{|s| s.to_i}
    @db.conversion_procs[5] = p5 = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo__bar)
    @db.sqls.must_equal ["SELECT pg_type.oid, typrelid, typarray FROM pg_type INNER JOIN pg_namespace ON ((pg_namespace.oid = pg_type.typnamespace) AND (pg_namespace.nspname = 'foo')) WHERE ((typtype = 'c') AND (typname = 'bar')) LIMIT 1",
      "SELECT attname, (CASE pg_type.typbasetype WHEN 0 THEN atttypid ELSE pg_type.typbasetype END) AS atttypid FROM pg_attribute INNER JOIN pg_type ON (pg_type.oid = pg_attribute.atttypid) WHERE ((attrelid = 2) AND (attnum > 0) AND NOT attisdropped) ORDER BY attnum"]
    p1 = @db.conversion_procs[1]
    p1.columns.must_equal [:bar, :baz]
    p1.column_oids.must_equal [4, 5]
    p1.column_converters.must_equal [p4, p5]
    p1.oid.must_equal 1

    c = p1.converter
    c.superclass.must_equal @m::HashRow
    c.columns.must_equal [:bar, :baz]
    c.db_type.must_equal :foo__bar
    p1.typecaster.must_equal c

    p1.call('(1,b)').must_equal(:bar=>1, :baz=>'bb')
    @db.typecast_value(:pg_row_foo__bar, %w'1 b').must_equal(:bar=>'1', :baz=>'b')
    @db.typecast_value(:pg_row_foo__bar, :bar=>'1', :baz=>'b').must_equal(:bar=>'1', :baz=>'b')
    @db.literal(p1.call('(1,b)')).must_equal "ROW(1, 'bb')::foo.bar"
  end

  it "should not allow registering on a frozen database" do
    @db.conversion_procs[4] = proc{|s| s.to_i}
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[], [{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    c = proc{|h| [h]}
    @db.freeze
    proc{@db.register_row_type(:foo, :converter=>c)}.must_raise RuntimeError, TypeError
  end

  it "should allow registering with a custom converter" do
    @db.conversion_procs[4] = proc{|s| s.to_i}
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    c = proc{|h| [h]}
    @db.register_row_type(:foo, :converter=>c)
    o = @db.conversion_procs[1].call('(1,b)')
    o.must_equal [{:bar=>1, :baz=>'bb'}]
    o.first.must_be_kind_of(Hash)
  end

  it "should allow registering with a custom typecaster" do
    @db.conversion_procs[4] = proc{|s| s.to_i}
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo, :typecaster=>proc{|h| {:bar=>(h[:bar]||0).to_i, :baz=>(h[:baz] || 'a')*2}})
    @db.typecast_value(:pg_row_foo, %w'1 b').must_be_kind_of(Hash)
    @db.typecast_value(:pg_row_foo, %w'1 b').must_equal(:bar=>1, :baz=>'bb')
    @db.typecast_value(:pg_row_foo, :bar=>'1', :baz=>'b').must_equal(:bar=>1, :baz=>'bb')
    @db.typecast_value(:pg_row_foo, 'bar'=>'1', 'baz'=>'b').must_equal(:bar=>0, :baz=>'aa')
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo, :typecaster=>proc{|h| {:bar=>(h[:bar] || h['bar'] || 0).to_i, :baz=>(h[:baz] || h['baz'] || 'a')*2}})
    @db.typecast_value(:pg_row_foo, %w'1 b').must_equal(:bar=>1, :baz=>'bb')
    @db.typecast_value(:pg_row_foo, :bar=>'1', :baz=>'b').must_equal(:bar=>1, :baz=>'bb')
    @db.typecast_value(:pg_row_foo, 'bar'=>'1', 'baz'=>'b').must_equal(:bar=>1, :baz=>'bb')
  end

  it "should handle nil values when converting columns" do
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}]]
    called = false
    @db.conversion_procs[4] = proc{|s| called = true; s}
    @db.register_row_type(:foo)
    @db.conversion_procs[1].call('()').must_equal(:bar=>nil)
    called.must_equal false
  end

  it "should registering array type for row type if type has an array oid" do
    @db.conversion_procs[4] = proc{|s| s.to_i}
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo, :typecaster=>proc{|h| {:bar=>(h[:bar]||0).to_i, :baz=>(h[:baz] || 'a')*2}})
    p3 = @db.conversion_procs[3]

    p3.call('{"(1,b)"}').must_equal [{:bar=>1, :baz=>'bb'}]
    @db.literal(p3.call('{"(1,b)"}')).must_equal "ARRAY[ROW(1, 'bb')::foo]::foo[]"
    @db.typecast_value(:foo_array, [{:bar=>'1', :baz=>'b'}]).must_equal [{:bar=>1, :baz=>'bb'}]
  end

  it "should allow creating unregisted row types via Database#row_type" do
    @db.literal(@db.row_type(:foo, [1, 2])).must_equal 'ROW(1, 2)::foo'
  end

  it "should allow typecasting of registered row types via Database#row_type" do
    @db.conversion_procs[4] = proc{|s| s.to_i}
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo, :typecaster=>proc{|h| @m::HashRow.subclass(:foo, [:bar, :baz]).new({:bar=>(h[:bar]||0).to_i, :baz=>(h[:baz] || 'a')*2})})
    @db.literal(@db.row_type(:foo, ['1', 'b'])).must_equal "ROW(1, 'bb')::foo"
    @db.literal(@db.row_type(:foo, {:bar=>'1', :baz=>'b'})).must_equal "ROW(1, 'bb')::foo"
  end

  it "should allow parsing when typecasting registered row types via Database#row_type" do
    @db.conversion_procs[4] = proc{|s| s.to_i}
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo, :typecaster=>proc{|h| @m::HashRow.subclass(:foo, [:bar, :baz]).new(:bar=>(h[:bar]||0).to_i, :baz=>(h[:baz] || 'a')*2)})
    @db.literal(@db.row_type(:foo, ['1', 'b'])).must_equal "ROW(1, 'bb')::foo"
  end

  it "should raise an error if attempt to use Database#row_type with an unregistered type and hash" do
    proc{@db.literal(@db.row_type(:foo, {:bar=>'1', :baz=>'b'}))}.must_raise(Sequel::InvalidValue)
  end

  it "should raise an error if attempt to use Database#row_type with an unhandled type" do
    proc{@db.literal(@db.row_type(:foo, 1))}.must_raise(Sequel::InvalidValue)
  end

  it "should return ArrayRow and HashRow values as-is" do
    h = @m::HashRow.call(:a=>1)
    a = @m::ArrayRow.call([1])
    @db.row_type(:foo, h).object_id.must_equal(h.object_id)
    @db.row_type(:foo, a).object_id.must_equal(a.object_id)
  end

  it "should have Sequel.pg_row return a plain ArrayRow" do
    @db.literal(Sequel.pg_row([1, 2, 3])).must_equal 'ROW(1, 2, 3)'
  end

  it "should raise an error if attempting to typecast a hash for a parser without columns" do
    proc{@m::Parser.new.typecast(:a=>1)}.must_raise(Sequel::Error)
  end

  it "should raise an error if attempting to typecast a unhandled value for a parser" do
    proc{@m::Parser.new.typecast(1)}.must_raise(Sequel::Error)
  end

  it "should handle typecasting for a parser without a typecaster" do
    @m::Parser.new.typecast([1]).must_equal [1]
  end

  it "should raise an error if no columns are returned when registering a custom row type" do
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}]]
    proc{@db.register_row_type(:foo)}.must_raise(Sequel::Error)
  end

  it "should raise an error when registering a custom row type if the type is found found" do
    @db.fetch = []
    proc{@db.register_row_type(:foo)}.must_raise(Sequel::Error)
  end

  it "should return correct results for Database#schema_type_class" do
    @db.conversion_procs[4] = proc{|s| s.to_i}
    @db.conversion_procs[5] = proc{|s| s * 2}
    @db.fetch = [[{:oid=>1, :typrelid=>2, :typarray=>3}], [{:attname=>'bar', :atttypid=>4}, {:attname=>'baz', :atttypid=>5}]]
    @db.register_row_type(:foo, :typecaster=>proc{|h| {:bar=>(h[:bar]||0).to_i, :baz=>(h[:baz] || 'a')*2}})
    @db.schema_type_class(:pg_row_foo).must_equal [Sequel::Postgres::PGRow::HashRow, Sequel::Postgres::PGRow::ArrayRow]
    @db.schema_type_class(:integer).must_equal Integer
  end
end
