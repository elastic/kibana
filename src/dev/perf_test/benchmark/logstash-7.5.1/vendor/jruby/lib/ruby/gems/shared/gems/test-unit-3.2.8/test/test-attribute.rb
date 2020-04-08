class TestUnitAttribute < Test::Unit::TestCase
  class TestStack < Test::Unit::TestCase
    class << self
      def suite
        Test::Unit::TestSuite.new(name)
      end
    end

    class Stack
      def initialize
        @data = []
      end

      def push(data)
        @data.push(data)
      end

      def peek
        @data[-2]
      end

      def empty?
        @data.empty?
      end

      def size
        @data.size + 11
      end
    end

    def setup
      @stack = Stack.new
    end

    attribute :category, :accessor
    def test_peek
      @stack.push(1)
      @stack.push(2)
      assert_equal(2, @stack.peek)
    end

    attribute :bug, 1234
    def test_bug_1234
      assert_equal(0, @stack.size)
    end

    def test_no_attributes
      assert(@stack.empty?)
      @stack.push(1)
      assert(!@stack.empty?)
      assert_equal(1, @stack.size)
    end
  end

  def test_set_attributes
    test_for_accessor_category = TestStack.new("test_peek")
    assert_equal({"category" => :accessor},
                 test_for_accessor_category.attributes)

    test_for_bug_1234 = TestStack.new("test_bug_1234")
    assert_equal({"bug" => 1234}, test_for_bug_1234.attributes)

    test_no_attributes = TestStack.new("test_no_attributes")
    assert_equal({}, test_no_attributes.attributes)
  end

  def test_callback
    changed_attributes = []
    observer = Proc.new do |test_case, key, old_value, value, method_name|
      changed_attributes << [test_case, key, old_value, value, method_name]
    end

    test_case = Class.new(TestStack) do
      register_attribute_observer(:bug, &observer)
      attribute("bug", 9876, "test_bug_1234")
      attribute(:description, "Test for peek", "test_peek")
      attribute(:bug, 29, "test_peek")
    end

    assert_equal([
                  [test_case, "bug", 1234, 9876, "test_bug_1234"],
                  [test_case, "bug", nil, 29, "test_peek"],
                 ],
                 changed_attributes)
  end

  def test_attributes_with_prepended_module
    omit("Module#prepend is needed") unless Module.respond_to?(:prepend, true)
    test_case = Class.new(TestStack) do
      prepend Module.new
    end
    assert_equal({
                   "category" => :accessor,
                 },
                 test_case.attributes("test_peek"))
  end

  class TestDescription < self
    def test_decoration_style
      test_case = Class.new(TestStack) do
        description "Test for push"
        def test_push
        end
      end

      test_push = test_case.new("test_push")
      assert_equal({"description" => "Test for push"},
                   test_push.attributes)
    end

    def test_explicit_test_name_style
      test_case = Class.new(TestStack) do
        def test_push
        end
        description "Test for push", :test_push
      end

      test_push = test_case.new("test_push")
      assert_equal({"description" => "Test for push"},
                   test_push.attributes)
    end
  end
end
