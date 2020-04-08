require_relative "spec_helper"

describe "A new Database" do
  before do
    @db = Sequel::Database.new(1 => 2, :logger => 3)
  end
  
  it "should not allow dup/clone" do
    proc{@db.dup}.must_raise NoMethodError
    proc{@db.clone}.must_raise NoMethodError
  end

  it "should receive options" do
    @db.opts[1].must_equal 2
    @db.opts[:logger].must_equal 3  
  end
  
  it "should set the logger from opts[:logger] and opts[:loggers]" do
    @db.loggers.must_equal [3]
    Sequel::Database.new(1 => 2, :loggers => 3).loggers.must_equal [3]
    Sequel::Database.new(1 => 2, :loggers => [3]).loggers.must_equal [3]
    Sequel::Database.new(1 => 2, :logger => 4, :loggers => 3).loggers.must_equal [4,3]
    Sequel::Database.new(1 => 2, :logger => [4], :loggers => [3]).loggers.must_equal [4,3]
  end

  it "should support :preconnect option to preconnect to database" do
    @db.pool.size.must_equal 0
    c = Class.new(Sequel::Database) do
      def dataset_class_default; Sequel::Dataset end
      def connect(_)
        :connect
      end
    end
    db = c.new(1 => 2, :logger => 3, :preconnect=>true)
    db.pool.size.must_equal db.pool.max_size
    db = c.new(1 => 2, :logger => 3, :preconnect=>:concurrently)
    db.pool.size.must_equal db.pool.max_size
  end
  
  it "should handle the default string column size" do
    @db.default_string_column_size.must_equal 255
    db = Sequel::Database.new(:default_string_column_size=>50)
    db.default_string_column_size.must_equal 50
    db.default_string_column_size = 2
    db.default_string_column_size.must_equal 2
  end
  
  it "should set the sql_log_level from opts[:sql_log_level]" do
    Sequel::Database.new(1 => 2, :sql_log_level=>:debug).sql_log_level.must_equal :debug
    Sequel::Database.new(1 => 2, :sql_log_level=>'debug').sql_log_level.must_equal :debug
  end
  
  it "should create a connection pool" do
    @db.pool.must_be_kind_of(Sequel::ConnectionPool)
    @db.pool.max_size.must_equal 4
    
    Sequel::Database.new(:max_connections => 10).pool.max_size.must_equal 10
  end
  
  it "should have the connection pool use the connect method to get connections" do
    cc = nil
    d = Sequel::Database.new
    d.define_singleton_method(:connect){|c| 1234}
    d.synchronize {|c| cc = c}
    cc.must_equal 1234
  end

  it "should respect the :single_threaded option" do
    db = Sequel::Database.new(:single_threaded=>true){123}
    db.pool.must_be_kind_of(Sequel::SingleConnectionPool)
    db = Sequel::Database.new(:single_threaded=>'t'){123}
    db.pool.must_be_kind_of(Sequel::SingleConnectionPool)
    db = Sequel::Database.new(:single_threaded=>'1'){123}
    db.pool.must_be_kind_of(Sequel::SingleConnectionPool)
    db = Sequel::Database.new(:single_threaded=>false){123}
    db.pool.must_be_kind_of(Sequel::ConnectionPool)
    db = Sequel::Database.new(:single_threaded=>'f'){123}
    db.pool.must_be_kind_of(Sequel::ConnectionPool)
    db = Sequel::Database.new(:single_threaded=>'0'){123}
    db.pool.must_be_kind_of(Sequel::ConnectionPool)
  end

  it "should just use a :uri option for jdbc with the full connection string" do
    db = Sequel::Database.stub(:adapter_class, Class.new(Sequel::Database){def connect(*); Object.new end}) do
      Sequel.connect('jdbc:test://host/db_name')
    end
    db.must_be_kind_of(Sequel::Database)
    db.opts[:uri].must_equal 'jdbc:test://host/db_name'
  end

  it "should populate :adapter option when using connection string" do
    Sequel.connect('mock:/').opts[:adapter].must_equal "mock"
  end

  it "should respect the :keep_reference option for not keeping a reference in Sequel::DATABASES" do
    db = Sequel.connect('mock:///?keep_reference=f')
    Sequel::DATABASES.wont_include(db)
  end

  it 'should strip square brackets for ipv6 hosts' do
    Sequel.connect('mock://[::1]').opts[:host].must_equal "::1"
  end
end

describe "Database :connect_sqls option" do
  it "should issue the each sql query for each new connection" do
    db = Sequel.mock(:connect_sqls=>['SELECT 1', 'SELECT 2'])
    db.sqls.must_equal ['SELECT 1', 'SELECT 2']
    db['SELECT 3'].get
    db.sqls.must_equal ['SELECT 3']
    db.disconnect
    db['SELECT 3'].get
    db.sqls.must_equal ['SELECT 1', 'SELECT 2', 'SELECT 3']
  end
end

describe "Database#freeze" do
  before do
    @db = Sequel.mock.freeze
  end

  it "should freeze internal structures" do
    @db.instance_exec do
      frozen?.must_equal true
      opts.frozen?.must_equal true
      pool.frozen?.must_equal true
      loggers.frozen?.must_equal true
      @dataset_class.frozen?.must_equal true
      @dataset_modules.frozen?.must_equal true
      @schema_type_classes.frozen?.must_equal true
      from(:a).frozen?.must_equal  true
      metadata_dataset.frozen?.must_equal true
    end

    proc{@db.extend_datasets{}}.must_raise RuntimeError, TypeError
  end
end

describe "Database#disconnect" do
  it "should call pool.disconnect" do
    d = Sequel::Database.new
    p = d.pool
    def p.disconnect(h)
      raise unless h == {}
      2
    end
    d.disconnect.must_equal 2
  end
end

describe "Sequel.extension" do
  it "should attempt to load the given extension" do
    proc{Sequel.extension :blah}.must_raise(LoadError)
  end
end

describe "Database#log_info" do
  before do
    @o = Object.new
    def @o.logs; @logs || []; end
    def @o.to_ary; [self]; end
    def @o.method_missing(*args); (@logs ||= []) << args; end
    @db = Sequel::Database.new(:logger=>@o)
  end

  it "should log message at info level to all loggers" do
    @db.log_info('blah')
    @o.logs.must_equal [[:info, 'blah']]
  end

  it "should log message with args at info level to all loggers" do
    @db.log_info('blah', [1, 2])
    @o.logs.must_equal [[:info, 'blah; [1, 2]']]
  end
end

describe "Database#log_connection_yield" do
  before do
    @o = Object.new
    def @o.logs; @logs || []; end
    def @o.to_ary; [self]; end
    def @o.warn(*args); (@logs ||= []) << [:warn] + args; end
    def @o.method_missing(*args); (@logs ||= []) << args; end
    @conn = Object.new
    @db = Sequel::Database.new(:logger=>@o)
  end

  it "should log SQL to the loggers" do
    @db.log_connection_yield("some SQL", @conn){}
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :info
    @o.logs.first.last.must_match(/some SQL\z/)
    @o.logs.first.last.wont_match(/\(conn: -?\d+\) some SQL\z/)
  end

  it "should include connection information when logging" do
    @db.log_connection_info = true
    @db.log_connection_yield("some SQL", @conn){}
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :info
    @o.logs.first.last.must_match(/\(conn: -?\d+\) some SQL\z/)
  end

  it "should yield to the passed block" do
    a = nil
    @db.log_connection_yield('blah', @conn){a = 1}
    a.must_equal 1
  end

  it "should raise an exception if a block is not passed" do
    proc{@db.log_connection_yield('blah', @conn)}.must_raise LocalJumpError
  end

  it "should log message with duration at info level to all loggers" do
    @db.log_connection_yield('blah', @conn){}
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :info
    @o.logs.first.last.must_match(/\A\(\d\.\d{6}s\) blah\z/)
  end

  it "should respect sql_log_level setting" do
    @db.sql_log_level = :debug
    @db.log_connection_yield('blah', @conn){}
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :debug
    @o.logs.first.last.must_match(/\A\(\d\.\d{6}s\) blah\z/)
  end

  it "should log message with duration at warn level if duration greater than log_warn_duration" do
    @db.log_warn_duration = 0
    @db.log_connection_yield('blah', @conn){}
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :warn
    @o.logs.first.last.must_match(/\A\(\d\.\d{6}s\) blah\z/)
  end

  it "should log message with duration at info level if duration less than log_warn_duration" do
    @db.log_warn_duration = 1000
    @db.log_connection_yield('blah', @conn){}
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :info
    @o.logs.first.last.must_match(/\A\(\d\.\d{6}s\) blah\z/)
  end

  it "should log message at error level if block raises an error" do
    @db.log_warn_duration = 0
    proc{@db.log_connection_yield('blah', @conn){raise Sequel::Error, 'adsf'}}.must_raise Sequel::Error
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :error
    @o.logs.first.last.must_match(/\ASequel::Error: adsf: blah\z/)
  end

  it "should include args with message if args passed" do
    @db.log_connection_yield('blah', @conn, [1, 2]){}
    @o.logs.length.must_equal 1
    @o.logs.first.length.must_equal 2
    @o.logs.first.first.must_equal :info
    @o.logs.first.last.must_match(/\A\(\d\.\d{6}s\) blah; \[1, 2\]\z/)
  end

  it "should log without a logger defined by forcing skip_logging? to return false" do
    @db.logger = nil
    @db.extend(Module.new do
      def skip_logging?
        false
      end

      def log_duration(*)
        self.did_log = true
      end

      attr_accessor :did_log
    end)

    @db.log_connection_yield('some sql', @conn) {}

    @db.did_log.must_equal true
  end
end

describe "Database#uri" do
  before do
    @c = Class.new(Sequel::Database) do
      def dataset_class_default; Sequel::Dataset end
      def connect(*); Object.new end
      set_adapter_scheme :mau
    end
    
    @db = Sequel.connect('mau://user:pass@localhost:9876/maumau')
  end
  
  it "should return the connection URI for the database" do
    @db.uri.must_equal 'mau://user:pass@localhost:9876/maumau'
  end
  
  it "should return nil if a connection uri was not used" do
    Sequel.mock.uri.must_be_nil
  end
  
  it "should be aliased as #url" do
    @db.url.must_equal 'mau://user:pass@localhost:9876/maumau'
  end
end

describe "Database.adapter_scheme and #adapter_scheme" do
  it "should return the database scheme" do
    Sequel::Database.adapter_scheme.must_be_nil

    @c = Class.new(Sequel::Database) do
      def dataset_class_default; Sequel::Dataset end
      set_adapter_scheme :mau
    end
    
    @c.adapter_scheme.must_equal :mau
    @c.new({}).adapter_scheme.must_equal :mau
  end
end

describe "Database#dataset" do
  before do
    @db = Sequel.mock
    @ds = @db.dataset
  end
  
  it "should provide a blank dataset through #dataset" do
    @ds.must_be_kind_of(Sequel::Dataset)
    @ds.opts.must_equal({})
    @ds.db.must_be_same_as(@db)
  end
  
  it "should provide a #from dataset" do
    d = @db.from(:mau)
    d.must_be_kind_of(Sequel::Dataset)
    d.sql.must_equal 'SELECT * FROM mau'
    
    e = @db[:miu]
    e.must_be_kind_of(Sequel::Dataset)
    e.sql.must_equal 'SELECT * FROM miu'
  end
  
  it "should provide a #from dataset that supports virtual row blocks" do
    @db.from{a(b)}.sql.must_equal 'SELECT * FROM a(b)'
  end
  
  it "should provide a #select dataset" do
    d = @db.select(:a, :b, :c).from(:mau)
    d.must_be_kind_of(Sequel::Dataset)
    d.sql.must_equal 'SELECT a, b, c FROM mau'
  end
  
  it "should allow #select to take a block" do
    d = @db.select(:a, :b){c}.from(:mau)
    d.must_be_kind_of(Sequel::Dataset)
    d.sql.must_equal 'SELECT a, b, c FROM mau'
  end
end

describe "Database#dataset_class" do
  before do
    @db = Sequel::Database.new
    @dsc = Class.new(Sequel::Dataset)
  end
  
  it "should have setter set the class to use to create datasets" do
    @db.dataset_class = @dsc
    ds = @db.dataset
    ds.must_be_kind_of(@dsc)
    ds.opts.must_equal({})
    ds.db.must_be_same_as(@db)
  end

  it "should have getter return the class to use to create datasets" do
    [@db.dataset_class, @db.dataset_class.superclass].must_include(Sequel::Dataset)
    @db.dataset_class = @dsc
    [@db.dataset_class, @db.dataset_class.superclass].must_include(@dsc)
  end
end
  
describe "Database#extend_datasets" do
  before do
    @db = Sequel::Database.new
    @m = Module.new{def foo() [3] end}
    @m2 = Module.new{def foo() [4] + super end}
    @db.extend_datasets(@m)
  end
  
  it "should clear a cached dataset" do
    @db = Sequel::Database.new
    @db.literal(1).must_equal '1'
    @db.extend_datasets{def literal(v) '2' end}
    @db.literal(1).must_equal '2'
  end

  it "should change the dataset class to a subclass the first time it is called" do
    @db.dataset_class.superclass.must_equal Sequel::Dataset
  end

  it "should not create a subclass of the dataset class if called more than once" do
    @db.extend_datasets(@m2)
    @db.dataset_class.superclass.must_equal Sequel::Dataset
  end

  it "should make the dataset class include the module" do
    @db.dataset_class.ancestors.must_include(@m)
    @db.dataset_class.ancestors.wont_include(@m2)
    @db.extend_datasets(@m2)
    @db.dataset_class.ancestors.must_include(@m)
    @db.dataset_class.ancestors.must_include(@m2)
  end

  it "should have datasets respond to the module's methods" do
    @db.dataset.foo.must_equal [3]
    @db.extend_datasets(@m2)
    @db.dataset.foo.must_equal [4, 3]
  end

  it "should take a block and create a module from it to use" do
    @db.dataset.foo.must_equal [3]
    @db.extend_datasets{def foo() [5] + super end}
    @db.dataset.foo.must_equal [5, 3]
  end

  it "should raise an error if both a module and a block are provided" do
    proc{@db.extend_datasets(@m2){def foo() [5] + super end}}.must_raise(Sequel::Error)
  end

  it "should be able to override methods defined in the original Dataset class" do
    @db.extend_datasets do
      def select(*a, &block) super.order(*a, &block) end
      def input_identifier(v) v.to_s end
    end
    @db[:t].with_quote_identifiers(false).select(:a, :b).sql.must_equal 'SELECT a, b FROM t ORDER BY a, b'
  end

  it "should reapply settings if dataset_class is changed" do
    c = Class.new(Sequel::Dataset)
    @db.dataset_class = c
    @db.dataset_class.superclass.must_equal c
    @db.dataset_class.ancestors.must_include(@m)
    @db.dataset.foo.must_equal [3]
  end
