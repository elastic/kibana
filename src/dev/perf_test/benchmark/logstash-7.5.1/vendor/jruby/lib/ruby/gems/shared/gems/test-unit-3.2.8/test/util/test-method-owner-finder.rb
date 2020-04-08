require 'test/unit'

require 'test/unit/util/method-owner-finder'

class TestUnitMethodOwnerFinder < Test::Unit::TestCase
  def test_find
    assert_equal(Exception, find(RuntimeError.new, :inspect))
    assert_equal(Exception, find(Exception.new, :inspect))

    anonymous_class = Class.new do
    end
    assert_equal(Kernel, find(anonymous_class.new, :inspect))

    anonymous_parent_class = Class.new do
      def inspect
        super + " by anonymous parent class"
      end
    end
    anonymous_sub_class = Class.new(anonymous_parent_class) do
    end
    assert_equal(anonymous_parent_class, find(anonymous_sub_class.new, :inspect))

    anonymous_module = Module.new do
      def inspect
        super + " by anonymous module"
      end
    end
    anonymous_include_class = Class.new do
      include anonymous_module
    end
    assert_equal(anonymous_module, find(anonymous_include_class.new, :inspect))
  end

  private
  def find(object, method_name)
    Test::Unit::Util::MethodOwnerFinder.find(object, method_name)
  end
end
