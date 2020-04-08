require_relative "spec_helper"

describe Sequel::Database do
  before do
    @db = DB
  end

  it "should provide disconnect functionality" do
    @db.disconnect
    @db.pool.size.must_equal 0
    @db.test_connection
    @db.pool.size.must_equal 1
  end

  it "should provide disconnect functionality after preparing a statement" do
    @db.create_table!(:items){Integer :i}
    @db[:items].prepare(:first, :a).call
    @db.disconnect
    @db.pool.size.must_equal 0
    @db.drop_table?(:items)
  end

  it "should raise Sequel::DatabaseError on invalid SQL" do
    proc{@db << "S"}.must_raise(Sequel::DatabaseError)
  end

  it "should have Sequel::DatabaseError#sql give the SQL causing the error" do
    (@db << "SELECT") rescue (e = $!)
    e.sql.must_equal "SELECT"
  end if ENV['SEQUEL_ERROR_SQL']

  describe "constraint violations" do
    before do
      @db.drop_table?(:test2, :test)
    end
    after do
      @db.drop_table?(:test2, :test)
    end

    cspecify "should raise Sequel::UniqueConstraintViolation when a unique constraint is violated", [:jdbc, :sqlite] do
      @db.create_table!(:test){String :a, :unique=>true, :null=>false}
      @db[:test].insert('1')
      proc{@db[:test].insert('1')}.must_raise(Sequel::UniqueConstraintViolation)
      @db[:test].insert('2')
      proc{@db[:test].update(:a=>'1')}.must_raise(Sequel::UniqueConstraintViolation)
    end

    cspecify "should raise Sequel::UniqueConstraintViolation when a unique constraint is violated for composite primary keys", [:jdbc, :sqlite] do
      @db.create_table!(:test){String :a; String :b; primary_key [:a, :b]}
      @db[:test].insert(:a=>'1', :b=>'2')
      proc{@db[:test].insert(:a=>'1', :b=>'2')}.must_raise(Sequel::UniqueConstraintViolation)
      @db[:test].insert(:a=>'3', :b=>'4')
      proc{@db[:test].update(:a=>'1', :b=>'2')}.must_raise(Sequel::UniqueConstraintViolation)
    end

    cspecify "should raise Sequel::CheckConstraintViolation when a check constraint is violated", [proc{|db| !db.mariadb? || db.server_version <= 100200}, :mysql], [proc{|db| db.sqlite_version < 30802}, :sqlite] do
      @db.create_table!(:test){String :a; check Sequel.~(:a=>'1')}
      proc{@db[:test].insert('1')}.must_raise(Sequel::CheckConstraintViolation)
      @db[:test].insert('2')
      proc{@db[:test].insert('1')}.must_raise(Sequel::CheckConstraintViolation)
    end

    cspecify "should raise Sequel::ForeignKeyConstraintViolation when a foreign key constraint is violated", [:jdbc, :sqlite]  do
      @db.create_table!(:test, :engine=>:InnoDB){primary_key :id}
      @db.create_table!(:test2, :engine=>:InnoDB){foreign_key :tid, :test}
      proc{@db[:test2].insert(:tid=>1)}.must_raise(Sequel::ForeignKeyConstraintViolation)
      @db[:test].insert
      @db[:test2].insert(:tid=>1)
      proc{@db[:test2].where(:tid=>1).update(:tid=>3)}.must_raise(Sequel::ForeignKeyConstraintViolation)
      proc{@db[:test].where(:id=>1).delete}.must_raise(Sequel::ForeignKeyConstraintViolation)
    end

    cspecify "should raise Sequel::NotNullConstraintViolation when a not null constraint is violated", [:jdbc, :sqlite] do
      @db.create_table!(:test){Integer :a, :null=>false}
      proc{@db[:test].insert(:a=>nil)}.must_raise(Sequel::NotNullConstraintViolation)
      unless @db.database_type == :mysql
        # Broken mysql silently changes NULL here to 0, and doesn't raise an exception.
        @db[:test].insert(2)
        proc{@db[:test].update(:a=>nil)}.must_raise(Sequel::NotNullConstraintViolation)
      end
    end
  end

  it "should store underlying wrapped exception in Sequel::DatabaseError" do
    begin
      @db << "SELECT"
    rescue Sequel::DatabaseError=>e
      if defined?(Java::JavaLang::Exception)
        (e.wrapped_exception.is_a?(Exception) || e.wrapped_exception.is_a?(Java::JavaLang::Exception)).must_equal true
      else
        e.wrapped_exception.must_be_kind_of(Exception)
      end
    end
  end

  it "should not have the connection pool swallow non-StandardError based exceptions" do
    proc{@db.pool.hold{raise Interrupt, "test"}}.must_raise(Interrupt)
  end

  it "should be able to disconnect connections more than once without exceptions" do
    conn = @db.synchronize{|c| c}
    @db.disconnect
    @db.disconnect_connection(conn)
    @db.disconnect_connection(conn)
  end

  it "should provide ability to check connections for validity" do
    conn = @db.synchronize{|c| c}
    @db.valid_connection?(conn).must_equal true
    @db.disconnect
    @db.valid_connection?(conn).must_equal false
  end
end
