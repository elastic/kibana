require_relative "spec_helper"

describe "Sequel::Plugins::Dirty" do
  before do
    @db = Sequel.mock(:fetch=>{:initial=>'i'.dup, :initial_changed=>'ic'.dup}, :numrows=>1)
    @c = Class.new(Sequel::Model(@db[:c]))
    @c.plugin :dirty
    @c.columns :initial, :initial_changed, :missing, :missing_changed
  end

  dirty_plugin_specs = shared_description do
    it "initial_value should be the current value if value has not changed" do
      @o.initial_value(:initial).must_equal 'i'
      @o.initial_value(:missing).must_be_nil
    end

    it "initial_value should be the intial value if value has changed" do
      @o.initial_value(:initial_changed).must_equal 'ic'
      @o.initial_value(:missing_changed).must_be_nil
    end

    it "initial_value should handle case where initial value is reassigned later" do
      @o.initial_changed = 'ic'
      @o.initial_value(:initial_changed).must_equal 'ic'
      @o.missing_changed = nil
      @o.initial_value(:missing_changed).must_be_nil
    end

    it "changed_columns should handle case where initial value is reassigned later" do
      @o.changed_columns.must_equal [:initial_changed, :missing_changed]
      @o.initial_changed = 'ic'
      @o.changed_columns.must_equal [:missing_changed]
      @o.missing_changed = nil
      @o.changed_columns.must_equal [:missing_changed]
    end

    it "column_change should give initial and current values if there has been a change made" do
      @o.column_change(:initial_changed).must_equal ['ic', 'ic2']
      @o.column_change(:missing_changed).must_equal [nil, 'mc2']
    end

    it "column_change should be nil if no change has been made" do
      @o.column_change(:initial).must_be_nil
      @o.column_change(:missing).must_be_nil
    end

    it "column_changed? should return whether the column has changed" do
      @o.column_changed?(:initial).must_equal false
      @o.column_changed?(:initial_changed).must_equal true
      @o.column_changed?(:missing).must_equal false
      @o.column_changed?(:missing_changed).must_equal true
    end

    it "column_changed? should handle case where initial value is reassigned later" do
      @o.initial_changed = 'ic'
      @o.column_changed?(:initial_changed).must_equal false
      @o.missing_changed = nil
      @o.column_changed?(:missing_changed).must_equal false
    end

    it "changed_columns should handle case where initial value is reassigned later" do
      @o.changed_columns.must_equal [:initial_changed, :missing_changed]
      @o.initial_changed = 'ic'
      @o.changed_columns.must_equal [:missing_changed]
      @o.missing_changed = nil
      @o.changed_columns.must_equal [:missing_changed]
    end

    it "column_changes should give initial and current values" do
      @o.column_changes.must_equal(:initial_changed=>['ic', 'ic2'], :missing_changed=>[nil, 'mc2'])
    end

    it "reset_column should reset the column to its initial value" do
      @o.reset_column(:initial)
      @o.initial.must_equal 'i'
      @o.reset_column(:initial_changed)
      @o.initial_changed.must_equal 'ic'
      @o.reset_column(:missing)
      @o.missing.must_be_nil
      @o.reset_column(:missing_changed)
      @o.missing_changed.must_be_nil
    end

    it "reset_column should remove missing values from the values" do
      @o.reset_column(:missing)
      @o.values.has_key?(:missing).must_equal false
      @o.reset_column(:missing_changed)
      @o.values.has_key?(:missing_changed).must_equal false
    end
    
    it "refresh should clear the cached initial values" do
      @o.refresh
      @o.column_changes.must_equal({})
    end
    
    it "will_change_column should be used to signal in-place modification to column" do
      @o.will_change_column(:initial)
      @o.initial << 'b'
      @o.column_change(:initial).must_equal ['i', 'ib']
      @o.will_change_column(:initial_changed)
      @o.initial_changed << 'b'
      @o.column_change(:initial_changed).must_equal ['ic', 'ic2b']
      @o.will_change_column(:missing)
      @o.values[:missing] = 'b'
      @o.column_change(:missing).must_equal [nil, 'b']
      @o.will_change_column(:missing_changed)
      @o.missing_changed << 'b'
      @o.column_change(:missing_changed).must_equal [nil, 'mc2b']
    end

    it "will_change_column should different types of existing objects" do
      [nil, true, false, Class.new{undef_method :clone}.new, Class.new{def clone; raise TypeError; end}.new].each do |v|
        o = @c.new(:initial=>v)
        o.will_change_column(:initial)
        o.initial = 'a'
        o.column_change(:initial).must_equal [v, 'a']
      end
    end

    it "should work when freezing objects" do
      @o.freeze
      @o.initial_value(:initial).must_equal 'i'
      proc{@o.initial = 'b'}.must_raise
    end

    it "should have #dup duplicate structures" do
      was_new = @o.new?
      @o.update(:missing=>'m2')
      @o.dup.initial_values.must_equal @o.initial_values
      @o.dup.initial_values.wont_be_same_as(@o.initial_values)
      @o.dup.instance_variable_get(:@missing_initial_values).must_equal @o.instance_variable_get(:@missing_initial_values)
      @o.dup.instance_variable_get(:@missing_initial_values).wont_be_same_as(@o.instance_variable_get(:@missing_initial_values))
      if was_new
        @o.previous_changes.must_be_nil
        @o.dup.previous_changes.must_be_nil
      else
        @o.dup.previous_changes.must_equal @o.previous_changes
      end
      @o.dup.previous_changes.wont_be_same_as(@o.previous_changes) if @o.previous_changes
    end
  end

  describe "with new instance" do
    before do
      @o = @c.new(:initial=>'i'.dup, :initial_changed=>'ic'.dup)
      @o.initial_changed = 'ic2'.dup
      @o.missing_changed = 'mc2'.dup
    end

    include dirty_plugin_specs

    it "save should clear the cached initial values" do
      @o.save
      @o.column_changes.must_equal({})
    end

    it "save_changes should clear the cached initial values" do
      @c.dataset = @c.dataset.with_extend do
        def supports_insert_select?; true end
        def insert_select(*) {:id=>1} end
      end
      @o.save
      @o.column_changes.must_equal({})
    end

    it "should work with the typecast_on_load plugin" do
      @c.instance_variable_set(:@db_schema, :initial=>{:type=>:integer})
      @c.plugin :typecast_on_load, :initial
      
      @o = @c.call(:initial=>'1')
      @o.column_changes.must_equal({})
      @o.save
      @o.previous_changes.must_equal({})
    end

    it "should have column_changes work with the typecast_on_load in after hooks" do
      @c.instance_variable_set(:@db_schema, :initial=>{:type=>:integer})
      @c.plugin :typecast_on_load, :initial
      
      @o = @c.new
      @o.initial = 1
      @o.column_changes.must_equal({:initial=>[nil, 1]})
      column_changes_in_after_save = nil
      @o.define_singleton_method(:after_save) do
        column_changes_in_after_save = column_changes
        super()
      end
      @db.fetch = {:initial=>1}
      @o.save
      column_changes_in_after_save.must_equal({:initial=>[nil, 1]})

      @o.initial = 2
      @o.column_changes.must_equal({:initial=>[1, 2]})
      @o.save
      column_changes_in_after_save.must_equal({:initial=>[1, 2]})
      @o.previous_changes.must_equal({:initial=>[1, 2]})
    end
  end

  describe "with existing instance" do
    before do
      @o = @c[1]
      @o.initial_changed = 'ic2'.dup
      @o.missing_changed = 'mc2'.dup
    end

    include dirty_plugin_specs

    it "previous_changes should be the previous changes after saving" do
      @o.save
      @o.previous_changes.must_equal(:initial_changed=>['ic', 'ic2'], :missing_changed=>[nil, 'mc2'])
    end

    it "should work when freezing objects after saving" do
      @o.initial = 'a'
      @o.save
      @o.freeze
      @o.previous_changes[:initial].must_equal ['i', 'a']
      proc{@o.initial = 'b'}.must_raise
    end
  end
end
