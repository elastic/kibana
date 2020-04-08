require 'test/unit/ui/testrunnermediator'

class TestUnitUIMediator < Test::Unit::TestCase
  def test_run_suite_with_interrupt_exception
    test_case = Class.new(Test::Unit::TestCase) do
      def test_raise_interrupt
        raise Interrupt, "from test"
      end
    end
    mediator = Test::Unit::UI::TestRunnerMediator.new(test_case.suite)
    finished = false
    mediator.add_listener(Test::Unit::UI::TestRunnerMediator::FINISHED) do
      finished = true
    end
    assert_raise(Interrupt) do
      mediator.run
    end
    assert(finished)
  end
end
