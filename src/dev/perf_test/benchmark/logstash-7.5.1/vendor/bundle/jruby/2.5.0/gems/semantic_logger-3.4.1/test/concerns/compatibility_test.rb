require_relative '../test_helper'

# Unit Test for SemanticLogger::Logger
class CompatibilityTest < Minitest::Test
  describe SemanticLogger::Logger do
    before do
      # Use a mock logger that just keeps the last logged entry in an instance
      # variable
      SemanticLogger.default_level   = :trace
      SemanticLogger.backtrace_level = nil
      @mock_logger                   = MockLogger.new
      @appender                      = SemanticLogger.add_appender(logger: @mock_logger)

      # Use this test's class name as the application name in the log output
      @logger                        = SemanticLogger[CompatibilityTest]
      @thread_name                   = Thread.current.name
    end

    after do
      SemanticLogger.remove_appender(@appender)
    end

    it '#add' do
      @logger.add(Logger::INFO, 'hello world', 'progname') { 'Data' }
      SemanticLogger.flush
      assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] CompatibilityTest -- hello world -- Data -- \"progname\"/, @mock_logger.message)
    end

    it '#log' do
      @logger.log(Logger::FATAL, 'hello world', 'progname') { 'Data' }
      SemanticLogger.flush
      assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ F \[\d+:#{@thread_name}\] CompatibilityTest -- hello world -- Data -- \"progname\"/, @mock_logger.message)
    end

    it '#unknown' do
      @logger.unknown('hello world') { 'Data' }
      SemanticLogger.flush
      assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ E \[\d+:#{@thread_name}\] CompatibilityTest -- hello world -- Data/, @mock_logger.message)
    end

    it '#unknown? as error?' do
      SemanticLogger.default_level = :error
      assert @logger.unknown?
    end

    it '#unknown? as error? when false' do
      SemanticLogger.default_level = :fatal
      refute @logger.unknown?
    end

    it '#silence_logger' do
      @logger.silence_logger do
        @logger.info 'hello world'
      end
      SemanticLogger.flush
      refute @mock_logger.message
    end

    it '#<< as info' do
      @logger << 'hello world'
      SemanticLogger.flush
      assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] CompatibilityTest -- hello world/, @mock_logger.message)
    end

    it '#progname= as #name=' do
      assert_equal 'CompatibilityTest', @logger.name
      @logger.progname = 'NewTest'
      assert_equal 'NewTest', @logger.name
    end

    it '#progname as #name' do
      assert_equal 'CompatibilityTest', @logger.name
      assert_equal 'CompatibilityTest', @logger.progname
    end

    it '#sev_threshold= as #level=' do
      assert_equal :trace, @logger.level
      @logger.sev_threshold = Logger::DEBUG
      assert_equal :debug, @logger.level
    end

    it '#sev_threshold as #level' do
      assert_equal :trace, @logger.level
      assert_equal :trace, @logger.sev_threshold
    end

    it '#formatter NOOP' do
      assert_equal nil, @logger.formatter
      @logger.formatter = 'blah'
      assert_equal 'blah', @logger.formatter
    end

    it '#datetime_format NOOP' do
      assert_equal nil, @logger.datetime_format
      @logger.datetime_format = 'blah'
      assert_equal 'blah', @logger.datetime_format
    end

    it '#close NOOP' do
      @logger.close
      @logger.info('hello world') { 'Data' }
      SemanticLogger.flush
      assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] CompatibilityTest -- hello world -- Data/, @mock_logger.message)
    end

    it '#reopen NOOP' do
      @logger.reopen
      @logger.info('hello world') { 'Data' }
      SemanticLogger.flush
      assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ I \[\d+:#{@thread_name}\] CompatibilityTest -- hello world -- Data/, @mock_logger.message)
    end

  end
end