end
  
describe "Database#extend_datasets custom methods" do
  before do
    @db = Sequel.mock
  end

  def ds
    @db[:items]
  end
  
  it "should have dataset_module support a where method" do
    @db.extend_datasets{where :released, :released}
    ds.released.sql.must_equal 'SELECT * FROM items WHERE released'
    ds.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE (foo AND released)'
  end

  it "should have dataset_module support a having method" do
    @db.extend_datasets{having(:released){released}}
    ds.released.sql.must_equal 'SELECT * FROM items HAVING released'
    ds.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE foo HAVING released'
  end

  it "should have dataset_module support an exclude method" do
    @db.extend_datasets{exclude :released, :released}
    ds.released.sql.must_equal 'SELECT * FROM items WHERE NOT released'
    ds.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE (foo AND NOT released)'
  end

  it "should have dataset_module support an exclude_having method" do
    @db.extend_datasets{exclude_having :released, :released}
    ds.released.sql.must_equal 'SELECT * FROM items HAVING NOT released'
    ds.where(:foo).released.sql.must_equal 'SELECT * FROM items WHERE foo HAVING NOT released'
  end

  it "should have dataset_module support a distinct method" do
    @db.extend_datasets{def supports_distinct_on?; true end; distinct :foo, :baz}
    ds.foo.sql.must_equal 'SELECT DISTINCT ON (baz) * FROM items'
    ds.where(:bar).foo.sql.must_equal 'SELECT DISTINCT ON (baz) * FROM items WHERE bar'
  end

  it "should have dataset_module support a grep method" do
    @db.extend_datasets{grep :foo, :baz, 'quux%'}
    ds.foo.sql.must_equal 'SELECT * FROM items WHERE ((baz LIKE \'quux%\' ESCAPE \'\\\'))'
    ds.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE (bar AND ((baz LIKE \'quux%\' ESCAPE \'\\\')))'
  end

  it "should have dataset_module support a group method" do
    @db.extend_datasets{group :foo, :baz}
    ds.foo.sql.must_equal 'SELECT * FROM items GROUP BY baz'
    ds.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar GROUP BY baz'
  end

  it "should have dataset_module support a group_and_count method" do
    @db.extend_datasets{group_and_count :foo, :baz}
    ds.foo.sql.must_equal 'SELECT baz, count(*) AS count FROM items GROUP BY baz'
    ds.where(:bar).foo.sql.must_equal 'SELECT baz, count(*) AS count FROM items WHERE bar GROUP BY baz'
  end

  it "should have dataset_module support a group_append method" do
    @db.extend_datasets{group_append :foo, :baz}
    ds.foo.sql.must_equal 'SELECT * FROM items GROUP BY baz'
    ds.group(:bar).foo.sql.must_equal 'SELECT * FROM items GROUP BY bar, baz'
  end

  it "should have dataset_module support a limit method" do
    @db.extend_datasets{limit :foo, 1}
    ds.foo.sql.must_equal 'SELECT * FROM items LIMIT 1'
    ds.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar LIMIT 1'
  end

  it "should have dataset_module support a offset method" do
    @db.extend_datasets{offset :foo, 1}
    ds.foo.sql.must_equal 'SELECT * FROM items OFFSET 1'
    ds.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar OFFSET 1'
  end

  it "should have dataset_module support a order method" do
    @db.extend_datasets{order(:foo){:baz}}
    ds.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz'
    ds.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar ORDER BY baz'
  end

  it "should have dataset_module support a order_append method" do
    @db.extend_datasets{order_append :foo, :baz}
    ds.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz'
    ds.order(:bar).foo.sql.must_equal 'SELECT * FROM items ORDER BY bar, baz'
  end

  it "should have dataset_module support a order_prepend method" do
    @db.extend_datasets{order_prepend :foo, :baz}
    ds.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz'
    ds.order(:bar).foo.sql.must_equal 'SELECT * FROM items ORDER BY baz, bar'
  end

  it "should have dataset_module support a reverse method" do
    @db.extend_datasets{reverse(:foo){:baz}}
    ds.foo.sql.must_equal 'SELECT * FROM items ORDER BY baz DESC'
    ds.where(:bar).foo.sql.must_equal 'SELECT * FROM items WHERE bar ORDER BY baz DESC'
  end

  it "should have dataset_module support a select method" do
    @db.extend_datasets{select :foo, :baz}
    ds.foo.sql.must_equal 'SELECT baz FROM items'
    ds.where(:bar).foo.sql.must_equal 'SELECT baz FROM items WHERE bar'
  end

  it "should have dataset_module support a select_all method" do
    @db.extend_datasets{select_all :foo, :baz}
    ds.foo.sql.must_equal 'SELECT baz.* FROM items'
    ds.where(:bar).foo.sql.must_equal 'SELECT baz.* FROM items WHERE bar'
  end

  it "should have dataset_module support a select_append method" do
    @db.extend_datasets{select_append :foo, :baz}
    ds.foo.sql.must_equal 'SELECT *, baz FROM items'
    ds.where(:bar).foo.sql.must_equal 'SELECT *, baz FROM items WHERE bar'
  end

  it "should have dataset_module support a select_group method" do
    @db.extend_datasets{select_group :foo, :baz}
    ds.foo.sql.must_equal 'SELECT baz FROM items GROUP BY baz'
    ds.where(:bar).foo.sql.must_equal 'SELECT baz FROM items WHERE bar GROUP BY baz'
  end

  it "should have dataset_module support a server method" do
    @db.extend_datasets{server :foo, :baz}
    ds.foo.opts[:server].must_equal :baz
    ds.where(:bar).foo.opts[:server].must_equal :baz
  end
end

describe "Database#disconnect_connection" do
  it "should call close on the connection" do
    o = Object.new
    def o.close() @closed=true end
    Sequel::Database.new.disconnect_connection(o)
    o.instance_variable_get(:@closed).must_equal true
  end
end

describe "Database#valid_connection?" do
  it "should issue a query to validate the connection" do
    db = Sequel.mock
    db.synchronize{|c| db.valid_connection?(c)}.must_equal true
    db.synchronize do |c|
      def c.execute(*) raise Sequel::DatabaseError, "error" end
      db.valid_connection?(c)
    end.must_equal false
  end
end

describe "Database#run" do
  before do
    @db = Sequel.mock(:servers=>{:s1=>{}})
  end
  
  it "should execute the code on the database" do
    @db.run("DELETE FROM items")
    @db.sqls.must_equal ["DELETE FROM items"]
  end
  
  it "should handle placeholder literal strings" do
    @db.run(Sequel.lit("DELETE FROM ?", :items))
    @db.sqls.must_equal ["DELETE FROM items"]
  end
  
  it "should return nil" do
    @db.run("DELETE FROM items").must_be_nil
  end
  
  it "should accept options passed to execute_ddl" do
    @db.run("DELETE FROM items", :server=>:s1)
    @db.sqls.must_equal ["DELETE FROM items -- s1"]
  end
end

describe "Database#<<" do
  before do
    @db = Sequel.mock
  end

  it "should execute the code on the database" do
    @db << "DELETE FROM items"
    @db.sqls.must_equal ["DELETE FROM items"]
  end
  
  it "should handle placeholder literal strings" do
    @db << Sequel.lit("DELETE FROM ?", :items)
    @db.sqls.must_equal ["DELETE FROM items"]
  end
  
  it "should be chainable" do
    @db << "DELETE FROM items" << "DELETE FROM items2"
    @db.sqls.must_equal ["DELETE FROM items", "DELETE FROM items2"]
  end
end

describe "Database#synchronize" do
  before do
    @db = Sequel::Database.new(:max_connections => 1)
    @db.define_singleton_method(:connect){|c| 12345}
  end
  
  it "should wrap the supplied block in pool.hold" do
    q, q1, q2 = Queue.new, Queue.new, Queue.new
    c1, c2 = nil
    t1 = Thread.new{@db.synchronize{|c| c1 = c; q.push nil; q1.pop}; q.push nil}
    q.pop
    c1.must_equal 12345
    t2 = Thread.new{@db.synchronize{|c| c2 = c; q2.push nil}}
    @db.pool.available_connections.must_be :empty?
    c2.must_be_nil
    q1.push nil
    q.pop
    q2.pop
    c2.must_equal 12345
    t1.join
    t2.join
  end
end

describe "Database#test_connection" do
  before do
    @db = Sequel::Database.new
    pr = proc{@test = rand(100)}
    @db.define_singleton_method(:connect){|c| pr.call}
  end
  
  it "should attempt to get a connection" do
    @db.test_connection
    @test.wont_equal nil
  end
  
  it "should return true if successful" do
    @db.test_connection.must_equal true
  end

  it "should raise an error if the attempting to connect raises an error" do
    def @db.connect(*) raise Sequel::Error end
    proc{@db.test_connection}.must_raise(Sequel::DatabaseConnectionError)
  end
end

describe "Database#table_exists?" do
  it "should test existence by selecting a row from the table's dataset" do
    db = Sequel.mock(:fetch=>[Sequel::Error, [], [{:a=>1}]])
    db.table_exists?(:a).must_equal false
    db.sqls.must_equal ["SELECT NULL AS nil FROM a LIMIT 1"]
    db.table_exists?(:b).must_equal true
    db.table_exists?(:c).must_equal true
  end

  it "should use a savepoint if inside a transaction" do
    db = Sequel.mock(:fetch=>[Sequel::Error, [], [{:a=>1}]])
    def db.supports_savepoints?; true end
    db.transaction do
      db.table_exists?(:a).must_equal false
    end
    db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "SELECT NULL AS nil FROM a LIMIT 1", "ROLLBACK TO SAVEPOINT autopoint_1", "COMMIT"]
    db.table_exists?(:b).must_equal true
    db.table_exists?(:c).must_equal true
  end
end

DatabaseTransactionSpecs = shared_description do
  it "should wrap the supplied block with BEGIN + COMMIT statements" do
    @db.transaction{@db.execute 'DROP TABLE test;'}
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'COMMIT']
  end
  
  it "should support transaction isolation levels" do
    @db.define_singleton_method(:supports_transaction_isolation_levels?){true}
    [:uncommitted, :committed, :repeatable, :serializable].each do |l|
      @db.transaction(:isolation=>l){@db.run "DROP TABLE #{l}"}
    end
    @db.sqls.must_equal ['BEGIN', 'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED', 'DROP TABLE uncommitted', 'COMMIT',
                       'BEGIN', 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED', 'DROP TABLE committed', 'COMMIT',
                       'BEGIN', 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ', 'DROP TABLE repeatable', 'COMMIT',
                       'BEGIN', 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE', 'DROP TABLE serializable', 'COMMIT']
  end

  it "should allow specifying a default transaction isolation level" do
    @db.define_singleton_method(:supports_transaction_isolation_levels?){true}
    [:uncommitted, :committed, :repeatable, :serializable].each do |l|
      @db.transaction_isolation_level = l
      @db.transaction{@db.run "DROP TABLE #{l}"}
    end
    @db.sqls.must_equal ['BEGIN', 'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED', 'DROP TABLE uncommitted', 'COMMIT',
                       'BEGIN', 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED', 'DROP TABLE committed', 'COMMIT',
                       'BEGIN', 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ', 'DROP TABLE repeatable', 'COMMIT',
                       'BEGIN', 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE', 'DROP TABLE serializable', 'COMMIT']
  end
  
  it "should support :retry_on option for automatically retrying transactions" do
    a = []
    @db.transaction(:retry_on=>Sequel::DatabaseDisconnectError){a << 1; raise Sequel::DatabaseDisconnectError if a.length < 2}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'BEGIN', 'COMMIT']
    a.must_equal [1, 1]

    a = []
    @db.transaction(:retry_on=>[Sequel::ConstraintViolation, Sequel::SerializationFailure]) do
      a << 1
      raise Sequel::SerializationFailure if a.length == 1
      raise Sequel::ConstraintViolation if a.length == 2
    end
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'BEGIN', 'ROLLBACK', 'BEGIN', 'COMMIT']
    a.must_equal [1, 1, 1]
  end
  
  it "should support :num_retries option for limiting the number of retry times" do
    a = []
    lambda do
      @db.transaction(:num_retries=>1, :retry_on=>[Sequel::ConstraintViolation, Sequel::SerializationFailure]) do
        a << 1
        raise Sequel::SerializationFailure if a.length == 1
        raise Sequel::ConstraintViolation if a.length == 2
      end
    end.must_raise(Sequel::ConstraintViolation)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'BEGIN', 'ROLLBACK']
    a.must_equal [1, 1]
  end
  
  it "should support :num_retries=>nil option to retry indefinitely" do
    a = []
    lambda do
      @db.transaction(:num_retries=>nil, :retry_on=>[Sequel::ConstraintViolation]) do
        a << 1
        raise Sequel::SerializationFailure if a.length >= 100
        raise Sequel::ConstraintViolation
      end
    end.must_raise(Sequel::SerializationFailure)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK'] * 100
    a.must_equal [1] * 100
  end
  
  it "should support :before_retry option for invoking callback before retrying" do
    a, errs, calls = [], [], []
    retryer = proc{|n, err| calls << n; errs << err }
    @db.transaction(:retry_on=>Sequel::DatabaseDisconnectError, :before_retry => retryer) do
      a << 1; raise Sequel::DatabaseDisconnectError if a.length < 3
    end
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'BEGIN', 'ROLLBACK', 'BEGIN', 'COMMIT']
    a.must_equal [1, 1, 1]
    errs.count.must_equal 2
    errs.each { |e| e.class.must_equal Sequel::DatabaseDisconnectError }
    calls.must_equal [1, 2]
  end
  
  it "should raise an error if attempting to use :retry_on inside another transaction" do
    proc{@db.transaction{@db.transaction(:retry_on=>Sequel::ConstraintViolation){}}}.must_raise(Sequel::Error)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
  end
  
  it "should handle returning inside of the block by committing" do
    def @db.ret_commit
      transaction do
        execute 'DROP TABLE test;'
        return
      end
    end
    @db.ret_commit
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'COMMIT']
  end
  
  it "should issue ROLLBACK if an exception is raised, and re-raise" do
    @db.transaction {@db.execute 'DROP TABLE test'; raise RuntimeError} rescue nil
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test', 'ROLLBACK']
    
    proc {@db.transaction {raise RuntimeError}}.must_raise(RuntimeError)
  end
  
  it "should handle errors when sending BEGIN" do
    ec = Class.new(StandardError)
    @db.define_singleton_method(:database_error_classes){[ec]}
    @db.define_singleton_method(:log_connection_execute){|c, sql| sql =~ /BEGIN/ ? raise(ec, 'bad') : super(c, sql)}
    begin
      @db.transaction{@db.execute 'DROP TABLE test;'}
    rescue Sequel::DatabaseError => e
    end
    e.wont_equal nil
    e.wrapped_exception.must_be_kind_of(ec)
    @db.sqls.must_equal ['ROLLBACK']
  end
  
  it "should handle errors when sending COMMIT" do
    ec = Class.new(StandardError)
    @db.define_singleton_method(:database_error_classes){[ec]}
    @db.define_singleton_method(:log_connection_execute){|c, sql| sql =~ /COMMIT/ ? raise(ec, 'bad') : super(c, sql)}
    begin
      @db.transaction{@db.execute 'DROP TABLE test;'}
    rescue Sequel::DatabaseError => e
    end
    e.wont_equal nil
    e.wrapped_exception.must_be_kind_of(ec)
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'ROLLBACK']
  end
  
  it "should raise original exception if there is an exception raised when rolling back" do
    ec = Class.new(StandardError)
    @db.define_singleton_method(:database_error_classes){[ec]}
    @db.define_singleton_method(:log_connection_execute){|c, sql| sql =~ /ROLLBACK/ ? raise(ec, 'bad') : super(c, sql)}
    begin
      @db.transaction{raise ArgumentError, 'asdf'}
    rescue => e
    end
    e.must_be_kind_of(ArgumentError)
    @db.sqls.must_equal ['BEGIN']
  end
  
  it "should raise original exception if there is an exception raised when rolling back when using :rollback=>:always" do
    ec = Class.new(StandardError)
    @db.define_singleton_method(:database_error_classes){[ec]}
    @db.define_singleton_method(:log_connection_execute){|c, sql| sql =~ /ROLLBACK/ ? raise(ec, 'bad') : super(c, sql)}
    begin
      @db.transaction(:rollback=>:always){}
    rescue => e
    end
    e.must_be_kind_of(ec)
    @db.sqls.must_equal ['BEGIN']
  end
  
  it "should issue ROLLBACK if Sequel::Rollback is called in the transaction" do
    @db.transaction do
      @db.drop_table(:a)
      raise Sequel::Rollback
      @db.drop_table(:b)
    end
    
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE a', 'ROLLBACK']
  end
  
  it "should have in_transaction? return true if inside a transaction" do
    c = nil
    @db.transaction{c = @db.in_transaction?}
    c.must_equal true
  end
  
  it "should have in_transaction? handle sharding correctly" do
    c = []
    @db.transaction(:server=>:test){c << @db.in_transaction?}
    @db.transaction(:server=>:test){c << @db.in_transaction?(:server=>:test)}
    c.must_equal [false, true]
  end
  
  it "should have in_transaction? return false if not in a transaction" do
    @db.in_transaction?.must_equal false
  end
  
  it "should have rollback_checker return a proc which returns whether the transaction was rolled back" do
    proc{@db.rollback_checker}.must_raise Sequel::Error
    proc{@db.transaction(:server=>:test){@db.rollback_checker}}.must_raise Sequel::Error

    rbc = nil
    @db.transaction do 
      rbc = @db.rollback_checker
      rbc.call.must_be_nil
    end
    rbc.call.must_equal false

    @db.transaction(:rollback=>:always) do 
      rbc = @db.rollback_checker
      rbc.call.must_be_nil
    end
    rbc.call.must_equal true

    proc do
      @db.transaction do 
        rbc = @db.rollback_checker
        raise
      end
    end.must_raise RuntimeError
    rbc.call.must_equal true

    @db.transaction(:server=>:test){rbc = @db.rollback_checker(:server=>:test)}
    rbc.call.must_equal false
  end
  
  it "should return nil if Sequel::Rollback is called in the transaction" do
    @db.transaction{raise Sequel::Rollback}.must_be_nil
  end
  
  it "should reraise Sequel::Rollback errors when using :rollback=>:reraise option is given" do
    proc {@db.transaction(:rollback=>:reraise){raise Sequel::Rollback}}.must_raise(Sequel::Rollback)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    proc {@db.transaction(:rollback=>:reraise){raise ArgumentError}}.must_raise(ArgumentError)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    @db.transaction(:rollback=>:reraise){1}.must_equal 1
    @db.sqls.must_equal ['BEGIN', 'COMMIT']
  end
  
  it "should always rollback if :rollback=>:always option is given" do
    proc {@db.transaction(:rollback=>:always){raise ArgumentError}}.must_raise(ArgumentError)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    @db.transaction(:rollback=>:always){raise Sequel::Rollback}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    @db.transaction(:rollback=>:always){1}.must_equal 1
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    catch(:foo) do
      @db.transaction(:rollback=>:always){throw :foo}
    end
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
  end

  it "should raise database errors when commiting a transaction as Sequel::DatabaseError" do
    @db.define_singleton_method(:commit_transaction){raise ArgumentError}
    lambda{@db.transaction{}}.must_raise(ArgumentError)

    @db.define_singleton_method(:database_error_classes){[ArgumentError]}
    lambda{@db.transaction{}}.must_raise(Sequel::DatabaseError)
  end
  
  it "should be re-entrant" do
    q, q1 = Queue.new, Queue.new
    cc = nil
    t = Thread.new do
      @db.transaction {@db.transaction {@db.transaction {|c|
        cc = c
        q.pop
        q1.push nil
        q.pop
      }}}
    end
    q.push nil
    q1.pop
    cc.must_be_kind_of(Sequel::Mock::Connection)
    tr = @db.instance_variable_get(:@transactions)
    tr.keys.must_equal [cc]
    q.push nil
    t.join
    tr.must_be :empty?
  end

  it "should correctly handle nested transaction use with separate shards" do
    @db.transaction do |c1|
      @db.transaction(:server=>:test) do |c2|
        c1.wont_equal c2
        @db.execute 'DROP TABLE test;'
      end
    end
    @db.sqls.must_equal ['BEGIN', 'BEGIN -- test', 'DROP TABLE test;', 'COMMIT -- test', 'COMMIT']
  end
  
  if (!defined?(RUBY_ENGINE) or RUBY_ENGINE == 'ruby') and !RUBY_VERSION.start_with?('1.9')
    it "should handle Thread#kill for transactions inside threads" do
      q = Queue.new
      q1 = Queue.new
      t = Thread.new do
        @db.transaction do
          @db.execute 'DROP TABLE test'
          q1.push nil
          q.pop
          @db.execute 'DROP TABLE test2'
        end
      end
      q1.pop
      t.kill
      t.join
      @db.sqls.must_equal ['BEGIN', 'DROP TABLE test', 'ROLLBACK']
    end
  end

  it "should raise an Error if after_commit or after_rollback is called without a block" do
    proc{@db.after_commit}.must_raise(Sequel::Error)
    proc{@db.after_rollback}.must_raise(Sequel::Error)
  end

  it "should have after_commit and after_rollback respect :server option" do
    @db.transaction(:server=>:test){@db.after_commit(:server=>:test){@db.execute('foo', :server=>:test)}}
    @db.sqls.must_equal ['BEGIN -- test', 'COMMIT -- test', 'foo -- test']
    @db.transaction(:server=>:test){@db.after_rollback(:server=>:test){@db.execute('foo', :server=>:test)}; raise Sequel::Rollback}
    @db.sqls.must_equal ['BEGIN -- test', 'ROLLBACK -- test', 'foo -- test']
  end

  it "should execute after_commit outside transactions" do
    @db.after_commit{@db.execute('foo')}
    @db.sqls.must_equal ['foo']
  end

  it "should ignore after_rollback outside transactions" do
    @db.after_rollback{@db.execute('foo')}
    @db.sqls.must_equal []
  end

  it "should support after_commit inside transactions" do
    @db.transaction{@db.after_commit{@db.execute('foo')}}
    @db.sqls.must_equal ['BEGIN', 'COMMIT', 'foo']
  end

  it "should support after_rollback inside transactions" do
    @db.transaction{@db.after_rollback{@db.execute('foo')}}
    @db.sqls.must_equal ['BEGIN', 'COMMIT']
  end

  it "should have transaction inside after_commit work correctly" do
    @db.transaction{@db.after_commit{@db.transaction{@db.execute('foo')}}}
    @db.sqls.must_equal ['BEGIN', 'COMMIT', 'BEGIN', 'foo', 'COMMIT']
  end

  it "should have transaction inside after_rollback work correctly" do
    @db.transaction(:rollback=>:always){@db.after_rollback{@db.transaction{@db.execute('foo')}}}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'BEGIN', 'foo', 'COMMIT']
  end

  it "should not call after_commit if the transaction rolls back" do
    @db.transaction{@db.after_commit{@db.execute('foo')}; raise Sequel::Rollback}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
  end

  it "should call after_rollback if the transaction rolls back" do
    @db.transaction{@db.after_rollback{@db.execute('foo')}; raise Sequel::Rollback}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'foo']
  end

  it "should call multiple after_commit blocks in order if called inside transactions" do
    @db.transaction{@db.after_commit{@db.execute('foo')}; @db.after_commit{@db.execute('bar')}}
    @db.sqls.must_equal ['BEGIN', 'COMMIT', 'foo', 'bar']
  end

  it "should call multiple after_rollback blocks in order if called inside transactions" do
    @db.transaction{@db.after_rollback{@db.execute('foo')}; @db.after_rollback{@db.execute('bar')}; raise Sequel::Rollback}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'foo', 'bar']
  end

  it "should support after_commit inside nested transactions" do
    @db.transaction{@db.transaction{@db.after_commit{@db.execute('foo')}}}
    @db.sqls.must_equal ['BEGIN', 'COMMIT', 'foo']
  end

  it "should support after_rollback inside nested transactions" do
    @db.transaction{@db.transaction{@db.after_rollback{@db.execute('foo')}}; raise Sequel::Rollback}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK', 'foo']
  end

  it "should raise an error if you attempt to use after_commit inside a prepared transaction" do
    @db.define_singleton_method(:supports_prepared_transactions?){true}
    proc{@db.transaction(:prepare=>'XYZ'){@db.after_commit{@db.execute('foo')}}}.must_raise(Sequel::Error)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
  end

  it "should raise an error if you attempt to use after_rollback inside a prepared transaction" do
    @db.define_singleton_method(:supports_prepared_transactions?){true}
    proc{@db.transaction(:prepare=>'XYZ'){@db.after_rollback{@db.execute('foo')}}}.must_raise(Sequel::Error)
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
  end

  it "should have rollback_on_exit cause the transaction to rollback on exit" do
    @db.transaction{@db.rollback_on_exit}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    catch(:foo){@db.transaction{@db.rollback_on_exit; throw :foo}}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    lambda{@db.transaction{@db.rollback_on_exit; return true}}.call
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
  end

  it "should have rollback_on_exit with :cancel option will cause the transaction to commit on exit" do
    @db.transaction{@db.rollback_on_exit(:cancel=>true)}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'COMMIT']
    @db.transaction{@db.rollback_on_exit; @db.rollback_on_exit(:cancel=>true)}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'COMMIT']
  end
