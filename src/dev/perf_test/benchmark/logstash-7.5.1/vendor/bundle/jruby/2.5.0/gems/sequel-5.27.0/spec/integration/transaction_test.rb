require_relative "spec_helper"

describe "Database transactions" do
  before(:all) do
    @db = DB
    @db.create_table!(:items, :engine=>'InnoDB'){String :name; Integer :value}
    @d = @db[:items]
  end
  before do
    @d.delete
  end
  after(:all) do
    @db.drop_table?(:items)
  end

  it "should support transactions" do
    @db.transaction{@d.insert(:name => 'abc', :value => 1)}
    @d.count.must_equal 1
  end

  it "should have #transaction yield the connection" do
    @db.transaction{|conn| conn.wont_equal nil}
  end

  it "should have #in_transaction? work correctly" do
    @db.in_transaction?.must_equal false
    c = nil
    @db.transaction{c = @db.in_transaction?}
    c.must_equal true
  end

  it "should correctly rollback transactions" do
    proc do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        raise Interrupt, 'asdf'
      end
    end.must_raise(Interrupt)

    @db.transaction do
      @d.insert(:name => 'abc', :value => 1)
      raise Sequel::Rollback
    end.must_be_nil

    proc do
      @db.transaction(:rollback=>:reraise) do
        @d.insert(:name => 'abc', :value => 1)
        raise Sequel::Rollback
      end
    end.must_raise(Sequel::Rollback)

    @db.transaction(:rollback=>:always) do
      @d.insert(:name => 'abc', :value => 1)
      2
    end.must_equal 2

    @d.count.must_equal 0
  end

  it "should support nested transactions" do
    @db.transaction do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
      end 
    end 
    @d.count.must_equal 1

    @d.delete
    @db.transaction do
      @d.insert(:name => 'abc', :value => 1)
      @db.transaction do
        raise Sequel::Rollback
      end 
    end
    @d.count.must_equal 0

    proc {@db.transaction do
      @d.insert(:name => 'abc', :value => 1)
      @db.transaction do
        raise Interrupt, 'asdf'
      end 
    end}.must_raise(Interrupt)
    @d.count.must_equal 0
  end 

  it "should support rollback_on_exit" do
    @db.transaction do
      @d.insert(:name => 'abc', :value => 1)
      @db.rollback_on_exit
    end
    @d.must_be_empty

    catch(:foo) do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.rollback_on_exit
        throw :foo
      end
    end
    @d.must_be_empty

    lambda do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.rollback_on_exit
        return true
      end
    end
    @d.must_be_empty

    @db.transaction do
      @d.insert(:name => 'abc', :value => 1)
      @db.rollback_on_exit
      @db.rollback_on_exit(:cancel=>true)
    end
    @d.count.must_equal 1

    @d.delete
    @db.transaction do
      @d.insert(:name => 'abc', :value => 1)
      @db.rollback_on_exit(:cancel=>true)
    end
    @d.count.must_equal 1

    @d.delete
    @db.transaction do
      @d.insert(:name => 'abc', :value => 1)
      @db.rollback_on_exit
      @db.rollback_on_exit(:cancel=>true)
      @db.rollback_on_exit
    end
    @d.must_be_empty
  end
  
  if DB.supports_savepoints?
    it "should support rollback_on_exit inside savepoints" do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.rollback_on_exit
        end
      end
      @d.must_be_empty

      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.rollback_on_exit
          @db.transaction(:savepoint=>true) do
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.must_be_empty

      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.transaction(:savepoint=>true) do
            @db.rollback_on_exit
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.must_be_empty
    end

    it "should support rollback_on_exit with :savepoint option" do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.rollback_on_exit(:savepoint=>true)
        end
      end
      @d.select_order_map(:value).must_equal [1]

      @d.delete
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.rollback_on_exit(:savepoint=>true)
          @db.transaction(:savepoint=>true) do
            @db.rollback_on_exit(:savepoint=>true)
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.select_order_map(:value).must_equal [1]
    end

    it "should support rollback_on_exit with :savepoint=>Integer" do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.rollback_on_exit(:savepoint=>2)
        end
      end
      @d.must_be_empty

      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.rollback_on_exit(:savepoint=>3)
        end
      end
      @d.must_be_empty

      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.transaction(:savepoint=>true) do
            @db.rollback_on_exit(:savepoint=>2)
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.select_order_map(:value).must_equal [1]
    end

    it "should support rollback_on_exit with :savepoint=>Integer and :cancel" do
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @db.rollback_on_exit(:savepoint=>true)
          @d.insert(:name => 'def', :value => 2)
          @db.transaction(:savepoint=>true) do
            @db.rollback_on_exit(:savepoint=>2, :cancel=>true)
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.select_order_map(:value).must_equal [1, 2, 3]

      @d.delete
      @db.transaction do
        @db.rollback_on_exit(:savepoint=>true)
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @db.rollback_on_exit(:savepoint=>true)
          @d.insert(:name => 'def', :value => 2)
          @db.transaction(:savepoint=>true) do
            @db.rollback_on_exit(:savepoint=>3, :cancel=>true)
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.select_order_map(:value).must_equal [1, 2, 3]

      @d.delete
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.rollback_on_exit(:savepoint=>true)
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => 'def', :value => 2)
          @db.transaction(:savepoint=>true) do
            @db.rollback_on_exit(:savepoint=>4, :cancel=>true)
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.select_order_map(:value).must_equal [1, 2, 3]

      @d.delete
      @db.transaction do
        @d.insert(:name => 'abc', :value => 1)
        @db.transaction(:savepoint=>true) do
          @db.rollback_on_exit(:savepoint=>2)
          @d.insert(:name => 'def', :value => 2)
          @db.transaction(:savepoint=>true) do
            @db.rollback_on_exit(:savepoint=>2, :cancel=>true)
            @d.insert(:name => 'ghi', :value => 3)
          end
        end
      end
      @d.must_be_empty
    end

    it "should handle table_exists? failures inside transactions" do
      @db.transaction do
        @d.insert(:name => '1')
        @db.table_exists?(:asadf098asd9asd98sa).must_equal false
        @d.insert(:name => '2')
      end
      @d.select_order_map(:name).must_equal %w'1 2'
    end

    it "should handle :rollback=>:always inside transactions" do
      @db.transaction do
        @db.transaction(:rollback=>:always) do
          @d.insert(:name => 'abc', :value => 1)
          2
        end.must_equal 2
      end
      @d.select_order_map(:value).must_equal []
    end

    it "should handle table_exists? failures inside savepoints" do
      @db.transaction do
        @d.insert(:name => '1')
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => '2')
          @db.table_exists?(:asadf098asd9asd98sa).must_equal false
          @d.insert(:name => '3')
        end
        @d.insert(:name => '4')
      end
      @d.select_order_map(:name).must_equal %w'1 2 3 4'
    end

    it "should support nested transactions through savepoints using the savepoint option" do
      @db.transaction do
        @d.insert(:name => '1')
        @db.transaction(:savepoint=>true) do
          @d.insert(:name => '2')
          @db.transaction do
            @d.insert(:name => '3')
            raise Sequel::Rollback
          end
        end
        @d.insert(:name => '4')
        @db.transaction do
          @d.insert(:name => '6')
          @db.transaction(:savepoint=>true) do
            @d.insert(:name => '7')
            raise Sequel::Rollback
          end
        end
        @d.insert(:name => '5')
      end

      @d.order(:name).map(:name).must_equal %w{1 4 5 6}
    end

    it "should support nested transactions through savepoints using the auto_savepoint option" do
      @db.transaction(:auto_savepoint=>true) do
        @d.insert(:name => '1')
        @db.transaction do
          @d.insert(:name => '2')
          @db.transaction do
            @d.insert(:name => '3')
            raise Sequel::Rollback
          end
        end
        @d.insert(:name => '4')
        @db.transaction(:auto_savepoint=>true) do
          @d.insert(:name => '6')
          @db.transaction do
            @d.insert(:name => '7')
            raise Sequel::Rollback
          end
        end
        @d.insert(:name => '5')
      end

      @d.order(:name).map(:name).must_equal %w{1 4 5 6}
    end
  end

  it "should handle returning inside of the block by committing" do
    def ret_commit
      @db.transaction do
        @db[:items].insert(:name => 'abc')
        return
      end
    end

    @d.count.must_equal 0
    ret_commit
    @d.count.must_equal 1
    ret_commit
    @d.count.must_equal 2
    proc do
      @db.transaction do
        raise Interrupt, 'asdf'
      end
    end.must_raise(Interrupt)

    @d.count.must_equal 2
  end

  if DB.supports_prepared_transactions?
    it "should allow saving and destroying of model objects" do
      c = Class.new(Sequel::Model(@d))
      c.set_primary_key :name
      c.unrestrict_primary_key
      @db.transaction(:prepare=>'XYZ'){c.create(:name => '1'); c.create(:name => '2').destroy}
      @db.commit_prepared_transaction('XYZ')
      @d.select_order_map(:name).must_equal ['1']
    end

    it "should commit prepared transactions using commit_prepared_transaction" do
      @db.transaction(:prepare=>'XYZ'){@d.insert(:name => '1')}
      @db.commit_prepared_transaction('XYZ')
      @d.select_order_map(:name).must_equal ['1']
    end

    it "should rollback prepared transactions using rollback_prepared_transaction" do
      @db.transaction(:prepare=>'XYZ'){@d.insert(:name => '1')}
      @db.rollback_prepared_transaction('XYZ')
      @d.select_order_map(:name).must_equal []
    end

    if DB.supports_savepoints_in_prepared_transactions?
      it "should support savepoints when using prepared transactions" do
        @db.transaction(:prepare=>'XYZ'){@db.transaction(:savepoint=>true){@d.insert(:name => '1')}}
        @db.commit_prepared_transaction('XYZ')
        @d.select_order_map(:name).must_equal ['1']
      end
    end
  end

  it "should support all transaction isolation levels" do
    [:uncommitted, :committed, :repeatable, :serializable].each_with_index do |l, i|
      @db.transaction(:isolation=>l){@d.insert(:name => 'abc', :value => 1)}
      @d.count.must_equal i + 1
    end
  end

  it "should support after_commit outside transactions" do
    c = nil
    @db.after_commit{c = 1}
    c.must_equal 1
  end

  it "should support after_rollback outside transactions" do
    c = nil
    @db.after_rollback{c = 1}
    c.must_be_nil
  end

  it "should support after_commit inside transactions" do
    c = nil
    @db.transaction{@db.after_commit{c = 1}; c.must_be_nil}
    c.must_equal 1
  end

  it "should support after_rollback inside transactions" do
    c = nil
    @db.transaction{@db.after_rollback{c = 1}; c.must_be_nil}
    c.must_be_nil
  end

  it "should not call after_commit if the transaction rolls back" do
    c = nil
    @db.transaction{@db.after_commit{c = 1}; c.must_be_nil; raise Sequel::Rollback}
    c.must_be_nil
  end

  it "should call after_rollback if the transaction rolls back" do
    c = nil
    @db.transaction{@db.after_rollback{c = 1}; c.must_be_nil; raise Sequel::Rollback}
    c.must_equal 1
  end

  it "should support multiple after_commit blocks inside transactions" do
    c = []
    @db.transaction{@db.after_commit{c << 1}; @db.after_commit{c << 2}; c.must_equal []}
    c.must_equal [1, 2]
  end

  it "should support multiple after_rollback blocks inside transactions" do
    c = []
    @db.transaction{@db.after_rollback{c << 1}; @db.after_rollback{c << 2}; c.must_equal []; raise Sequel::Rollback}
    c.must_equal [1, 2]
  end

  it "should support after_commit inside nested transactions" do
    c = nil
    @db.transaction{@db.transaction{@db.after_commit{c = 1}}; c.must_be_nil}
    c.must_equal 1
  end

  it "should support after_rollback inside nested transactions" do
    c = nil
    @db.transaction{@db.transaction{@db.after_rollback{c = 1}}; c.must_be_nil; raise Sequel::Rollback}
    c.must_equal 1
  end

  if DB.supports_savepoints?
    it "should support after_commit inside savepoints" do
      c = nil
      @db.transaction{@db.transaction(:savepoint=>true){@db.after_commit{c = 1}}; c.must_be_nil}
      c.must_equal 1
    end

    it "should support after_rollback inside savepoints" do
      c = nil
      @db.transaction{@db.transaction(:savepoint=>true){@db.after_rollback{c = 1}}; c.must_be_nil; raise Sequel::Rollback}
      c.must_equal 1
    end

    it "should support after_commit inside savepoints with :savepoint_option" do
      c = nil
      @db.transaction{@db.transaction(:savepoint=>true){@db.after_commit(:savepoint=>true){c = 1}}; c.must_be_nil}
      c.must_equal 1

      c = nil
      @db.transaction{@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.after_commit(:savepoint=>true){c = 1}}}; c.must_be_nil}
      c.must_equal 1

      c = nil
      @db.transaction{@db.transaction(:savepoint=>true, :rollback=>:always){@db.after_commit(:savepoint=>true){c = 1}}}
      c.must_be_nil

      @db.transaction(:rollback=>:always){@db.transaction(:savepoint=>true){@db.after_commit(:savepoint=>true){c = 1}}}
      c.must_be_nil

      @db.transaction(:rollback=>:always){@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.after_commit(:savepoint=>true){c = 1}}}}
      c.must_be_nil
    end

    it "should support after_rollback inside savepoints with :savepoint_option" do
      c = nil
      @db.transaction{@db.transaction(:savepoint=>true, :rollback=>:always){@db.after_rollback(:savepoint=>true){c = 1}; c.must_be_nil}; c.must_equal 1}
      c.must_equal 1

      c = nil
      @db.transaction(:rollback=>:always){@db.transaction(:savepoint=>true){@db.after_rollback(:savepoint=>true){c = 1}}; c.must_be_nil}
      c.must_equal 1

      c = nil
      @db.transaction(:rollback=>:always){@db.transaction(:savepoint=>true, :rollback=>:always){@db.after_rollback(:savepoint=>true){c = 1}; c.must_be_nil}; c.must_equal 1}
      c.must_equal 1

      c = nil
      @db.transaction(:rollback=>:always){@db.transaction(:savepoint=>true){@db.after_rollback(:savepoint=>true){c = 1}}; c.must_be_nil}
      c.must_equal 1

      c = nil
      @db.transaction(:rollback=>:always){@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true){@db.after_rollback(:savepoint=>true){c = 1}}; c.must_be_nil}}
      c.must_equal 1

      c = nil
      @db.transaction(:rollback=>:always){@db.transaction(:savepoint=>true){@db.transaction(:savepoint=>true, :rollback=>:always){@db.after_rollback(:savepoint=>true){c = 1}; c.must_be_nil}; c.must_equal 1}}
      c.must_equal 1

      c = nil
      @db.transaction{@db.transaction(:savepoint=>true, :rollback=>:always){@db.transaction(:savepoint=>true){@db.after_rollback(:savepoint=>true){c = 1}}; c.must_be_nil}; c.must_equal 1}
      c.must_equal 1
    end
  end

  if DB.supports_prepared_transactions?
    it "should raise an error if you attempt to use after_commit or after_rollback inside a prepared transaction" do
      proc{@db.transaction(:prepare=>'XYZ'){@db.after_commit{}}}.must_raise(Sequel::Error)
      proc{@db.transaction(:prepare=>'XYZ'){@db.after_rollback{}}}.must_raise(Sequel::Error)
    end

    if DB.supports_savepoints_in_prepared_transactions?
      it "should raise an error if you attempt to use after_commit or after rollback inside a savepoint in a prepared transaction" do
        proc{@db.transaction(:prepare=>'XYZ'){@db.transaction(:savepoint=>true){@db.after_commit{}}}}.must_raise(Sequel::Error)
        proc{@db.transaction(:prepare=>'XYZ'){@db.transaction(:savepoint=>true){@db.after_rollback{}}}}.must_raise(Sequel::Error)
      end
    end
  end
end

describe "Database transaction retrying" do
  before(:all) do
    @db = DB
    @db.create_table!(:items, :engine=>'InnoDB'){String :a, :unique=>true, :null=>false}
    @d = @db[:items]
  end
  before do
    @d.delete
  end
  after(:all) do
    @db.drop_table?(:items)
  end

  it "should be supported using the :retry_on option" do
    @d.insert('b')
    @d.insert('c')
    s = 'a'
    @db.transaction(:retry_on=>Sequel::ConstraintViolation) do
      s = s.succ
      @d.insert(s)
    end
    @d.select_order_map(:a).must_equal %w'b c d'
  end

  it "should limit number of retries via the :num_retries option" do
    @d.insert('b')
    @d.insert('c')
    s = 'a'
    lambda do
      @db.transaction(:num_retries=>1, :retry_on=>Sequel::ConstraintViolation) do
        s = s.succ
        @d.insert(s)
      end
    end.must_raise(Sequel::UniqueConstraintViolation, Sequel::ConstraintViolation)
    @d.select_order_map(:a).must_equal %w'b c'
  end
end

