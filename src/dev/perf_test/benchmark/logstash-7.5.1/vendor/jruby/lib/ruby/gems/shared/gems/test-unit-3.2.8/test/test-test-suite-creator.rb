require "test/unit"

module Test
  module Unit
    class TestTestSuiteCreator < TestCase
      def collect_test_names(test_case)
        creator = TestSuiteCreator.new(test_case)
        creator.send(:collect_test_names)
      end

      class TestStandalone < self
        def setup
          @test_case = Class.new(TestCase) do
            def test_in_test_case
            end
          end
        end

        def test_collect_test_names
          assert_equal(["test_in_test_case"], collect_test_names(@test_case))
        end
      end

      class TestInherited < self
        def setup
          @parent_test_case = Class.new(TestCase) do
            def test_in_parent
            end
          end

          @child_test_case = Class.new(@parent_test_case) do
            def test_in_child
            end
          end
        end

        def test_collect_test_names
          assert_equal(["test_in_child"], collect_test_names(@child_test_case))
        end
      end

      class TestModule < self
        def setup
          test_module = Module.new do
            def test_in_module
            end
          end

          @test_case = Class.new(TestCase) do
            include test_module

            def test_in_test_case
            end
          end
        end

        def test_collect_test_names
          assert_equal(["test_in_module", "test_in_test_case"].sort,
                       collect_test_names(@test_case).sort)
        end
      end

      class TestInheritedModule < self
        def setup
          parent_test_module = Module.new do
            def test_in_module_in_parent
            end
          end

          child_test_module = Module.new do
            def test_in_module_in_child
            end
          end

          @parent_test_case = Class.new(TestCase) do
            include parent_test_module

            def test_in_parent
            end
          end

          @child_test_case = Class.new(@parent_test_case) do
            include child_test_module

            def test_in_child
            end
          end
        end

        def test_collect_test_names
          assert_equal(["test_in_child", "test_in_module_in_child"].sort,
                       collect_test_names(@child_test_case).sort)
        end
      end
    end
  end
end