end

describe "Database#transaction with savepoint support" do
  before do
    @db = Sequel.mock(:servers=>{:test=>{}})
  end

  include DatabaseTransactionSpecs

  it "should support :retry_on option for automatically retrying transactions when using :savepoint option" do
    a = []
    @db.transaction do
      @db.transaction(:retry_on=>Sequel::SerializationFailure, :savepoint=>true) do
        a << 1
        raise Sequel::SerializationFailure if a.length == 1
      end
    end
    @db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "ROLLBACK TO SAVEPOINT autopoint_1", "SAVEPOINT autopoint_1", "RELEASE SAVEPOINT autopoint_1", "COMMIT"]
    a.must_equal [1, 1]
  end
  
  it "should automatically use a savepoint if :rollback=>:always given inside a transaction" do
    @db.transaction do
      @db.transaction(:rollback=>:always) do
        @db.get(1)
      end
    end
    @db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "SELECT 1 AS v LIMIT 1", "ROLLBACK TO SAVEPOINT autopoint_1", "COMMIT"]
  end
  
  it "should support :retry_on option for automatically retrying transactions inside an :auto_savepoint transaction" do
    a = []
    @db.transaction(:auto_savepoint=>true) do
      @db.transaction(:retry_on=>Sequel::SerializationFailure) do
        a << 1
        raise Sequel::SerializationFailure if a.length == 1
      end
    end
    @db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "ROLLBACK TO SAVEPOINT autopoint_1", "SAVEPOINT autopoint_1", "RELEASE SAVEPOINT autopoint_1", "COMMIT"]
    a.must_equal [1, 1]
  end
  
  it "should support after_commit inside savepoints" do
    @db.transaction do
      @db.after_commit{@db.execute('foo')}
      @db.transaction(:savepoint=>true){@db.after_commit{@db.execute('bar')}}
      @db.after_commit{@db.execute('baz')}
    end
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT', 'foo', 'bar', 'baz']
  end

  it "should support after_rollback inside savepoints" do
    @db.transaction(:rollback=>:always) do
      @db.after_rollback{@db.execute('foo')}
      @db.transaction(:savepoint=>true){@db.after_rollback{@db.execute('bar')}}
      @db.after_rollback{@db.execute('baz')}
    end
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'RELEASE SAVEPOINT autopoint_1', 'ROLLBACK', 'foo', 'bar', 'baz']
  end

  it "should run after_commit if savepoint rolled back" do
    @db.transaction do
      @db.after_commit{@db.execute('foo')}
      @db.transaction(:savepoint=>true, :rollback=>:always){@db.after_commit{@db.execute('bar')}}
    end
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT', 'foo', 'bar']
  end

  it "should not run after_commit if savepoint rolled back and :savepoint option used" do
    @db.transaction do
      @db.after_commit{@db.execute('foo')}
      @db.transaction(:savepoint=>true, :rollback=>:always){@db.after_commit(:savepoint=>true){@db.execute('bar')}}
    end
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT', 'foo']
  end

  it "should not run after_commit if higher-level savepoint rolled back and :savepoint option used" do
    @db.transaction do
      @db.after_commit{@db.execute('foo')}
      @db.transaction(:savepoint=>true, :rollback=>:always){@db.transaction(:savepoint=>true){@db.after_commit(:savepoint=>true){@db.execute('bar')}}}
    end
    @db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "SAVEPOINT autopoint_2", "RELEASE SAVEPOINT autopoint_2", "ROLLBACK TO SAVEPOINT autopoint_1", "COMMIT", "foo"]
  end

  it "should not run after_commit if transaction rolled back and :savepoint option used" do
    @db.transaction(:rollback=>:always) do
      @db.after_commit{@db.execute('foo')}
      @db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.after_commit(:savepoint=>true){@db.execute('bar')}}}
    end
    @db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "SAVEPOINT autopoint_2", "RELEASE SAVEPOINT autopoint_2", "RELEASE SAVEPOINT autopoint_1", "ROLLBACK"]
  end

  it "should run after_rollback if savepoint rolls back" do
    @db.transaction(:rollback=>:always) do
      @db.after_rollback{@db.execute('foo')}
      @db.transaction(:savepoint=>true, :rollback=>:always){@db.after_rollback{@db.execute('bar')}}
      @db.after_rollback{@db.execute('baz')}
    end
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK', 'foo', 'bar', 'baz']
  end

  it "should run after_rollback when savepoint rolls back if :savepoint option used" do
    @db.transaction(:rollback=>:always) do
      @db.after_rollback{@db.execute('foo')}
      @db.transaction(:savepoint=>true, :rollback=>:always){@db.after_rollback(:savepoint=>true){@db.execute('bar')}}
      @db.after_rollback{@db.execute('baz')}
    end
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'ROLLBACK TO SAVEPOINT autopoint_1', 'bar', 'ROLLBACK', 'foo', 'baz']
  end

  it "should run after_rollback if savepoint rolled back and :savepoint option used, even if transaction commits" do
    @db.transaction do
      @db.after_commit{@db.execute('foo')}
      @db.transaction(:savepoint=>true, :rollback=>:always){@db.after_rollback(:savepoint=>true){@db.execute('bar')}}
    end
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'ROLLBACK TO SAVEPOINT autopoint_1', 'bar', 'COMMIT', 'foo']
  end

  it "should run after_rollback if higher-level savepoint rolled back and :savepoint option used" do
    @db.transaction do
      @db.transaction(:savepoint=>true, :rollback=>:always){@db.transaction(:savepoint=>true){@db.after_rollback(:savepoint=>true){@db.execute('bar')}}}
    end
    @db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "SAVEPOINT autopoint_2", "RELEASE SAVEPOINT autopoint_2", "ROLLBACK TO SAVEPOINT autopoint_1", "bar", "COMMIT"]
  end

  it "should run after_rollback if transaction rolled back and :savepoint option used" do
    @db.transaction(:rollback=>:always) do
      @db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.after_rollback(:savepoint=>true){@db.execute('bar')}}}
    end
    @db.sqls.must_equal ["BEGIN", "SAVEPOINT autopoint_1", "SAVEPOINT autopoint_2", "RELEASE SAVEPOINT autopoint_2", "RELEASE SAVEPOINT autopoint_1", "ROLLBACK", "bar"]
  end

  it "should raise an error if you attempt to use after_commit inside a savepoint in a prepared transaction" do
    @db.define_singleton_method(:supports_prepared_transactions?){true}
    proc{@db.transaction(:prepare=>'XYZ'){@db.transaction(:savepoint=>true){@db.after_commit{@db.execute('foo')}}}}.must_raise(Sequel::Error)
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK']
  end

  it "should raise an error if you attempt to use after_rollback inside a savepoint in a prepared transaction" do
    @db.define_singleton_method(:supports_prepared_transactions?){true}
    proc{@db.transaction(:prepare=>'XYZ'){@db.transaction(:savepoint=>true){@db.after_rollback{@db.execute('foo')}}}}.must_raise(Sequel::Error)
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK']
  end

  it "should create savepoint if inside a transaction when :savepoint=>:only is used" do
    @db.transaction{@db.transaction(:savepoint=>:only){}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','RELEASE SAVEPOINT autopoint_1', 'COMMIT']
  end

  it "should not create transaction if not inside a transaction when :savepoint=>:only is used" do
    @db.transaction(:savepoint=>:only){}
    @db.sqls.must_equal []
  end

  it "should have rollback_on_exit with :savepoint option inside transaction cause the transaction to rollback on exit" do
    @db.transaction{@db.rollback_on_exit(:savepoint=>true)}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    catch(:foo){@db.transaction{@db.rollback_on_exit(:savepoint=>true); throw :foo}}
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
    lambda{@db.transaction{@db.rollback_on_exit(:savepoint=>true); return true}}.call
    @db.sqls.must_equal ['BEGIN', 'ROLLBACK']
  end

  it "should have rollback_on_exit with :savepoint option inside savepoint cause the savepoint to rollback on exit" do
    @db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true)}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']
    catch(:foo){@db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); throw :foo}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']
    lambda{@db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); return true}}}.call
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']
  end

  it "should have rollback_on_exit with :savepoint option inside nested savepoint cause the current savepoint to rollback on exit" do
    @db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
    catch(:foo){@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); throw :foo}}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
    lambda{@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); return true}}}}.call
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
  end

  it "should have rollback_on_exit with :savepoint=>1 option inside nested savepoint cause the current savepoint to rollback on exit" do
    @db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>1)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
    catch(:foo){@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>1); throw :foo}}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
    lambda{@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>1); return true}}}}.call
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
  end

  it "should have rollback_on_exit with :savepoint=>2 option inside nested savepoint cause the current and next savepoint to rollback on exit" do
    @db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>2)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']
    catch(:foo){@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>2); throw :foo}}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']
    lambda{@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>2); return true}}}}.call
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']
  end

  it "should have rollback_on_exit with :savepoint=>3 option inside nested savepoint cause the three enclosing savepoints/transaction to rollback on exit" do
    @db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>3)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK']
    catch(:foo){@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>3); throw :foo}}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK']
    lambda{@db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>3); return true}}}}.call
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK']
  end

  it "should have rollback_on_exit with :savepoint and :cancel option will cause the transaction to commit on exit" do
    @db.transaction{@db.rollback_on_exit(:savepoint=>true, :cancel=>true)}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'COMMIT']
    @db.transaction{@db.rollback_on_exit(:savepoint=>true); @db.rollback_on_exit(:savepoint=>true, :cancel=>true)}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'COMMIT']
  end

  it "should have rollback_on_exit with :savepoint option called at different levels work correctly" do
    @db.transaction{@db.rollback_on_exit(:savepoint=>true); @db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true)}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1','ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK']

    @db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); @db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'SAVEPOINT autopoint_2','ROLLBACK TO SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']

    @db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); @db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true, :cancel=>true)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'SAVEPOINT autopoint_2','RELEASE SAVEPOINT autopoint_2', 'ROLLBACK TO SAVEPOINT autopoint_1', 'COMMIT']

    @db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); @db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>2, :cancel=>true)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'SAVEPOINT autopoint_2','RELEASE SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']

    @db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); @db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>3, :cancel=>true)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'SAVEPOINT autopoint_2','RELEASE SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']

    @db.transaction{@db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>true); @db.transaction(:savepoint=>true){@db.rollback_on_exit(:savepoint=>4, :cancel=>true)}}}.must_be_nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'SAVEPOINT autopoint_2','RELEASE SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
  end
