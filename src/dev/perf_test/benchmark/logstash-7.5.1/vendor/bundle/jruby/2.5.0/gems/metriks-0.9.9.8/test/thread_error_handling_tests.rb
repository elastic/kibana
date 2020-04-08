module ThreadErrorHandlingTests
  def test_passes_errors_in_thread_loop_to_on_error_handler
    rescued_error = nil
    error_handler_called = false
    reporter = build_reporter(:interval => 0.0001, :on_error => lambda { |e|
      error_handler_called = true
      rescued_error = e
    })

    reporter.stubs(:write).raises(StandardError, "boom")

    reporter.start
    sleep 0.02
    assert_equal true, error_handler_called
    assert_equal "boom", rescued_error.message
  ensure
    reporter.stop
  end
end

