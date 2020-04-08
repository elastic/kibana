require_relative "spec_helper"

describe "Sequel::Plugins::Uuid" do
  before do
    uuid = @uuid = '57308544-4e83-47b8-b87f-6f68b987f4f9'
    @alt_uuid = 'd5d1ec46-5e8e-4a7b-adc9-50e76b819e19'
    @c = Class.new(Sequel::Model(:t))
    @c.class_eval do
      columns :id, :uuid
      plugin :uuid
      def _save_refresh(*) end
      define_method(:create_uuid) do
        uuid
      end
      db.reset
    end
  end
  
  it "should handle validations on the uuid field for new objects" do
    @c.plugin :uuid, :force=>true
    o = @c.new
    def o.validate
      errors.add(model.uuid_field, 'not present') unless send(model.uuid_field)
    end
    o.valid?.must_equal true
  end

  it "should set uuid field when skipping validations" do
    @c.plugin :uuid
    @c.new.save(:validate=>false)
    @c.db.sqls.must_equal ["INSERT INTO t (uuid) VALUES ('#{@uuid}')"]
  end

  it "should set the uuid field on creation" do
    o = @c.create
    @c.db.sqls.must_equal ["INSERT INTO t (uuid) VALUES ('#{@uuid}')"]
    o.uuid.must_equal @uuid
  end

  it "should allow specifying the uuid field via the :field option" do
    c = Class.new(Sequel::Model(:t))
    c.class_eval do
      columns :id, :u
      plugin :uuid, :field=>:u
      def _save_refresh(*) end
    end
    o = c.create
    c.db.sqls.must_equal ["INSERT INTO t (u) VALUES ('#{o.u}')"]
  end

  it "should not raise an error if the model doesn't have the uuid column" do
    @c.columns :id, :x
    @c.send(:undef_method, :uuid)
    @c.create(:x=>2)
    @c.load(:id=>1, :x=>2).save
    @c.db.sqls.must_equal ["INSERT INTO t (x) VALUES (2)", "UPDATE t SET x = 2 WHERE (id = 1)"]
  end

  it "should not overwrite an existing uuid value" do
    o = @c.create(:uuid=>@alt_uuid)
    @c.db.sqls.must_equal ["INSERT INTO t (uuid) VALUES ('#{@alt_uuid}')"]
    o.uuid.must_equal @alt_uuid
  end

  it "should overwrite an existing uuid if the :force option is used" do
    @c.plugin :uuid, :force=>true
    o = @c.create(:uuid=>@alt_uuid)
    @c.db.sqls.must_equal ["INSERT INTO t (uuid) VALUES ('#{@uuid}')"]
    o.uuid.must_equal @uuid
  end

  it "should have uuid_field give the uuid field" do
    @c.uuid_field.must_equal :uuid
    @c.plugin :uuid, :field=>:u
    @c.uuid_field.must_equal :u
  end

  it "should have uuid_overwrite? give the whether to overwrite an existing uuid" do
    @c.uuid_overwrite?.must_equal false
    @c.plugin :uuid, :force=>true
    @c.uuid_overwrite?.must_equal true
  end

  it "should work with subclasses" do
    c = Class.new(@c)
    o = c.create
    o.uuid.must_equal @uuid
    c.db.sqls.must_equal ["INSERT INTO t (uuid) VALUES ('#{@uuid}')"]
    c.create(:uuid=>@alt_uuid).uuid.must_equal @alt_uuid

    c.class_eval do
      columns :id, :u
      plugin :uuid, :field=>:u, :force=>true
    end
    c2 = Class.new(c)
    c2.db.reset
    o = c2.create
    o.u.must_equal @uuid
    c2.db.sqls.must_equal ["INSERT INTO t (u) VALUES ('#{@uuid}')"]
  end
end