end
  
describe "Database#transaction without savepoint support" do
  before do
    @db = Sequel.mock(:servers=>{:test=>{}})
    @db.define_singleton_method(:supports_savepoints?){false}
  end

  it "should not create savepoint if inside a transaction when :savepoint=>:only is used" do
    @db.transaction{@db.transaction(:savepoint=>:only){}}
    @db.sqls.must_equal ['BEGIN', 'COMMIT']
  end

  it "should not automatically use a savepoint if :rollback=>:always given inside a transaction" do
    proc do
      @db.transaction do
        @db.transaction(:rollback=>:always) do
          @db.get(1)
        end
      end
    end.must_raise Sequel::Error
    @db.sqls.must_equal ["BEGIN", "ROLLBACK"]
  end
  
  include DatabaseTransactionSpecs
end
  
describe "Sequel.transaction" do
  before do
    @sqls = []
    @db1 = Sequel.mock(:append=>'1', :sqls=>@sqls)
    @db2 = Sequel.mock(:append=>'2', :sqls=>@sqls)
    @db3 = Sequel.mock(:append=>'3', :sqls=>@sqls)
  end
  
  it "should run the block inside transacitons on all three databases" do
    Sequel.transaction([@db1, @db2, @db3]){1}.must_equal 1
    @sqls.must_equal ['BEGIN -- 1', 'BEGIN -- 2', 'BEGIN -- 3', 'COMMIT -- 3', 'COMMIT -- 2', 'COMMIT -- 1']
  end
  
  it "should pass options to all the blocks" do
    Sequel.transaction([@db1, @db2, @db3], :rollback=>:always){1}.must_equal 1
    @sqls.must_equal ['BEGIN -- 1', 'BEGIN -- 2', 'BEGIN -- 3', 'ROLLBACK -- 3', 'ROLLBACK -- 2', 'ROLLBACK -- 1']
  end
  
  it "should handle Sequel::Rollback exceptions raised by the block to rollback on all databases" do
    Sequel.transaction([@db1, @db2, @db3]){raise Sequel::Rollback}.must_be_nil
    @sqls.must_equal ['BEGIN -- 1', 'BEGIN -- 2', 'BEGIN -- 3', 'ROLLBACK -- 3', 'ROLLBACK -- 2', 'ROLLBACK -- 1']
  end
  
  it "should handle nested transactions" do
    Sequel.transaction([@db1, @db2, @db3]){Sequel.transaction([@db1, @db2, @db3]){1}}.must_equal 1
    @sqls.must_equal ['BEGIN -- 1', 'BEGIN -- 2', 'BEGIN -- 3', 'COMMIT -- 3', 'COMMIT -- 2', 'COMMIT -- 1']
  end
  
  it "should handle savepoints" do
    Sequel.transaction([@db1, @db2, @db3]){Sequel.transaction([@db1, @db2, @db3], :savepoint=>true){1}}.must_equal 1
    @sqls.must_equal ['BEGIN -- 1', 'BEGIN -- 2', 'BEGIN -- 3',
      'SAVEPOINT autopoint_1 -- 1', 'SAVEPOINT autopoint_1 -- 2', 'SAVEPOINT autopoint_1 -- 3',
      'RELEASE SAVEPOINT autopoint_1 -- 3', 'RELEASE SAVEPOINT autopoint_1 -- 2', 'RELEASE SAVEPOINT autopoint_1 -- 1',
      'COMMIT -- 3', 'COMMIT -- 2', 'COMMIT -- 1']
  end
end
  
describe "Database#transaction with savepoints" do
  before do
    @db = Sequel.mock
  end
  
  it "should wrap the supplied block with BEGIN + COMMIT statements" do
    @db.transaction {@db.execute 'DROP TABLE test;'}
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'COMMIT']
  end
  
  it "should use savepoints if given the :savepoint option" do
    @db.transaction{@db.transaction(:savepoint=>true){@db.execute 'DROP TABLE test;'}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'DROP TABLE test;', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
  end
  
  it "should use savepoints if surrounding transaction uses :auto_savepoint option" do
    @db.transaction(:auto_savepoint=>true){@db.transaction{@db.execute 'DROP TABLE test;'}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'DROP TABLE test;', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']

    @db.transaction(:auto_savepoint=>true){@db.transaction{@db.transaction{@db.execute 'DROP TABLE test;'}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'DROP TABLE test;', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']

    @db.transaction(:auto_savepoint=>true){@db.transaction(:auto_savepoint=>true){@db.transaction{@db.execute 'DROP TABLE test;'}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'SAVEPOINT autopoint_2', 'DROP TABLE test;', 'RELEASE SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']

    @db.transaction{@db.transaction(:auto_savepoint=>true, :savepoint=>true){@db.transaction{@db.execute 'DROP TABLE test;'}}}
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'SAVEPOINT autopoint_2', 'DROP TABLE test;', 'RELEASE SAVEPOINT autopoint_2', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
  end

  it "should not use savepoints if surrounding transaction uses :auto_savepoint and current transaction uses :savepoint=>false option" do
    @db.transaction(:auto_savepoint=>true){@db.transaction(:savepoint=>false){@db.execute 'DROP TABLE test;'}}
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'COMMIT']
  end
  
  it "should not use a savepoint if no transaction is in progress" do
    @db.transaction(:savepoint=>true){@db.execute 'DROP TABLE test;'}
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'COMMIT']
  end
  
  it "should reuse the current transaction if no :savepoint option is given" do
    @db.transaction{@db.transaction{@db.execute 'DROP TABLE test;'}}
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'COMMIT']
  end
  
  it "should handle returning inside of the block by committing" do
    def @db.ret_commit
      transaction do
        execute 'DROP TABLE test;'
        return
      end
    end
    @db.ret_commit
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test;', 'COMMIT']
  end
  
  it "should handle returning inside of a savepoint by committing" do
    def @db.ret_commit
      transaction do
        transaction(:savepoint=>true) do
          execute 'DROP TABLE test;'
          return
        end
      end
    end
    @db.ret_commit
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'DROP TABLE test;', 'RELEASE SAVEPOINT autopoint_1', 'COMMIT']
  end
  
  it "should issue ROLLBACK if an exception is raised, and re-raise" do
    @db.transaction {@db.execute 'DROP TABLE test'; raise RuntimeError} rescue nil
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE test', 'ROLLBACK']
    
    proc {@db.transaction {raise RuntimeError}}.must_raise(RuntimeError)
  end
  
  it "should issue ROLLBACK SAVEPOINT if an exception is raised inside a savepoint, and re-raise" do
    @db.transaction{@db.transaction(:savepoint=>true){@db.execute 'DROP TABLE test'; raise RuntimeError}} rescue nil
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'DROP TABLE test', 'ROLLBACK TO SAVEPOINT autopoint_1', 'ROLLBACK']
    
    proc {@db.transaction {raise RuntimeError}}.must_raise(RuntimeError)
  end
  
  it "should issue ROLLBACK if Sequel::Rollback is raised in the transaction" do
    @db.transaction do
      @db.drop_table(:a)
      raise Sequel::Rollback
      @db.drop_table(:b)
    end
    
    @db.sqls.must_equal ['BEGIN', 'DROP TABLE a', 'ROLLBACK']
  end
  
  it "should issue ROLLBACK SAVEPOINT if Sequel::Rollback is raised in a savepoint" do
    @db.transaction do
      @db.transaction(:savepoint=>true) do
        @db.drop_table(:a)
        raise Sequel::Rollback
      end
      @db.drop_table(:b)
    end
    
    @db.sqls.must_equal ['BEGIN', 'SAVEPOINT autopoint_1', 'DROP TABLE a', 'ROLLBACK TO SAVEPOINT autopoint_1', 'DROP TABLE b', 'COMMIT']
  end
  
  it "should raise database errors when commiting a transaction as Sequel::DatabaseError" do
    @db.define_singleton_method(:commit_transaction){raise ArgumentError}
    lambda{@db.transaction{}}.must_raise(ArgumentError)
    lambda{@db.transaction{@db.transaction(:savepoint=>true){}}}.must_raise(ArgumentError)

    @db.define_singleton_method(:database_error_classes){[ArgumentError]}
    lambda{@db.transaction{}}.must_raise(Sequel::DatabaseError)
    lambda{@db.transaction{@db.transaction(:savepoint=>true){}}}.must_raise(Sequel::DatabaseError)
  end
