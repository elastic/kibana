require_relative "spec_helper"

describe "pg_auto_constraint_validations plugin" do
  def create_model(ds)
    @ds = ds
    @ds.send(:columns=, [:id, :i])
    @db.fetch = @metadata_results.dup
    c = Sequel::Model(@ds)
    c.plugin :pg_auto_constraint_validations
    c
  end

  before do
    info = @info = {:schema=>'public', :table=>'items'}
    @db = Sequel.mock(:host=>'postgres')
    def @db.schema(*) [[:i, {}], [:id, {}]] end
    @set_error = lambda{|ec, ei| @db.fetch = @db.autoid = @db.numrows = ec; info.merge!(ei)}
    @db.define_singleton_method(:error_info){|e| info}
    @metadata_results = [
     [{:constraint=>'items_i_check', :column=>'i', :definition=>'CHECK i'}, {:constraint=>'items_i_id_check', :column=>'i', :definition=>'CHECK i + id < 20'}, {:constraint=>'items_i_id_check', :column=>'id', :definition=>'CHECK i + id < 20'}],
     [{:name=>'items_i_uidx', :unique=>true, :column=>'i', :deferrable=>false}, {:name=>'items_i2_idx', :unique=>false, :column=>'i', :deferrable=>false}],
     [{:name=>'items_i_fk', :column=>'i', :on_update=>'a', :on_delete=>'a', :table=>'items2', :refcolumn=>'id', :schema=>'public'}],
     [{:name=>'items2_i_fk', :column=>'id', :on_update=>'a', :on_delete=>'a', :table=>'items2', :refcolumn=>'i', :schema=>'public'}],
     [{:nspname=>'public', :relname=>'items'}]
    ]
    @c = create_model(@db[:items])
  end

  it "should handle check constraint failures as validation errors when creating" do
    o = @c.new(:i=>12)
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check']
    proc{o.save}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is invalid'])
  end

  it "should handle check constraint failures as validation errors when updating" do
    o = @c.load(:i=>3)
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check']
    proc{o.update(:i=>12)}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is invalid'])
  end

  it "should handle unique constraint failures as validation errors when creating" do
    o = @c.new(:i=>2)
    @set_error[Sequel::UniqueConstraintViolation, :constraint=>'items_i_uidx']
    proc{o.save}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is already taken'])
  end

  it "should handle unique constraint failures as validation errors when updating" do
    o = @c.load(:id=>5, :i=>3)
    @set_error[Sequel::UniqueConstraintViolation, :constraint=>'items_i_uidx']
    proc{o.update(:i=>2)}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is already taken'])
  end

  it "should handle not null constraint failures as validation errors when creating" do
    o = @c.new(:i=>5)
    @set_error[Sequel::NotNullConstraintViolation, :column=>'i']
    proc{o.save}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is not present'])
  end

  it "should handle not null constraint failures as validation errors when updating" do
    o = @c.load(:i=>3)
    @set_error[Sequel::NotNullConstraintViolation, :column=>'i']
    proc{o.update(:i=>nil)}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is not present'])
  end

  it "should handle foreign key constraint failures as validation errors when creating" do
    o = @c.new(:i=>3)
    @set_error[Sequel::ForeignKeyConstraintViolation, :constraint=>'items_i_fk', :message_primary=>'insert or']
    proc{o.save}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is invalid'])
  end

  it "should handle foreign key constraint failures as validation errors when updating" do
    o = @c.load(:i=>1)
    @set_error[Sequel::ForeignKeyConstraintViolation, :constraint=>'items_i_fk', :message_primary=>'insert or']
    proc{o.update(:i=>3)}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is invalid'])
  end

  it "should handle foreign key constraint failures in other tables as validation errors when updating" do
    o = @c.load(:i=>1)
    @set_error[Sequel::ForeignKeyConstraintViolation, :constraint=>'items2_i_fk', :message_primary=>'update or', :schema=>'public', :table=>'items2']
    proc{o.update(:i=>3)}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['cannot be changed currently'])
  end

  it "should handle symbol, string, and identifier table names" do
    [@db[:items], @db.from('items'), @db.from{items}, @db.from{public[:items]}].each do |ds|
      c = create_model(ds)
      @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check']
      o = c.new(:i=>3)
      proc{o.save}.must_raise Sequel::ValidationFailed
      o.errors.must_equal(:i=>['is invalid'])
    end
  end

  it "should skip handling of other table types such as subqueries and functions" do
    [@db.from{foo(:bar)}, @db[:a, :b]].each do |ds|
      @db.fetch = @metadata_results.dup
      @c.dataset = ds
      o = @c.new(:i=>3)
      @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check']
      proc{o.save}.must_raise Sequel::CheckConstraintViolation
    end
  end

  it "should skip handling if the error_info method is not supported" do
    @db.singleton_class.send(:remove_method, :error_info)
    c = create_model(@db[:items])
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check']
    o = c.new(:i=>3)
    proc{o.save}.must_raise Sequel::CheckConstraintViolation
  end

  it "should not handle constraint failures if they can't be converted" do
    o = @c.new(:i=>12)
    @set_error[Sequel::NotNullConstraintViolation, {}]
    proc{o.save}.must_raise Sequel::NotNullConstraintViolation
  end

  it "should reraise original exception if there is an error" do
    o = @c.new(:i=>12)
    def o.add_pg_constraint_validation_error; end
    @set_error[Sequel::NotNullConstraintViolation, :column=>'i']
    proc{o.save}.must_raise Sequel::NotNullConstraintViolation
  end

  it "should not handle constraint failures if schema or table do not match" do
    o = @c.new(:i=>12)
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check', :schema=>'x']
    proc{o.save}.must_raise Sequel::CheckConstraintViolation
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check', :schema=>'public', :table=>'x']
    proc{o.save}.must_raise Sequel::CheckConstraintViolation
  end

  it "should handle constraint failures when disabling insert returning" do
    c = create_model(@db[:items].disable_insert_returning)
    o = c.new(:i=>12)
    o.id = 1
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_check']
    proc{o.save}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is invalid'])
  end

  it "should handle multi-column constraint failures as validation errors" do
    o = @c.new(:i=>12)
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_id_check']
    proc{o.save}.must_raise Sequel::ValidationFailed
    o.errors.must_equal([:i, :id]=>['is invalid'])
  end

  it "should handle multi-column constraint failures as validation errors when using the error_splitter plugin" do
    @c.plugin :error_splitter
    o = @c.new(:i=>12)
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_id_check']
    proc{o.save}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['is invalid'], :id=>['is invalid'])
  end

  it "should handle overridden constraint failures as validation errors when updating" do
    o = @c.load(:i=>3)
    @c.pg_auto_constraint_validation_override(:items_i_ocheck, :i, "foo bar")
    @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_ocheck']
    proc{o.update(:i=>12)}.must_raise Sequel::ValidationFailed
    o.errors.must_equal(:i=>['foo bar'])
  end

  it "should handle dumping cached metadata and loading metadata from cache" do
    cache_file = "spec/files/pgacv-spec-#{$$}.cache"
    begin
      @ds = @db[:items]
      @ds.send(:columns=, [:id, :i])
      @db.fetch = @metadata_results.dup
      c = Sequel::Model(@ds)
      def c.name; 'Foo' end
      @db.sqls
      c.plugin :pg_auto_constraint_validations, :cache_file=>cache_file
      @db.sqls.length.must_equal 5

      o = c.new(:i=>12)
      @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_id_check']
      proc{o.save}.must_raise Sequel::ValidationFailed

      c.dump_pg_auto_constraint_validations_cache

      @db.fetch = []
      c = Sequel::Model(@ds)
      def c.name; 'Foo' end
      @db.sqls
      c.plugin :pg_auto_constraint_validations, :cache_file=>cache_file
      @db.sqls.must_be_empty

      o = c.new(:i=>12)
      @set_error[Sequel::CheckConstraintViolation, :constraint=>'items_i_id_check']
      proc{o.save}.must_raise Sequel::ValidationFailed
    ensure
      File.delete(cache_file) if File.file?(cache_file)
    end
  end

  it "should raise error if attempting to dump cached metadata when not using caching" do
    proc{@c.dump_pg_auto_constraint_validations_cache}.must_raise Sequel::Error
  end
end
