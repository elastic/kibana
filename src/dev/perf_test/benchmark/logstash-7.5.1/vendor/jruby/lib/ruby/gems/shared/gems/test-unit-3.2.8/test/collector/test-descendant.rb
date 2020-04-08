require 'test/unit'
require 'test/unit/collector/descendant'

class TestUnitCollectorDescendant < Test::Unit::TestCase
  def setup
    @previous_descendants = Test::Unit::TestCase::DESCENDANTS.dup
    Test::Unit::TestCase::DESCENDANTS.clear
  end

  def teardown
    Test::Unit::TestCase::DESCENDANTS.replace(@previous_descendants)
  end

  private
  def assert_collect(expected, *collect_args)
    collector = Test::Unit::Collector::Descendant.new
    yield(collector) if block_given?
    assert_equal(expected, collector.send(:collect, *collect_args))
  end

  def default_name
    Test::Unit::Collector::Descendant::NAME
  end

  def empty_suite(name=nil)
    Test::Unit::TestSuite.new(name || default_name)
  end

  class TestCollect < self
    def setup
      super

      @test_case1 = Class.new(Test::Unit::TestCase) do
        self.test_order = :alphabetic

        def self.name
          "test-case1"
        end

        def test_1
        end

        def test_2
        end
      end

      @test_case2 = Class.new(Test::Unit::TestCase) do
        self.test_order = :alphabetic

        def self.name
          "test-case2"
        end

        def test_0
        end
      end

      @no_test_case = Class.new do
        def self.name
          "no-test-case"
        end

        def test_4
        end
      end
    end

    def test_basic
      assert_collect(full_suite("name"), "name")

      assert_collect(full_suite("name"), "name") do |collector|
        collector.filter = []
      end
    end

    def test_filtered
      assert_collect(empty_suite) do |collector|
        collector.filter = Proc.new {false}
      end

      assert_collect(full_suite) do |collector|
        collector.filter = Proc.new {true}
      end

      assert_collect(full_suite) do |collector|
        collector.filter = Proc.new {nil}
      end

      assert_collect(empty_suite) do |collector|
        collector.filter = [Proc.new {false}, Proc.new {true}]
      end

      assert_collect(empty_suite) do |collector|
        collector.filter = [Proc.new {true}, Proc.new {false}]
      end

      assert_collect(empty_suite) do |collector|
        collector.filter = [Proc.new {nil}, Proc.new {false}]
      end

      assert_collect(full_suite) do |collector|
        collector.filter = [Proc.new {nil}, Proc.new {true}]
      end

      expected = empty_suite
      suite1 = Test::Unit::TestSuite.new(@test_case1.name)
      suite1 << @test_case1.new("test_1")
      suite2 = Test::Unit::TestSuite.new(@test_case2.name)
      suite2 << @test_case2.new("test_0")
      expected << suite1 << suite2
      assert_collect(expected) do |collector|
        collector.filter = Proc.new do |test|
          ['test_1', 'test_0'].include?(test.method_name)
        end
      end

      suite1 = Test::Unit::TestSuite.new(@test_case1.name)
      suite1 << @test_case1.new("test_1")
      suite2 = Test::Unit::TestSuite.new(@test_case2.name)
      suite2 << @test_case2.new("test_0")
      assert_collect(empty_suite) do |collector|
        filters = [Proc.new {|test| test.method_name == 'test_1' ? true : nil},
                   Proc.new {|test| test.method_name == 'test_0' ? true : nil},
                   Proc.new {false}]
        collector.filter = filters
      end
    end

    private
    def full_suite(name=nil)
      sub_suite1 = Test::Unit::TestSuite.new(@test_case1.name)
      sub_suite1 << @test_case1.new('test_1')
      sub_suite1 << @test_case1.new('test_2')

      sub_suite2 = Test::Unit::TestSuite.new(@test_case2.name)
      sub_suite2 << @test_case2.new('test_0')

      suite = empty_suite(name)
      suite << sub_suite1
      suite << sub_suite2
      suite
    end
  end

  class TestModule < self
    def test_included_in_child
      tests = Module.new do
        def test_in_module
        end
      end

      parent_test_case = Class.new(Test::Unit::TestCase) do
        class << self
          def name
            "Parent"
          end
        end
      end

      child_test_case = Class.new(parent_test_case) do
        include tests

        class << self
          def name
            "Child"
          end
        end
      end

      child_suite = Test::Unit::TestSuite.new(child_test_case.name)
      child_suite << child_test_case.new("test_in_module")

      parent_suite = Test::Unit::TestSuite.new(parent_test_case.name)
      parent_suite << child_suite

      suite = empty_suite("all")
      suite << parent_suite

      assert_collect(suite, "all")
    end
  end
end