end

describe "A Database adapter with a scheme" do
  before do
    require_relative '../../lib/sequel/adapters/mock'
    @ccc = Class.new(Sequel::Mock::Database)
    @ccc.send(:set_adapter_scheme, :ccc)
  end

  it "should be registered in the ADAPTER_MAP" do
    Sequel::ADAPTER_MAP[:ccc].must_equal @ccc
  end
  
  it "should give the database_type as the adapter scheme by default" do
    @ccc.new.database_type.must_equal :ccc
  end
  
  it "should be instantiated when its scheme is specified" do
    c = Sequel::Database.connect('ccc://localhost/db')
    c.must_be_kind_of(@ccc)
    c.opts[:host].must_equal 'localhost'
    c.opts[:database].must_equal 'db'
  end
  
  it "should be accessible through Sequel.connect" do
    c = Sequel.connect 'ccc://localhost/db'
    c.must_be_kind_of(@ccc)
    c.opts[:host].must_equal 'localhost'
    c.opts[:database].must_equal 'db'
  end

  it "should be accessible through Sequel.connect via a block" do
    x = nil
    y = nil
    z = nil
    returnValue = 'anything'

    p = proc do |c|
      c.must_be_kind_of(@ccc)
      c.opts[:host].must_equal 'localhost'
      c.opts[:database].must_equal 'db'
      z = y
      y = x
      x = c
      returnValue
    end

    @ccc.class_eval do
      self::DISCONNECTS = []
      def disconnect
        self.class::DISCONNECTS << self
      end
    end
    Sequel::Database.connect('ccc://localhost/db', &p).must_equal returnValue
    @ccc::DISCONNECTS.must_equal [x]

    Sequel.connect('ccc://localhost/db', &p).must_equal returnValue
    @ccc::DISCONNECTS.must_equal [y, x]

    Sequel.send(:def_adapter_method, :ccc)
    Sequel.ccc('db', :host=>'localhost', &p).must_equal returnValue
    @ccc::DISCONNECTS.must_equal [z, y, x]
    Sequel.singleton_class.send(:remove_method, :ccc)
  end

  it "should be accessible through Sequel.<adapter>" do
    Sequel.send(:def_adapter_method, :ccc)

    # invalid parameters
    proc {Sequel.ccc('abc', 'def')}.must_raise(Sequel::Error)
    proc {Sequel.ccc(1)}.must_raise(Sequel::Error)
    
    c = Sequel.ccc('mydb')
    c.must_be_kind_of(@ccc)
    c.opts.values_at(:adapter, :database, :adapter_class).must_equal [:ccc, 'mydb', @ccc]
    
    c = Sequel.ccc('mydb', :host => 'localhost')
    c.must_be_kind_of(@ccc)
    c.opts.values_at(:adapter, :database, :host, :adapter_class).must_equal [:ccc, 'mydb', 'localhost', @ccc]
    
    c = Sequel.ccc
    c.must_be_kind_of(@ccc)
    c.opts.values_at(:adapter, :adapter_class).must_equal [:ccc, @ccc]
    
    c = Sequel.ccc(:database => 'mydb', :host => 'localhost')
    c.must_be_kind_of(@ccc)
    c.opts.values_at(:adapter, :database, :host, :adapter_class).must_equal [:ccc, 'mydb', 'localhost', @ccc]
    Sequel.singleton_class.send(:remove_method, :ccc)
  end
  
  it "should be accessible through Sequel.connect with options" do
    c = Sequel.connect(:adapter => :ccc, :database => 'mydb')
    c.must_be_kind_of(@ccc)
    c.opts[:adapter].must_equal :ccc
  end

  it "should be accessible through Sequel.connect with URL parameters" do
    c = Sequel.connect 'ccc:///db?host=/tmp&user=test'
    c.must_be_kind_of(@ccc)
    c.opts[:host].must_equal '/tmp'
    c.opts[:database].must_equal 'db'
    c.opts[:user].must_equal 'test'
  end
  
  it "should have URL parameters take precedence over fixed URL parts" do
    c = Sequel.connect 'ccc://localhost/db?host=a&database=b'
    c.must_be_kind_of(@ccc)
    c.opts[:host].must_equal 'a'
    c.opts[:database].must_equal 'b'
  end
  
  it "should have hash options take predence over URL parameters or parts" do
    c = Sequel.connect 'ccc://localhost/db?host=/tmp', :host=>'a', :database=>'b', :user=>'c'
    c.must_be_kind_of(@ccc)
    c.opts[:host].must_equal 'a'
    c.opts[:database].must_equal 'b'
    c.opts[:user].must_equal 'c'
  end

  it "should unescape values of URL parameters and parts" do
    c = Sequel.connect 'ccc:///d%5bb%5d?host=domain%5cinstance'
    c.must_be_kind_of(@ccc)
    c.opts[:database].must_equal 'd[b]'
    c.opts[:host].must_equal 'domain\\instance'
  end

  it "should test the connection if test parameter is truthy" do
    @ccc.send(:define_method, :connect){}
    proc{Sequel.connect 'ccc:///d%5bb%5d?test=t'}.must_raise(Sequel::DatabaseConnectionError)
    proc{Sequel.connect 'ccc:///d%5bb%5d?test=1'}.must_raise(Sequel::DatabaseConnectionError)
    proc{Sequel.connect 'ccc:///d%5bb%5d', :test=>true}.must_raise(Sequel::DatabaseConnectionError)
    proc{Sequel.connect 'ccc:///d%5bb%5d', :test=>'t'}.must_raise(Sequel::DatabaseConnectionError)
  end

  it "should not test the connection if test parameter is not truthy" do
    Sequel.connect 'ccc:///d%5bb%5d?test=f'
    Sequel.connect 'ccc:///d%5bb%5d?test=0'
    Sequel.connect 'ccc:///d%5bb%5d', :test=>false
    Sequel.connect 'ccc:///d%5bb%5d', :test=>'f'
  end
end

describe "Sequel::Database.connect" do
  it "should raise an Error if not given a String or Hash" do
    proc{Sequel::Database.connect(nil)}.must_raise(Sequel::Error)
    proc{Sequel::Database.connect(Object.new)}.must_raise(Sequel::Error)
  end
end

describe "An unknown database scheme" do
  it "should raise an error in Sequel::Database.connect" do
    proc {Sequel::Database.connect('ddd://localhost/db')}.must_raise(Sequel::AdapterNotFound)
  end

  it "should raise an error in Sequel.connect" do
    proc {Sequel.connect('ddd://localhost/db')}.must_raise(Sequel::AdapterNotFound)
  end
end

describe "A broken adapter (lib is there but the class is not)" do
  before do
    @fn = File.join(File.dirname(__FILE__), '../../lib/sequel/adapters/blah.rb')
    File.open(@fn,'a'){}
  end
  
  after do
    File.delete(@fn)
  end
  
  it "should raise an error" do
    proc {Sequel.connect('blah://blow')}.must_raise(Sequel::AdapterNotFound)
  end
end

describe "Sequel::Database.load_adapter" do
  it "should not raise an error if subadapter does not exist" do
    Sequel::Database.load_adapter(:foo, :subdir=>'bar').must_be_nil
  end
end

describe "A single threaded database" do
  after do
    Sequel.single_threaded = false
  end
  
  it "should use a SingleConnectionPool instead of a ConnectionPool" do
    db = Sequel::Database.new(:single_threaded => true){123}
    db.pool.must_be_kind_of(Sequel::SingleConnectionPool)
  end
  
  it "should be constructable using :single_threaded => true option" do
    db = Sequel::Database.new(:single_threaded => true){123}
    db.pool.must_be_kind_of(Sequel::SingleConnectionPool)
  end
  
  it "should be constructable using Sequel.single_threaded = true" do
    Sequel.single_threaded = true
    Sequel.single_threaded.must_equal true
    db = Sequel::Database.new{123}
    db.pool.must_be_kind_of(Sequel::SingleConnectionPool)
  end
end

describe "A single threaded database" do
  before do
    conn = 1234567
    @db = Sequel::Database.new(:single_threaded => true)
    @db.define_singleton_method(:connect) do |c|
      conn += 1
    end
  end
  
  it "should invoke connection_proc only once" do
    @db.pool.hold {|c| c.must_equal 1234568}
    @db.pool.hold {|c| c.must_equal 1234568}
  end
  
  it "should disconnect correctly" do
    def @db.disconnect_connection(c); @dc = c end
    def @db.dc; @dc end
    x = nil
    @db.pool.hold{|c| x = c}
    @db.pool.hold{|c| c.must_equal x}
    @db.disconnect
    @db.dc.must_equal x
  end
  
  it "should convert an Exception on connection into a DatabaseConnectionError" do
    db = Class.new(Sequel::Database){def connect(*) raise Exception end}.new(:single_threaded => true, :servers=>{}, :test=>false)
    proc {db.pool.hold {|c|}}.must_raise(Sequel::DatabaseConnectionError)
  end
  
  it "should raise a DatabaseConnectionError if the connection proc returns nil" do
    db = Class.new(Sequel::Database){def connect(*) end}.new(:single_threaded => true, :servers=>{}, :test=>false)
    proc {db.pool.hold {|c|}}.must_raise(Sequel::DatabaseConnectionError)
  end
end

describe "A database" do
  after do
    Sequel.single_threaded = false
  end
  
  it "should have single_threaded? respond to true if in single threaded mode" do
    db = Sequel::Database.new(:single_threaded => true){1234}
    db.must_be :single_threaded?
    
    db = Sequel::Database.new(:max_options => 1)
    db.wont_be :single_threaded?
    
    db = Sequel::Database.new
    db.wont_be :single_threaded?
    
    Sequel.single_threaded = true
    
    db = Sequel::Database.new{123}
    db.must_be :single_threaded?
    
    db = Sequel::Database.new(:max_options => 4){123}
    db.must_be :single_threaded?
  end
  
  it "should be able to set loggers via the logger= and loggers= methods" do
    db = Sequel::Database.new
    s = "I'm a logger"
    db.logger = s
    db.loggers.must_equal [s]
    db.logger = nil
    db.loggers.must_equal []

    db.loggers = [s]
    db.loggers.must_equal [s]
    db.loggers = []
    db.loggers.must_equal []

    t = "I'm also a logger"
    db.loggers = [s, t]
    db.loggers.must_equal [s,t]
  end
end

describe "Database#fetch" do
  before do
    @db = Sequel.mock(:fetch=>proc{|sql| {:sql => sql}})
  end
  
  it "should create a dataset and invoke its fetch_rows method with the given sql" do
    sql = nil
    @db.fetch('select * from xyz') {|r| sql = r[:sql]}
    sql.must_equal 'select * from xyz'
  end
  
  it "should format the given sql with any additional arguments" do
    sql = nil
    @db.fetch('select * from xyz where x = ? and y = ?', 15, 'abc') {|r| sql = r[:sql]}
    sql.must_equal "select * from xyz where x = 15 and y = 'abc'"
    
    @db.fetch('select name from table where name = ? or id in ?', 'aman', [3,4,7]) {|r| sql = r[:sql]}
    sql.must_equal "select name from table where name = 'aman' or id in (3, 4, 7)"
  end
  
  it "should format the given sql with named arguments" do
    sql = nil
    @db.fetch('select * from xyz where x = :x and y = :y', :x=>15, :y=>'abc') {|r| sql = r[:sql]}
    sql.must_equal "select * from xyz where x = 15 and y = 'abc'"
  end
  
  it "should return the dataset if no block is given" do
    @db.fetch('select * from xyz').must_be_kind_of(Sequel::Dataset)
    
    @db.fetch('select a from b').map {|r| r[:sql]}.must_equal ['select a from b']

    @db.fetch('select c from d').inject([]) {|m, r| m << r; m}.must_equal \
      [{:sql => 'select c from d'}]
  end
  
  it "should return a dataset that always uses the given sql for SELECTs" do
    ds = @db.fetch('select * from xyz')
    ds.select_sql.must_equal 'select * from xyz'
    ds.sql.must_equal 'select * from xyz'
    
    ds = ds.where{price.sql_number < 100}
    ds.select_sql.must_equal 'select * from xyz'
    ds.sql.must_equal 'select * from xyz'
  end
end


