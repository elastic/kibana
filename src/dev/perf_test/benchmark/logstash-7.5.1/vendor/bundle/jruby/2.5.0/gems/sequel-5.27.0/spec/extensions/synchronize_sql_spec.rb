require_relative 'spec_helper'

describe "synchronize_sql extension" do
  module Sync
    def literal_string_append(sql, v)
      db.synchronize{super}
    end
  end

  before do
    @db = Sequel.mock
    @db.pool.extend(Module.new do
      def assign_connection(*args)
        r = super
        @times_connection_acquired ||= 0
        @times_connection_acquired += 1 if r
        return r
      end

      def times_connection_acquired
        v = @times_connection_acquired
        @times_connection_acquired = 0
        v || 0
      end
    end)
    @db.extend_datasets(Sync)
    @ds = @db[:tab1]
  end

  it 'does not checkout a connection if SQL is given as a string' do
    @ds.extension(:synchronize_sql).with_sql('SELECT 1').sql
    @db.pool.times_connection_acquired.must_equal 0
  end

  it 'checks out an extra connection on insert_sql if there are no strings' do
    @ds.insert_sql(:numeric_foo => 8)
    @db.pool.times_connection_acquired.must_equal 0

    extds = @ds.extension(:synchronize_sql)
    extds.insert_sql(:numeric_foo => 8)
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out just one connection on insert_sql if there are multiple strings' do
    @ds.insert_sql(:string_foo1 => 'eight', :string_foo2 => 'nine', :string_foo3 => 'ten')
    @db.pool.times_connection_acquired.must_equal 3

    extds = @ds.extension(:synchronize_sql)
    extds.insert_sql(:string_foo1 => 'eight', :string_foo2 => 'nine', :string_foo3 => 'ten')
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'cheks out an extra connectrion on update_sql if there are no strings' do
    @ds.where(:numeric_foo => [1, 2, 3, 4, 5]).update_sql(:numeric_foo => 99)
    @db.pool.times_connection_acquired.must_equal 0

    extds = @ds.extension(:synchronize_sql)
    extds.where(:numeric_foo => [1, 2, 3, 4, 5]).update_sql(:numeric_foo => 99)
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out just one connection on update_sql if there are multiple strings' do
    @ds.where(:numeric_foo => [1, 2, 3, 4, 5]).update_sql(:string_foo1 => 'eight', :string_foo2 => 'nine', :string_foo3 => 'ten')
    @db.pool.times_connection_acquired.must_equal 3

    extds = @ds.extension(:synchronize_sql)
    extds.where(:numeric_foo => [1, 2, 3, 4, 5]).update_sql(:string_foo1 => 'eight', :string_foo2 => 'nine', :string_foo3 => 'ten')
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out an extra connection on delete_sql if there are no strings' do
    @ds.where(:numeric_foo => [1, 2, 3]).delete_sql
    @db.pool.times_connection_acquired.must_equal 0

    extds = @ds.extension(:synchronize_sql)
    extds.where(:numeric_foo => [1, 2, 3]).delete_sql
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out just one connection on delete_sql if there are multiple strings' do
    @ds.where(:string_foo => ['one', 'two', 'three', 'four']).delete_sql
    @db.pool.times_connection_acquired.must_equal 4

    extds = @ds.extension(:synchronize_sql)
    extds.where(:string_foo => ['one', 'two', 'three', 'four']).delete_sql
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out an extra connection on select_sql if there are no strings' do
    @ds.where(:numeric_foo => [1, 2, 3]).select_sql
    @db.pool.times_connection_acquired.must_equal 0

    extds = @ds.extension(:synchronize_sql)
    extds.where(:numeric_foo => [1, 2, 3]).select_sql
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out just one connection on select_sql if there are multiple strings' do
    @ds.where(:string_foo => ['one', 'two', 'three', 'four']).select_sql
    @db.pool.times_connection_acquired.must_equal 4

    extds = @ds.extension(:synchronize_sql)
    extds.where(:string_foo => ['one', 'two', 'three', 'four']).select_sql
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out an extra connection on fetch if there are no strings' do
    @db.fetch('SELECT * FROM tab1 WHERE numeric_foo IN (?, ?, ?, ?)', 1, 2, 3, 4).select_sql
    @db.pool.times_connection_acquired.must_equal 0

    @db.extension(:synchronize_sql)
    @db.fetch('SELECT * FROM tab1 WHERE numeric_foo IN (?, ?, ?, ?)', 1, 2, 3, 4).select_sql
    @db.pool.times_connection_acquired.must_equal 1
  end

  it 'checks out just one connection on fetch if there are multiple strings' do
    @db.fetch('SELECT * FROM tab1 WHERE string_foo IN (?, ?, ?, ?)', 'one', 'two', 'three', 'four').select_sql
    @db.pool.times_connection_acquired.must_equal 4

    @db.extension(:synchronize_sql)
    @db.fetch('SELECT * FROM tab1 WHERE string_foo IN (?, ?, ?, ?)', 'one', 'two', 'three', 'four').select_sql
    @db.pool.times_connection_acquired.must_equal 1
  end
end
