require_relative "spec_helper"

describe "pg_static_cache_updater extension" do
  before do
    @db = Sequel.connect('mock://postgres')
    @db.extend_datasets{def quote_identifiers?; false end}
    def @db.listen(chan, opts={})
      execute("LISTEN #{chan}")
      yield(*opts[:yield])
    end
    @db.extension(:pg_static_cache_updater)
    @model = Class.new(Sequel::Model(@db[:table]))
    @model.plugin :static_cache
    @db.sqls
  end

  it "#create_static_cache_update_function should create a function in the database" do
    @db.create_static_cache_update_function
    @db.sqls.first.gsub(/\s+/, ' ').must_equal " CREATE FUNCTION sequel_static_cache_update() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN PERFORM pg_notify(''sequel_static_cache_update'', TG_RELID::text); RETURN NULL; END ' "
  end

  it "#create_static_cache_update_function should support :channel_name and :function_name options" do
    @db.create_static_cache_update_function(:channel_name=>'foo', :function_name=>'bar')
    @db.sqls.first.gsub(/\s+/, ' ').must_equal " CREATE FUNCTION bar() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN PERFORM pg_notify(''foo'', TG_RELID::text); RETURN NULL; END ' "
  end

  it "#create_static_cache_update_trigger should create a trigger for the database table" do
    @db.create_static_cache_update_trigger(:tab)
    @db.sqls.first.gsub(/\s+/, ' ').must_equal "CREATE TRIGGER sequel_static_cache_update AFTER INSERT OR UPDATE OR DELETE ON tab EXECUTE PROCEDURE sequel_static_cache_update()"
  end

  it "#create_static_cache_update_trigger should support :trigger_name and :function_name options" do
    @db.create_static_cache_update_trigger(:tab, :trigger_name=>'foo', :function_name=>'bar')
    @db.sqls.first.gsub(/\s+/, ' ').must_equal "CREATE TRIGGER foo AFTER INSERT OR UPDATE OR DELETE ON tab EXECUTE PROCEDURE bar()"
  end

  it "#default_static_cache_update_name should return the default name for function, trigger, and channel" do
    @db.default_static_cache_update_name.must_equal :sequel_static_cache_update
  end

  it "#listen_for_static_cache_updates should listen for changes to model tables and reload model classes" do
    @db.fetch = {:v=>1234}
    @db.listen_for_static_cache_updates([@model], :yield=>[nil, nil, 1234]).join
    @db.sqls.must_equal ["SELECT CAST(CAST('table' AS regclass) AS oid) AS v LIMIT 1", "LISTEN sequel_static_cache_update", "SELECT * FROM table"]
  end

  it "#listen_for_static_cache_updates should not reload model classes if oid doesn't match" do
    @db.fetch = {:v=>1234}
    @db.listen_for_static_cache_updates([@model], :yield=>[nil, nil, 12345]).join
    @db.sqls.must_equal ["SELECT CAST(CAST('table' AS regclass) AS oid) AS v LIMIT 1", "LISTEN sequel_static_cache_update"]
  end

  it "#listen_for_static_cache_updates should support a single model argument" do
    @db.fetch = {:v=>1234}
    @db.listen_for_static_cache_updates(@model, :yield=>[nil, nil, 1234]).join
    @db.sqls.must_equal ["SELECT CAST(CAST('table' AS regclass) AS oid) AS v LIMIT 1", "LISTEN sequel_static_cache_update", "SELECT * FROM table"]
  end

  it "#listen_for_static_cache_updates should support the :channel_name option" do
    @db.fetch = {:v=>1234}
    @db.listen_for_static_cache_updates([@model], :yield=>[nil, nil, 12345], :channel_name=>:foo).join
    @db.sqls.must_equal ["SELECT CAST(CAST('table' AS regclass) AS oid) AS v LIMIT 1", "LISTEN foo"]
  end

  it "#listen_for_static_cache_updates should raise an error if given an empty array" do
    @db.fetch = {:v=>1234}
    proc{@db.listen_for_static_cache_updates([])}.must_raise(Sequel::Error)
  end

  it "#listen_for_static_cache_updates should raise an error if one of the models is not using the static cache plugin" do
    @db.fetch = {:v=>1234}
    proc{@db.listen_for_static_cache_updates(Class.new(Sequel::Model(@db[:table])))}.must_raise(Sequel::Error)
  end

  it "#listen_for_static_cache_updates should raise an error if the database doesn't respond to listen" do
    @db = Sequel.mock(:host=>'postgres')
    @db.extension(:pg_static_cache_updater)
    @db.fetch = {:v=>1234}
    proc{@db.listen_for_static_cache_updates(Class.new(Sequel::Model(@db[:table])))}.must_raise(Sequel::Error)
  end

  it "#listen_for_static_cache_updates should handle a :before_thread_exit option" do
    a = []
    @db.listen_for_static_cache_updates([@model], :yield=>[nil, nil, 12345], :before_thread_exit=>proc{a << 1}).join
    a.must_equal [1]
  end

  it "#listen_for_static_cache_updates should call :before_thread_exit option even if listen raises an exception" do
    a = []
    @db.listen_for_static_cache_updates([@model], :yield=>[nil, nil, 12345], :after_listen=>proc{raise ArgumentError}, :before_thread_exit=>proc{a << 1}).join
    a.must_equal [1]
  end
end