describe "Database#[]" do
  before do
    @db = Sequel.mock
  end
  
  it "should return a dataset when symbols are given" do
    ds = @db[:items]
    ds.must_be_kind_of(Sequel::Dataset)
    ds.opts[:from].must_equal [:items]
  end
  
  it "should return a dataset when a string is given" do
    @db.fetch = proc{|sql| {:sql=>sql}}
    sql = nil
    @db['select * from xyz where x = ? and y = ?', 15, 'abc'].each {|r| sql = r[:sql]}
    sql.must_equal "select * from xyz where x = 15 and y = 'abc'"
  end
end

describe "Database#inspect" do
  it "should include the class name and the connection url" do
    Sequel.connect('mock://foo/bar').inspect.must_equal '#<Sequel::Mock::Database: "mock://foo/bar">'
  end

  it "should include the class name and the connection options if an options hash was given" do
    Sequel.connect(:adapter=>:mock).inspect.must_equal '#<Sequel::Mock::Database: {:adapter=>:mock}>'
  end

  it "should include the class name, uri, and connection options if uri and options hash was given" do
    Sequel.connect('mock://foo', :database=>'bar').inspect.must_equal '#<Sequel::Mock::Database: "mock://foo" {:database=>"bar"}>'
  end
end

describe "Database#get" do
  before do
    @db = Sequel.mock(:fetch=>{:a=>1})
  end
  
  it "should use Dataset#get to get a single value" do
    @db.get(:a).must_equal 1
    @db.sqls.must_equal ['SELECT a LIMIT 1']
    
    @db.get(Sequel.function(:version).as(:version))
    @db.sqls.must_equal ['SELECT version() AS version LIMIT 1']
  end

  it "should accept a block" do
    @db.get{a}
    @db.sqls.must_equal ['SELECT a LIMIT 1']
    
    @db.get{version(a).as(version)}
    @db.sqls.must_equal ['SELECT version(a) AS version LIMIT 1']
  end

  it "should work when an alias cannot be determined" do
    @db.get(1).must_equal 1
    @db.sqls.must_equal ['SELECT 1 AS v LIMIT 1']
  end
end

describe "Database#call" do
  it "should call the prepared statement with the given name" do
    db = Sequel.mock(:fetch=>{:id => 1, :x => 1})
    db[:items].prepare(:select, :select_all)
    db.call(:select_all).must_equal [{:id => 1, :x => 1}]
    db[:items].filter(:n=>:$n).prepare(:select, :select_n)
    db.call(:select_n, :n=>1).must_equal [{:id => 1, :x => 1}]
    db.sqls.must_equal ['SELECT * FROM items', 'SELECT * FROM items WHERE (n = 1)']
  end
end

describe "Database#server_opts" do
  it "should return the general opts if no :servers option is used" do
    opts = {:host=>1, :database=>2}
    Sequel::Database.new(opts).send(:server_opts, :server1)[:host].must_equal 1
  end
  
  it "should return the general opts if entry for the server is present in the :servers option" do
    opts = {:host=>1, :database=>2, :servers=>{}}
    Sequel::Database.new(opts).send(:server_opts, :server1)[:host].must_equal 1
  end
  
  it "should return the general opts merged with the specific opts if given as a hash" do
    opts = {:host=>1, :database=>2, :servers=>{:server1=>{:host=>3}}}
    Sequel::Database.new(opts).send(:server_opts, :server1)[:host].must_equal 3
  end
  
  it "should return the sgeneral opts merged with the specific opts if given as a proc" do
    opts = {:host=>1, :database=>2, :servers=>{:server1=>proc{|db| {:host=>4}}}}
    Sequel::Database.new(opts).send(:server_opts, :server1)[:host].must_equal 4
  end
  
  it "should raise an error if the specific opts is not a proc or hash" do
    opts = {:host=>1, :database=>2, :servers=>{:server1=>2}}
    proc{Sequel::Database.new(opts).send(:server_opts, :server1)}.must_raise(Sequel::Error)
  end

  it "should return the general opts merged with given opts if given opts is a Hash" do
    opts = {:host=>1, :database=>2}
    Sequel::Database.new(opts).send(:server_opts, :host=>2)[:host].must_equal 2
  end
end

describe "Database#add_servers" do
  before do
    @db = Sequel.mock(:host=>1, :database=>2, :servers=>{:server1=>{:host=>3}})
  end

  it "should add new servers to the connection pool" do
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 3}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 1}

    @db.add_servers(:server2=>{:host=>6})
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 3}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 6}

    @db.disconnect
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 3}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 6}
  end

  it "should replace options for future connections to existing servers" do
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 3}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 1}

    @db.add_servers(:default=>proc{{:host=>4}}, :server1=>{:host=>8})
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 3}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 1}

    @db.disconnect
    @db.synchronize{|c| c.opts[:host].must_equal 4}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 8}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 4}
  end

  it "should raise error for unsharded pool" do
    proc{Sequel.mock.add_servers(:server1=>{})}.must_raise Sequel::Error
  end
end

describe "Database#remove_servers" do
  before do
    @db = Sequel.mock(:host=>1, :database=>2, :servers=>{:server1=>{:host=>3}, :server2=>{:host=>4}})
  end

  it "should remove servers from the connection pool" do
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 3}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 4}

    @db.remove_servers(:server1, :server2)
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 1}
  end
  
  it "should accept arrays of symbols" do
    @db.remove_servers([:server1, :server2])
    @db.synchronize{|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server1){|c| c.opts[:host].must_equal 1}
    @db.synchronize(:server2){|c| c.opts[:host].must_equal 1}
  end

  it "should allow removal while connections are still open" do
    @db.synchronize do |c1|
      c1.opts[:host].must_equal 1
      @db.synchronize(:server1) do |c2|
        c2.opts[:host].must_equal 3
        @db.synchronize(:server2) do |c3|
          c3.opts[:host].must_equal 4
          @db.remove_servers(:server1, :server2)
            @db.synchronize(:server1) do |c4|
              c4.wont_equal c2
              c4.must_equal c1
              c4.opts[:host].must_equal 1
              @db.synchronize(:server2) do |c5|
                c5.wont_equal c3
                c5.must_equal c1
                c5.opts[:host].must_equal 1
              end
            end
          c3.opts[:host].must_equal 4
         end
        c2.opts[:host].must_equal 3
      end
      c1.opts[:host].must_equal 1
    end
  end

  it "should raise error for unsharded pool" do
    proc{Sequel.mock.remove_servers(:server1)}.must_raise Sequel::Error
  end
end

describe "Database#raise_error" do
  before do
    @db = Sequel.mock
  end

  it "should reraise if the exception class is not in opts[:classes]" do
    e = Class.new(StandardError)
    proc{@db.send(:raise_error, e.new(''), :classes=>[])}.must_raise(e)
  end

  it "should convert the exception to a DatabaseError if the exception class is in opts[:classes]" do
    proc{@db.send(:raise_error, Interrupt.new(''), :classes=>[Interrupt])}.must_raise(Sequel::DatabaseError)
  end

  it "should convert the exception to a DatabaseError if opts[:classes] if not present" do
    proc{@db.send(:raise_error, Interrupt.new(''))}.must_raise(Sequel::DatabaseError)
  end
  
  it "should convert the exception to a DatabaseDisconnectError if opts[:disconnect] is true" do
    proc{@db.send(:raise_error, Interrupt.new(''), :disconnect=>true)}.must_raise(Sequel::DatabaseDisconnectError)
  end
  
  it "should convert the exception to an appropriate error if exception message matches regexp" do
    def @db.database_error_regexps
      {/foo/ => Sequel::DatabaseDisconnectError, /bar/ => Sequel::ConstraintViolation}
    end
    e = Class.new(StandardError)
    proc{@db.send(:raise_error, e.new('foo'))}.must_raise(Sequel::DatabaseDisconnectError)
    proc{@db.send(:raise_error, e.new('bar'))}.must_raise(Sequel::ConstraintViolation)
  end
end

