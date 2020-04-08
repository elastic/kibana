require 'test_helper'

require 'metriks/reporter/proc_title'

class ProcTitleReporterTest < Test::Unit::TestCase
  def setup
    @reporter = Metriks::Reporter::ProcTitle.new
    @original_proctitle = $0.dup
  end

  def teardown
    @reporter.stop
    $0 = @original_proctitle
  end

  def test_generate_title
    @reporter.add 'test', '/sec' do
      50.333
    end

    title = @reporter.send(:generate_title)

    assert_equal 'test: 50.3/sec', title
  end
end