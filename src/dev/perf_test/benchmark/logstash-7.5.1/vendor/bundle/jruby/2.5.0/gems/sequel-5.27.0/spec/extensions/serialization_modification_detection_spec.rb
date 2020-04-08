require_relative "spec_helper"
require 'yaml'

describe "serialization_modification_detection plugin" do
  before do
    @c = Class.new(Sequel::Model(:items))
    @c.class_eval do
      columns :id, :h
      plugin :serialization, :yaml, :h
      plugin :serialization_modification_detection
    end
    @o1 = @c.new(:h=>{})
    @o2 = @c.load(:id=>1, :h=>"--- {}\n\n")
    @o3 = @c.new
    @o4 = @c.load(:id=>1, :h=>nil)
    DB.reset
  end
  
  it "should not detect columns that haven't been changed" do
    @o1.changed_columns.must_equal []
    @o1.h.must_equal({})
    @o1.h[1] = 2
    @o1.h.clear
    @o1.changed_columns.must_equal []

    @o2.changed_columns.must_equal []
    @o2.h.must_equal({})
    @o2.h[1] = 2
    @o2.h.clear
    @o2.changed_columns.must_equal []
  end
  
  it "should detect columns that have been changed" do
    @o1.changed_columns.must_equal []
    @o1.h.must_equal({})
    @o1.h[1] = 2
    @o1.changed_columns.must_equal [:h]

    @o2.changed_columns.must_equal []
    @o2.h.must_equal({})
    @o2.h[1] = 2
    @o2.changed_columns.must_equal [:h]

    @o3.changed_columns.must_equal []
    @o3.h.must_be_nil
    @o3.h = {}
    @o3.changed_columns.must_equal [:h]

    @o4.changed_columns.must_equal []
    @o4.h.must_be_nil
    @o4.h = {}
    @o4.changed_columns.must_equal [:h]
  end
  
  it "should report correct changed_columns after saving" do
    @o1.h[1] = 2
    @o1.save
    @o1.changed_columns.must_equal []

    @o2.h[1] = 2
    @o2.save_changes
    @o2.changed_columns.must_equal []

    @o3.h = {1=>2}
    @o3.save
    @o3.changed_columns.must_equal []

    @o4.h = {1=>2}
    @o4.save
    @o4.changed_columns.must_equal []
  end

  it "should work with frozen objects" do
    @o1.changed_columns.must_equal []
    @o1.h.must_equal({})
    @o1.freeze
    @o1.h[1] = 2
    @o1.changed_columns.must_equal [:h]
  end

  it "should work with duplicating objects" do
    @o2.changed_columns.must_equal []
    o = @o2.dup
    @o2.h.must_equal({})
    @o2.h[1] = 2
    @o2.changed_columns.must_equal [:h]
    o.changed_columns.must_equal []
  end

  it "should work with duplicating objects after modifying them" do
    @o2.changed_columns.must_equal []
    @o2.h.must_equal({})
    @o2.h[1] = 2
    @o2.changed_columns.must_equal [:h]
    o = @o2.dup
    o.changed_columns.must_equal [:h]
  end
end