describe "Database#typecast_value" do
  before do
    @db = Sequel::Database.new
  end

  it "should raise an InvalidValue when given an invalid value" do
    proc{@db.typecast_value(:integer, "13a")}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:float, "4.e2")}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:decimal, :invalid_value)}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:date, Object.new)}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:date, 'a')}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:time, Date.new)}.must_raise(Sequel::InvalidValue)
    proc{@db.typecast_value(:datetime, 4)}.must_raise(Sequel::InvalidValue)
  end

  it "should raise an InvalidValue when given an invalid timezone value" do
    begin
      Sequel.default_timezone = :blah
      proc{@db.typecast_value(:datetime, [2019, 2, 3, 4, 5, 6])}.must_raise(Sequel::InvalidValue)
      Sequel.datetime_class = DateTime
      proc{@db.typecast_value(:datetime, [2019, 2, 3, 4, 5, 6])}.must_raise(Sequel::InvalidValue)
    ensure
      Sequel.default_timezone = nil
      Sequel.datetime_class = Time
    end
  end

  it "should handle integers with leading 0 as base 10" do
    @db.typecast_value(:integer, "013").must_equal 13
    @db.typecast_value(:integer, "08").must_equal 8
    @db.typecast_value(:integer, "000013").must_equal 13
    @db.typecast_value(:integer, "000008").must_equal 8
  end

  it "should handle integers with leading 0x as base 16" do
    @db.typecast_value(:integer, "0x013").must_equal 19
    @db.typecast_value(:integer, "0x80").must_equal 128
  end

  it "should typecast blobs as as Sequel::SQL::Blob" do
    v = @db.typecast_value(:blob, "0x013")
    v.must_be_kind_of(Sequel::SQL::Blob)
    v.must_equal Sequel::SQL::Blob.new("0x013")
    @db.typecast_value(:blob, v).object_id.must_equal v.object_id
  end

  it "should typecast boolean values to true, false, or nil" do
    @db.typecast_value(:boolean, false).must_equal false
    @db.typecast_value(:boolean, 0).must_equal false
    @db.typecast_value(:boolean, "0").must_equal false
    @db.typecast_value(:boolean, 'f').must_equal false
    @db.typecast_value(:boolean, 'false').must_equal false
    @db.typecast_value(:boolean, true).must_equal true
    @db.typecast_value(:boolean, 1).must_equal true
    @db.typecast_value(:boolean, '1').must_equal true
    @db.typecast_value(:boolean, 't').must_equal true
    @db.typecast_value(:boolean, 'true').must_equal true
    @db.typecast_value(:boolean, '').must_be_nil
  end

  it "should typecast date values to Date" do
    @db.typecast_value(:date, Date.today).must_equal Date.today
    @db.typecast_value(:date, DateTime.now).must_equal Date.today
    @db.typecast_value(:date, Time.now).must_equal Date.today
    @db.typecast_value(:date, Date.today.to_s).must_equal Date.today
    @db.typecast_value(:date, :year=>Date.today.year, :month=>Date.today.month, :day=>Date.today.day).must_equal Date.today
  end

  it "should have Sequel.application_to_database_timestamp convert to Sequel.database_timezone" do
    begin
      t = Time.utc(2011, 1, 2, 3, 4, 5) # UTC Time
      t2 = Time.mktime(2011, 1, 2, 3, 4, 5) # Local Time
      t3 = Time.utc(2011, 1, 2, 3, 4, 5) - (t - t2) # Local Time in UTC Time
      t4 = Time.mktime(2011, 1, 2, 3, 4, 5) + (t - t2) # UTC Time in Local Time
      Sequel.application_timezone = :utc
      Sequel.database_timezone = :local
      Sequel.application_to_database_timestamp(t).must_equal t4
      Sequel.application_timezone = :local
      Sequel.database_timezone = :utc
      Sequel.application_to_database_timestamp(t2).must_equal t3
    ensure
      Sequel.default_timezone = nil
    end
  end

  it "should have Database#to_application_timestamp convert values using the database's timezone" do
    begin
      t = Time.utc(2011, 1, 2, 3, 4, 5) # UTC Time
      t2 = Time.mktime(2011, 1, 2, 3, 4, 5) # Local Time
      t3 = Time.utc(2011, 1, 2, 3, 4, 5) - (t - t2) # Local Time in UTC Time
      t4 = Time.mktime(2011, 1, 2, 3, 4, 5) + (t - t2) # UTC Time in Local Time
      Sequel.default_timezone = :utc
      @db.to_application_timestamp('2011-01-02 03:04:05').must_equal t
      Sequel.database_timezone = :local
      @db.to_application_timestamp('2011-01-02 03:04:05').must_equal t3
      Sequel.default_timezone = :local
      @db.to_application_timestamp('2011-01-02 03:04:05').must_equal t2
      Sequel.database_timezone = :utc
      @db.to_application_timestamp('2011-01-02 03:04:05').must_equal t4

      Sequel.default_timezone = :utc
      @db.timezone = :local
      @db.to_application_timestamp('2011-01-02 03:04:05').must_equal t3
      Sequel.default_timezone = :local
      @db.timezone = :utc
      @db.to_application_timestamp('2011-01-02 03:04:05').must_equal t4
    ensure
      Sequel.default_timezone = nil
    end
  end

  it "should typecast datetime values to Sequel.datetime_class with correct timezone handling" do
    t = Time.utc(2011, 1, 2, 3, 4, 5, 500000) # UTC Time
    t2 = Time.mktime(2011, 1, 2, 3, 4, 5, 500000) # Local Time
    t3 = Time.utc(2011, 1, 2, 3, 4, 5, 500000) - (t - t2) # Local Time in UTC Time
    t4 = Time.mktime(2011, 1, 2, 3, 4, 5, 500000) + (t - t2) # UTC Time in Local Time
    secs = Rational(11, 2)
    r1 = Rational(t2.utc_offset, 86400)
    r2 = Rational((t - t2).to_i, 86400)
    dt = DateTime.civil(2011, 1, 2, 3, 4, secs)
    dt2 = DateTime.civil(2011, 1, 2, 3, 4, secs, r1)
    dt3 = DateTime.civil(2011, 1, 2, 3, 4, secs) - r2
    dt4 = DateTime.civil(2011, 1, 2, 3, 4, secs, r1) + r2

    t.must_equal t4
    t2.must_equal t3
    dt.must_equal dt4
    dt2.must_equal dt3

    check = proc do |i, o| 
      v = @db.typecast_value(:datetime, i)
      v.must_equal o
      if o.is_a?(Time)
        v.utc_offset.must_equal o.utc_offset
      else
        v.offset.must_equal o.offset
      end
    end
    @db.extend_datasets(Module.new{def supports_timestamp_timezones?; true; end})
    begin
      @db.typecast_value(:datetime, dt).must_equal t
      @db.typecast_value(:datetime, dt2).must_equal t2
      @db.typecast_value(:datetime, t).must_equal t
      @db.typecast_value(:datetime, t2).must_equal t2
      @db.typecast_value(:datetime, @db.literal(dt)[1...-1]).must_equal t
      @db.typecast_value(:datetime, dt.strftime('%F %T.%N')).must_equal t2
      @db.typecast_value(:datetime, Date.civil(2011, 1, 2)).must_equal Time.mktime(2011, 1, 2, 0, 0, 0)
      @db.typecast_value(:datetime, :year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000).must_equal t2

      Sequel.datetime_class = DateTime
      @db.typecast_value(:datetime, dt).must_equal dt
      @db.typecast_value(:datetime, dt2).must_equal dt2
      @db.typecast_value(:datetime, t).must_equal dt
      @db.typecast_value(:datetime, t2).must_equal dt2
      @db.typecast_value(:datetime, @db.literal(dt)[1...-1]).must_equal dt
      @db.typecast_value(:datetime, dt.strftime('%F %T.%N')).must_equal dt
      @db.typecast_value(:datetime, Date.civil(2011, 1, 2)).must_equal DateTime.civil(2011, 1, 2, 0, 0, 0)
      @db.typecast_value(:datetime, :year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000).must_equal dt

      Sequel.application_timezone = :utc
      Sequel.typecast_timezone = :local
      Sequel.datetime_class = Time
      check[dt, t]
      check[dt2, t3]
      check[t, t]
      check[t2, t3]
      check[@db.literal(dt)[1...-1], t]
      check[dt.strftime('%F %T.%N'), t3]
      check[Date.civil(2011, 1, 2), Time.utc(2011, 1, 2, 0, 0, 0)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, t3]

      Sequel.datetime_class = DateTime
      check[dt, dt]
      check[dt2, dt3]
      check[t, dt]
      check[t2, dt3]
      check[@db.literal(dt)[1...-1], dt]
      check[dt.strftime('%F %T.%N'), dt3]
      check[Date.civil(2011, 1, 2), DateTime.civil(2011, 1, 2, 0, 0, 0)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, dt3]

      Sequel.typecast_timezone = :utc
      Sequel.datetime_class = Time
      check[dt, t]
      check[dt2, t3]
      check[t, t]
      check[t2, t3]
      check[@db.literal(dt)[1...-1], t]
      check[dt.strftime('%F %T.%N'), t]
      check[Date.civil(2011, 1, 2), Time.utc(2011, 1, 2, 0, 0, 0)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, t]

      Sequel.datetime_class = DateTime
      check[dt, dt]
      check[dt2, dt3]
      check[t, dt]
      check[t2, dt3]
      check[@db.literal(dt)[1...-1], dt]
      check[dt.strftime('%F %T.%N'), dt]
      check[Date.civil(2011, 1, 2), DateTime.civil(2011, 1, 2, 0, 0, 0)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, dt]

      Sequel.application_timezone = :local
      Sequel.datetime_class = Time
      check[dt, t4]
      check[dt2, t2]
      check[t, t4]
      check[t2, t2]
      check[@db.literal(dt)[1...-1], t4]
      check[dt.strftime('%F %T.%N'), t4]
      check[Date.civil(2011, 1, 2), Time.local(2011, 1, 2, 0, 0, 0)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, t4]

      Sequel.datetime_class = DateTime
      check[dt, dt4]
      check[dt2, dt2]
      check[t, dt4]
      check[t2, dt2]
      check[@db.literal(dt)[1...-1], dt4]
      check[dt.strftime('%F %T.%N'), dt4]
      check[Date.civil(2011, 1, 2), DateTime.civil(2011, 1, 2, 0, 0, 0, r1)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, dt4]

      Sequel.typecast_timezone = :local
      Sequel.datetime_class = Time
      check[dt, t4]
      check[dt2, t2]
      check[t, t4]
      check[t2, t2]
      check[@db.literal(dt)[1...-1], t4]
      check[dt.strftime('%F %T.%N'), t2]
      check[Date.civil(2011, 1, 2), Time.local(2011, 1, 2, 0, 0, 0)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, t2]

      Sequel.datetime_class = DateTime
      check[dt, dt4]
      check[dt2, dt2]
      check[t, dt4]
      check[t2, dt2]
      check[@db.literal(dt)[1...-1], dt4]
      check[dt.strftime('%F %T.%N'), dt2]
      check[Date.civil(2011, 1, 2), DateTime.civil(2011, 1, 2, 0, 0, 0, r1)]
      check[{:year=>dt.year, :month=>dt.month, :day=>dt.day, :hour=>dt.hour, :minute=>dt.min, :second=>dt.sec, :nanos=>500000000}, dt2]

    ensure
      Sequel.default_timezone = nil
      Sequel.datetime_class = Time
    end
  end

  it "should handle arrays when typecasting timestamps" do
    begin
      @db.typecast_value(:datetime, [2011, 10, 11, 12, 13, 14]).must_equal Time.local(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, [2011, 10, 11, 12, 13, 14, 500000000]).must_equal Time.local(2011, 10, 11, 12, 13, 14, 500000)

      Sequel.datetime_class = DateTime
      @db.typecast_value(:datetime, [2011, 10, 11, 12, 13, 14]).must_equal DateTime.civil(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, [2011, 10, 11, 12, 13, 14, 500000000]).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2))
      @db.typecast_value(:datetime, [2011, 10, 11, 12, 13, 14, 500000000, Rational(1, 2)]).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2), Rational(1, 2))
    ensure
      Sequel.datetime_class = Time
    end
  end

  it "should handle hashes when typecasting timestamps" do
    begin
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14).must_equal Time.local(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :nanos=>500000000).must_equal Time.local(2011, 10, 11, 12, 13, 14, 500000)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14).must_equal Time.local(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'nanos'=>500000000).must_equal Time.local(2011, 10, 11, 12, 13, 14, 500000)

      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :offset=>Rational(1, 2)).must_equal Time.new(2011, 10, 11, 12, 13, 14, 43200)
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :nanos=>500000000, :offset=>Rational(1, 2)).must_equal Time.new(2011, 10, 11, 12, 13, 14.5, 43200)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'offset'=>Rational(1, 2)).must_equal Time.new(2011, 10, 11, 12, 13, 14, 43200)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'nanos'=>500000000, 'offset'=>Rational(1, 2)).must_equal Time.new(2011, 10, 11, 12, 13, 14.5, 43200)

      Sequel.default_timezone = :utc
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14).must_equal Time.utc(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :nanos=>500000000).must_equal Time.utc(2011, 10, 11, 12, 13, 14, 500000)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14).must_equal Time.utc(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'nanos'=>500000000).must_equal Time.utc(2011, 10, 11, 12, 13, 14, 500000)

      Sequel.datetime_class = DateTime
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14).must_equal DateTime.civil(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :nanos=>500000000).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2))
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14).must_equal DateTime.civil(2011, 10, 11, 12, 13, 14)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'nanos'=>500000000).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2))
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :offset=>Rational(1, 2)).must_equal DateTime.civil(2011, 10, 11, 12, 13, 14, Rational(1, 2))
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :nanos=>500000000, :offset=>Rational(1, 2)).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2), Rational(1, 2))
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'offset'=>Rational(1, 2)).must_equal DateTime.civil(2011, 10, 11, 12, 13, 14, Rational(1, 2))
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'nanos'=>500000000, 'offset'=>Rational(1, 2)).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2), Rational(1, 2))

      Sequel.default_timezone = :local
      offset = Rational(Time.local(2011, 10, 11, 12, 13, 14).utc_offset, 86400)
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14).must_equal DateTime.civil(2011, 10, 11, 12, 13, 14, offset)
      @db.typecast_value(:datetime, :year=>2011, :month=>10, :day=>11, :hour=>12, :minute=>13, :second=>14, :nanos=>500000000).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2), offset)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14).must_equal DateTime.civil(2011, 10, 11, 12, 13, 14, offset)
      @db.typecast_value(:datetime, 'year'=>2011, 'month'=>10, 'day'=>11, 'hour'=>12, 'minute'=>13, 'second'=>14, 'nanos'=>500000000).must_equal DateTime.civil(2011, 10, 11, 12, 13, Rational(29, 2), offset)
    ensure
      Sequel.datetime_class = Time
      Sequel.default_timezone = nil
    end
  end

  it "should typecast decimal values to BigDecimal" do
    [1.0, 1, '1.0', BigDecimal('1.0')].each do |i|
      v = @db.typecast_value(:decimal, i)
      v.must_be_kind_of(BigDecimal)
      v.must_equal BigDecimal('1.0')
    end
  end

  it "should typecast float values to Float" do
    [1.0, 1, '1.0', BigDecimal('1.0')].each do |i|
      v = @db.typecast_value(:float, i)
      v.must_be_kind_of(Float)
      v.must_equal 1.0
    end
  end

  it "should typecast string values to String" do
    [1.0, '1.0', Sequel.blob('1.0')].each do |i|
      v = @db.typecast_value(:string, i)
      v.must_be_instance_of(String)
      v.must_equal "1.0"
    end
  end

  it "should raise errors when typecasting hash and array values to String" do
    [[], {}].each do |i|
      proc{@db.typecast_value(:string, i)}.must_raise(Sequel::InvalidValue)
    end
  end

  it "should typecast time values to SQLTime" do
    t = Time.now
    st = Sequel::SQLTime.local(t.year, t.month, t.day, 1, 2, 3)
    [st, Time.utc(t.year, t.month, t.day, 1, 2, 3), Time.local(t.year, t.month, t.day, 1, 2, 3), '01:02:03', {:hour=>1, :minute=>2, :second=>3}].each do |i|
      v = @db.typecast_value(:time, i)
      v.must_be_instance_of(Sequel::SQLTime)
      v.must_equal st
    end
  end

  it "should correctly handle time value conversion to SQLTime with fractional seconds" do
    t = Time.now
    st = Sequel::SQLTime.local(t.year, t.month, t.day, 1, 2, 3, 500000)
    t = Time.local(t.year, t.month, t.day, 1, 2, 3, 500000)
    @db.typecast_value(:time, t).must_equal st
  end

  it "should have an underlying exception class available at wrapped_exception" do
    begin
      @db.typecast_value(:date, 'a')
      true.must_equal false
    rescue Sequel::InvalidValue => e
      e.wrapped_exception.must_be_kind_of(ArgumentError)
    end
  end

  it "should have an underlying exception class available at cause" do
    begin
      @db.typecast_value(:date, 'a')
      true.must_equal false
    rescue Sequel::InvalidValue => e
      e.cause.must_be_kind_of(ArgumentError)
    end
  end if RUBY_VERSION >= '2.1'

  it "should have an underlying exception class available at cause when using nested exceptions" do
    begin
      begin
        raise ArgumentError
      rescue => e1
        begin
          raise RuntimeError
        rescue
          @db.send(:raise_error, e1)
        end
      end
    rescue Sequel::DatabaseError => e
      e.cause.must_be_kind_of(ArgumentError)
    end
  end if RUBY_VERSION >= '2.1'

  it "should include underlying exception class in #inspect" do
    begin
      @db.typecast_value(:date, 'a')
      true.must_equal false
    rescue Sequel::InvalidValue => e
      e.inspect.must_equal '#<Sequel::InvalidValue: ArgumentError: invalid date>'
    end
  end
end

describe "Database#blank_object?" do
  it "should return whether the object is considered blank" do
    db = Sequel::Database.new
    c = lambda{|meth, value| Class.new{define_method(meth){value}}.new}

    db.send(:blank_object?, "").must_equal true
    db.send(:blank_object?, "  ").must_equal true
    db.send(:blank_object?, nil).must_equal true
    db.send(:blank_object?, false).must_equal true
    db.send(:blank_object?, []).must_equal true
    db.send(:blank_object?, {}).must_equal true
    db.send(:blank_object?, c[:empty?, true]).must_equal true
    db.send(:blank_object?, c[:blank?, true]).must_equal true

    db.send(:blank_object?, " a ").must_equal false
    db.send(:blank_object?, 1).must_equal false
    db.send(:blank_object?, 1.0).must_equal false
    db.send(:blank_object?, true).must_equal false
    db.send(:blank_object?, [1]).must_equal false
    db.send(:blank_object?, {1.0=>2.0}).must_equal false
    db.send(:blank_object?, c[:empty?, false]).must_equal false
    db.send(:blank_object?, c[:blank?, false]).must_equal false 
  end
end

describe "Database#schema_autoincrementing_primary_key?" do
  it "should indicate whether the parsed schema row indicates a primary key" do
    m = Sequel::Database.new.method(:schema_autoincrementing_primary_key?)
    m.call(:primary_key=>true, :auto_increment=>true).must_equal true
    m.call(:primary_key=>true, :auto_increment=>false).must_equal false
    m.call(:primary_key=>false).must_equal false
  end
end

describe "Database#supports_schema_parsing?" do
  it "should be false by default" do
    Sequel::Database.new.supports_schema_parsing?.must_equal false
  end

  it "should be true if the database implements schema_parse_table" do
    db = Sequel::Database.new
    def db.schema_parse_table(*) end
    db.supports_schema_parsing?.must_equal true
  end
end

describe "Database#supports_foreign_key_parsing?" do
  it "should be false by default" do
    Sequel::Database.new.supports_foreign_key_parsing?.must_equal false
  end

  it "should be true if the database implements foreign_key_list" do
    db = Sequel::Database.new
    def db.foreign_key_list(*) end
    db.supports_foreign_key_parsing?.must_equal true
  end
end

describe "Database#supports_index_parsing?" do
  it "should be false by default" do
    Sequel::Database.new.supports_index_parsing?.must_equal false
  end

  it "should be true if the database implements indexes" do
    db = Sequel::Database.new
    def db.indexes(*) end
    db.supports_index_parsing?.must_equal true
  end
end

describe "Database#supports_table_listing?" do
  it "should be false by default" do
    Sequel::Database.new.supports_table_listing?.must_equal false
  end

  it "should be true if the database implements tables" do
    db = Sequel::Database.new
    def db.tables(*) end
    db.supports_table_listing?.must_equal true
  end
