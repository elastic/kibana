require_relative "spec_helper"

describe "optimistic_locking plugin" do
  before do
    @c = Class.new(Sequel::Model(:people)) do
    end
    h = {1=>{:id=>1, :name=>'John', :lock_version=>2}}
    lv = @lv = "lock_version".dup
    @c.dataset = @c.dataset.with_numrows(proc do |sql|
      case sql
      when /UPDATE people SET (name|#{lv}) = ('Jim'|'Bob'|\d+), (?:name|#{lv}) = ('Jim'|'Bob'|\d+) WHERE \(\(id = (\d+)\) AND \(#{lv} = (\d+)\)\)/
        name, nlv = $1 == 'name' ? [$2, $3] : [$3, $2]
        m = h[$4.to_i]
        if m && m[:lock_version] == $5.to_i
          m.merge!(:name=>name.gsub("'", ''), :lock_version=>nlv.to_i)
          1
        else
          0
        end
      when /UPDATE people SET #{lv} = (\d+) WHERE \(\(id = (\d+)\) AND \(#{lv} = (\d+)\)\)/
        m = h[$2.to_i]
        if m && m[:lock_version] == $3.to_i
          m.merge!(:lock_version=>$1.to_i)
          1
        else
          0
        end
      when /DELETE FROM people WHERE \(\(id = (\d+)\) AND \(#{lv} = (\d+)\)\)/
        m = h[$1.to_i]
        if m && m[lv.to_sym] == $2.to_i
          h.delete[$1.to_i]
          1
        else
          0
        end
      else
        puts sql
      end
    end).with_fetch(proc do |sql|
      m = h[1].dup
      v = m.delete(:lock_version)
      m[lv.to_sym] = v
      m
    end)
    @c.columns :id, :name, :lock_version
    @c.plugin :optimistic_locking
  end

  it "should raise an error when updating a stale record" do
    p1 = @c[1]
    p2 = @c[1]
    p1.update(:name=>'Jim')
    proc{p2.update(:name=>'Bob')}.must_raise(Sequel::Plugins::OptimisticLocking::Error)
  end 

  it "should raise an error when destroying a stale record" do
    p1 = @c[1]
    p2 = @c[1]
    p1.update(:name=>'Jim')
    proc{p2.destroy}.must_raise(Sequel::Plugins::OptimisticLocking::Error)
  end 

  it "should not raise an error when updating the same record twice" do
    p1 = @c[1]
    p1.update(:name=>'Jim')
    p1.update(:name=>'Bob')
  end

  it "should allow changing the lock column via model.lock_column=" do
    @lv.replace('lv')
    @c.columns :id, :name, :lv
    @c.lock_column = :lv
    p1 = @c[1]
    p2 = @c[1]
    p1.update(:name=>'Jim')
    proc{p2.update(:name=>'Bob')}.must_raise(Sequel::Plugins::OptimisticLocking::Error)
  end

  it "should allow changing the lock column via plugin option" do
    @lv.replace('lv')
    @c.columns :id, :name, :lv
    @c.plugin :optimistic_locking, :lock_column=>:lv
    p1 = @c[1]
    p2 = @c[1]
    p1.update(:name=>'Jim')
    proc{p2.destroy}.must_raise(Sequel::Plugins::OptimisticLocking::Error)
  end

  it "should work when subclassing" do
    c = Class.new(@c)
    p1 = c[1]
    p2 = c[1]
    p1.update(:name=>'Jim')
    proc{p2.update(:name=>'Bob')}.must_raise(Sequel::Plugins::OptimisticLocking::Error)
  end

  it "should work correctly if attempting to refresh and save again after a failed save" do
    p1 = @c[1]
    p2 = @c[1]
    p1.update(:name=>'Jim')
    begin
      p2.update(:name=>'Bob')
    rescue Sequel::Plugins::OptimisticLocking::Error
      p2.refresh
      @c.db.sqls
      p2.update(:name=>'Bob')
    end
    @c.db.sqls.must_equal ["UPDATE people SET name = 'Bob', lock_version = 4 WHERE ((id = 1) AND (lock_version = 3))"]
  end

  it "should increment the lock column when #modified! even if no columns are changed" do
    p1 = @c[1]
    p1.modified!
    lv = p1.lock_version
    p1.save_changes
    p1.lock_version.must_equal lv + 1
  end

  it "should not increment the lock column when the update fails" do
    @c.dataset = @c.dataset.with_extend{def update(_) raise end}
    p1 = @c[1]
    p1.modified!
    lv = p1.lock_version
    proc{p1.save_changes}.must_raise(RuntimeError)
    p1.lock_version.must_equal lv
  end
end