end

describe "Database#supports_view_listing?" do
  it "should be false by default" do
    Sequel::Database.new.supports_view_listing?.must_equal false
  end

  it "should be true if the database implements views" do
    db = Sequel::Database.new
    def db.views(*) end
    db.supports_view_listing?.must_equal true
  end
end

describe "Database#supports_deferrable_constraints?" do
  it "should be false by default" do
    Sequel::Database.new.supports_deferrable_constraints?.must_equal false
  end
end

describe "Database#supports_deferrable_foreign_key_constraints?" do
  it "should be false by default" do
    Sequel::Database.new.supports_deferrable_foreign_key_constraints?.must_equal false
  end
end

describe "Database#supports_transactional_ddl?" do
  it "should be false by default" do
    Sequel::Database.new.supports_transactional_ddl?.must_equal false
  end
end

describe "Database#global_index_namespace?" do
  it "should be true by default" do
    Sequel::Database.new.global_index_namespace?.must_equal true
  end
end

describe "Database#supports_savepoints?" do
  it "should be false by default" do
    Sequel::Database.new.supports_savepoints?.must_equal false
  end
end

describe "Database#supports_views_with_check_option?" do
  it "should be false by default" do
    Sequel::Database.new.supports_views_with_check_option?.must_equal false
  end
end

describe "Database#supports_views_with_local_check_option?" do
  it "should be false by default" do
    Sequel::Database.new.supports_views_with_local_check_option?.must_equal false
  end
end

describe "Database#supports_savepoints_in_prepared_transactions?" do
  it "should be false by default" do
    Sequel::Database.new.supports_savepoints_in_prepared_transactions?.must_equal false
  end

  it "should be true if both savepoints and prepared transactions are supported" do
    db = Sequel::Database.new
    db.define_singleton_method(:supports_savepoints?){true}
    db.define_singleton_method(:supports_prepared_transactions?){true}
    db.supports_savepoints_in_prepared_transactions?.must_equal true
  end
end

describe "Database#supports_prepared_transactions?" do
  it "should be false by default" do
    Sequel::Database.new.supports_prepared_transactions?.must_equal false
  end
end

describe "Database#supports_transaction_isolation_levels?" do
  it "should be false by default" do
    Sequel::Database.new.supports_transaction_isolation_levels?.must_equal false
  end
end

describe "Database#column_schema_to_ruby_default" do
  it "should handle converting many default formats" do
    db = Sequel::Database.new
    p = lambda{|d,t| db.send(:column_schema_to_ruby_default, d, t)}
    p[nil, :integer].must_be_nil
    p[1, :integer].must_equal 1
    p['1', :integer].must_equal 1
    p['-1', :integer].must_equal(-1)
    p[1.0, :float].must_equal 1.0
    p['1.0', :float].must_equal 1.0
    p['-1.0', :float].must_equal(-1.0)
    p['1.0', :decimal].must_equal BigDecimal('1.0')
    p['-1.0', :decimal].must_equal BigDecimal('-1.0')
    p[true, :boolean].must_equal true
    p[false, :boolean].must_equal false
    p['1', :boolean].must_equal true
    p['0', :boolean].must_equal false
    p['true', :boolean].must_equal true
    p['false', :boolean].must_equal false
    p["'t'", :boolean].must_equal true
    p["'f'", :boolean].must_equal false
    p["'a'", :string].must_equal 'a'
    p["'a'", :blob].must_equal Sequel.blob('a')
    p["'a'", :blob].must_be_kind_of(Sequel::SQL::Blob)
    p["''", :string].must_equal ''
    p["'\\a''b'", :string].must_equal "\\a'b"
    p["'NULL'", :string].must_equal "NULL"
    p[Date.today, :date].must_equal Date.today
    p["'2009-10-29'", :date].must_equal Date.new(2009,10,29)
    p["CURRENT_TIMESTAMP", :date].must_equal Sequel::CURRENT_DATE
    p["CURRENT_DATE", :date].must_equal Sequel::CURRENT_DATE
    p["now()", :date].must_equal Sequel::CURRENT_DATE
    p["getdate()", :date].must_equal Sequel::CURRENT_DATE
    p["CURRENT_TIMESTAMP", :datetime].must_equal Sequel::CURRENT_TIMESTAMP
    p["CURRENT_DATE", :datetime].must_equal Sequel::CURRENT_TIMESTAMP
    p["now()", :datetime].must_equal Sequel::CURRENT_TIMESTAMP
    p["getdate()", :datetime].must_equal Sequel::CURRENT_TIMESTAMP
    p["'2009-10-29T10:20:30-07:00'", :datetime].must_equal DateTime.parse('2009-10-29T10:20:30-07:00')
    p["'2009-10-29 10:20:30'", :datetime].must_equal DateTime.parse('2009-10-29 10:20:30')
    p["'10:20:30'", :time].must_equal Time.parse('10:20:30')
    p["NaN", :float].must_be_nil

    db = Sequel.mock(:host=>'postgres')
    p["''::text", :string].must_equal ""
    p["'\\a''b'::character varying", :string].must_equal "\\a'b"
    p["'a'::bpchar", :string].must_equal "a"
    p["(-1)", :integer].must_equal(-1)
    p["(-1.0)", :float].must_equal(-1.0)
    p['(-1.0)', :decimal].must_equal BigDecimal('-1.0')
    p["'a'::bytea", :blob].must_equal Sequel.blob('a')
    p["'a'::bytea", :blob].must_be_kind_of(Sequel::SQL::Blob)
    p["'2009-10-29'::date", :date].must_equal Date.new(2009,10,29)
    p["'2009-10-29 10:20:30.241343'::timestamp without time zone", :datetime].must_equal DateTime.parse('2009-10-29 10:20:30.241343')
    p["'10:20:30'::time without time zone", :time].must_equal Time.parse('10:20:30')

    db = Sequel.mock(:host=>'mysql')
    p["\\a'b", :string].must_equal "\\a'b"
    p["a", :string].must_equal "a"
    p["NULL", :string].must_equal "NULL"
    p["-1", :float].must_equal(-1.0)
    p['-1', :decimal].must_equal BigDecimal('-1.0')
    p["2009-10-29", :date].must_equal Date.new(2009,10,29)
    p["2009-10-29 10:20:30", :datetime].must_equal DateTime.parse('2009-10-29 10:20:30')
    p["10:20:30", :time].must_equal Time.parse('10:20:30')
    p["a", :enum].must_equal "a"
    p["a,b", :set].must_equal "a,b"
    
    db = Sequel.mock(:host=>'mssql')
    p["(N'a')", :string].must_equal "a"
    p["((-12))", :integer].must_equal(-12)
    p["((12.1))", :float].must_equal 12.1
    p["((-12.1))", :decimal].must_equal BigDecimal('-12.1')
  end
end

describe "Database extensions" do
  before(:all) do
    class << Sequel
      alias _extension extension
      remove_method :extension
      def extension(*)
      end
    end
  end
  after(:all) do
    class << Sequel
      remove_method :extension
      alias extension _extension
      remove_method :_extension
    end
  end
  before do
    @db = Sequel.mock
  end
  after do
    Sequel::Database.instance_variable_set(:@initialize_hook, proc{|db| })
  end

  it "should be able to register an extension with a module have Database#extension extend the module" do
    Sequel::Database.register_extension(:foo, Module.new{def a; 1; end})
    @db.extension(:foo).a.must_equal 1
  end

  it "should not call the block multiple times if extension loaded more than once" do
    @db.opts[:foo] = []
    Sequel::Database.register_extension(:foo){|db| db.opts[:foo] << 1}
    @db.extension(:foo).opts[:foo].must_equal [1]
    @db.extension(:foo).opts[:foo].must_equal [1]
  end

  it "should be able to register an extension with a block and have Database#extension call the block" do
    Sequel::Database.register_extension(:foo){|db| db.opts[:foo] = 1}
    @db.extension(:foo).opts[:foo].must_equal 1
  end

  it "should be able to register an extension with a callable and Database#extension call the callable" do
    Sequel::Database.register_extension(:foo, proc{|db| db.opts[:foo] = 1})
    @db.extension(:foo).opts[:foo].must_equal 1
  end

  it "should be able to load multiple extensions in the same call" do
    a = []
    Sequel::Database.register_extension(:foo, proc{|db| a << db.opts[:foo] = 1})
    Sequel::Database.register_extension(:bar, proc{|db| a << db.opts[:bar] = 2})
    @db.extension(:foo, :bar).opts.values_at(:foo, :bar).must_equal [1, 2]
    a.must_equal [1, 2]
  end

  it "should return the receiver" do
    Sequel::Database.register_extension(:foo, Module.new{def a; 1; end})
    @db.extension(:foo).must_be_same_as(@db)
  end

  it "should raise an Error if registering with both a module and a block" do
    proc{Sequel::Database.register_extension(:foo, Module.new){}}.must_raise(Sequel::Error)
  end

  it "should raise an Error if attempting to load an incompatible extension" do
    proc{@db.extension(:foo2)}.must_raise(Sequel::Error)
  end

  it "should be able to load an extension into all future Databases with Database.extension" do
    Sequel::Database.register_extension(:foo, Module.new{def a; 1; end})
    Sequel::Database.register_extension(:bar, Module.new{def b; 2; end})
    Sequel::Database.extension(:foo, :bar)
    @db.wont_respond_to(:a)
    @db.wont_respond_to(:b)
    Sequel.mock.a.must_equal 1
    Sequel.mock.b.must_equal 2
  end

  it "should be loadable via the :extensions Database option" do
    Sequel::Database.register_extension(:a, Module.new{def a; 1; end})
    Sequel::Database.register_extension(:b, Module.new{def b; 2; end})
    Sequel.mock(:extensions=>:a).a.must_equal 1
    db = Sequel.mock(:extensions=>'a,b')
    db.a.must_equal 1
    db.b.must_equal 2
    db = Sequel.mock(:extensions=>[:a, :b])
    db.a.must_equal 1
    db.b.must_equal 2
    proc{Sequel.mock(:extensions=>nil).a}.must_raise NoMethodError
    proc{Sequel.mock(:extensions=>Object.new)}.must_raise Sequel::Error
  end

  it "should support :preconnect_extensions Database option to load extensions before :preconnect" do
    x = []
    Sequel::Database.register_extension(:a, Module.new{define_singleton_method(:extended){|_| x << :a}})
    Sequel::Database.register_extension(:b, Module.new{define_singleton_method(:extended){|_| x << :b}})
    m = Mutex.new
    c = Class.new(Sequel::Database) do
      def dataset_class_default; Sequel::Dataset end
      define_method(:connect) do |_|
        m.synchronize{x << :c}
        :connect
      end
    end

    db = c.new(:max_connections=>2, :preconnect=>true, :preconnect_extensions=>:a, :extensions=>:b)
    db.pool.size.must_equal db.pool.max_size
    x.must_equal [:a, :c, :c, :b]

    x.clear
    db = c.new(:max_connections=>3, :preconnect=>:concurrently, :preconnect_extensions=>:b, :extensions=>:a)
    x.must_equal [:b, :c, :c, :c, :a]
    db.pool.size.must_equal db.pool.max_size
  end
  
end

describe "Database specific exception classes" do
  before do
    @db = Sequel.mock
    class << @db
      attr_accessor :sql_state

      def database_exception_sqlstate(exception, opts={})
        @sql_state
      end
    end
  end

  it "should use appropriate exception classes for given SQL states" do
    @db.fetch = ArgumentError
    @db.sql_state = '23502'
    proc{@db.get(:a)}.must_raise(Sequel::NotNullConstraintViolation)
    @db.sql_state = '23503'
    proc{@db.get(:a)}.must_raise(Sequel::ForeignKeyConstraintViolation)
    @db.sql_state = '23505'
    proc{@db.get(:a)}.must_raise(Sequel::UniqueConstraintViolation)
    @db.sql_state = '23513'
    proc{@db.get(:a)}.must_raise(Sequel::CheckConstraintViolation)
    @db.sql_state = '40001'
    proc{@db.get(:a)}.must_raise(Sequel::SerializationFailure)
  end
end

describe "Database.after_initialize" do
  after do
    Sequel::Database.instance_variable_set(:@initialize_hook, proc{|db| })
  end

  it "should allow a block to be run after each new instance is created" do
    Sequel::Database.after_initialize{|db| db.sql_log_level = :debug }
    db = Sequel.mock
    db.sql_log_level.must_equal :debug
  end

  it "should allow multiple hooks to be registered" do
    Sequel::Database.after_initialize{|db| db.sql_log_level = :debug }
    Sequel::Database.after_initialize{|db| db.loggers << 11 }

    db = Sequel.mock

    db.sql_log_level.must_equal :debug
    db.loggers.must_include(11)
  end

  it "should raise an error if registration is called without a block" do
    proc {
      Sequel::Database.after_initialize
    }.must_raise(Sequel::Error, /must provide block/i)
  end
end

describe "Database#schema_type_class" do
  it "should return the class or array of classes for the given type symbol" do
    db = Sequel.mock
    {:string=>String, :integer=>Integer, :date=>Date, :datetime=>[Time, DateTime],
      :time=>Sequel::SQLTime, :boolean=>[TrueClass, FalseClass], :float=>Float, :decimal=>BigDecimal,
      :blob=>Sequel::SQL::Blob}.each do |sym, klass|
      db.schema_type_class(sym).must_equal klass
    end
  end
end

describe "Database#execute_{dui,ddl,insert}" do
  before do
    @db = Sequel::Database.new
    def @db.execute(sql, opts={})
      (@sqls ||= []) << sql
    end
    def @db.sqls
      @sqls
    end
  end

  it "should execute the SQL" do
    @db.execute_dui "DELETE FROM table"
    @db.execute_ddl "SET foo"
    @db.execute_insert "INSERT INTO table DEFAULT VALUES"
    @db.sqls.must_equal ["DELETE FROM table", "SET foo", "INSERT INTO table DEFAULT VALUES"]
  end
end

describe "Dataset identifier folding" do
  it "should fold to uppercase by default, as per SQL" do
    Sequel::Database.new.send(:folds_unquoted_identifiers_to_uppercase?).must_equal true
  end
end
