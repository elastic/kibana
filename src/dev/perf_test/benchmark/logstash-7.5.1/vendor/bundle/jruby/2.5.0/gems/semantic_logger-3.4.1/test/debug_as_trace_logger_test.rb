require_relative 'test_helper'

# Unit Test for SemanticLogger::Logger
class DebugAsTraceLoggerTest < Minitest::Test
  describe SemanticLogger::Logger do
    # Test each filter
    [nil, /\ADebugAsTraceLoggerTest/, Proc.new { |l| (/\AExclude/ =~ l.message).nil? }].each do |filter|
      describe "filter: #{filter.class.name}" do
        before do
          # Use a mock logger that just keeps the last logged entry in an instance
          # variable
          SemanticLogger.default_level = :trace
          @mock_logger                 = MockLogger.new
          appender                     = SemanticLogger.add_appender(logger: @mock_logger)
          appender.filter              = filter

          # Use this test's class name as the application name in the log output
          @logger                      = SemanticLogger::DebugAsTraceLogger.new(DebugAsTraceLoggerTest)
          @hash                        = {session_id: 'HSSKLEU@JDK767', tracking_number: 12345}
          @hash_str                    = @hash.inspect.sub("{", "\\{").sub("}", "\\}")
          assert_equal [], @logger.tags
        end

        after do
          # Remove all appenders
          SemanticLogger.appenders.each { |appender| SemanticLogger.remove_appender(appender) }
        end

        describe '.level?' do
          it 'return true for debug? with :trace level' do
            SemanticLogger.default_level = :trace
            assert_equal :trace, @logger.level
            assert_equal true, @logger.debug?
            assert_equal true, @logger.trace?
          end

          it 'return false for debug? with global :debug level' do
            SemanticLogger.default_level = :debug
            assert_equal :debug, @logger.level, @logger.inspect
            assert_equal false, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end

          it 'return true for debug? with global :info level' do
            SemanticLogger.default_level = :info
            assert_equal :info, @logger.level, @logger.inspect
            assert_equal false, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end

          it 'return false for debug? with instance :debug level' do
            @logger.level = :debug
            assert_equal :debug, @logger.level, @logger.inspect
            assert_equal false, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end

          it 'return true for debug? with instance :info level' do
            @logger.level = :info
            assert_equal :info, @logger.level, @logger.inspect
            assert_equal false, @logger.debug?, @logger.inspect
            assert_equal false, @logger.trace?, @logger.inspect
          end
        end

        it 'not log trace when level is debug' do
          @logger.level = :debug
          @logger.trace('hello world', @hash) { 'Calculations' }
          SemanticLogger.flush
          assert_nil @mock_logger.message
        end

        it 'not log debug when level is debug' do
          @logger.level = :debug
          @logger.debug('hello world', @hash) { 'Calculations' }
          SemanticLogger.flush
          assert_nil @mock_logger.message
        end

        it 'map trace to debug' do
          @logger.level = :trace
          @logger.debug('hello world', @hash) { 'Calculations' }
          SemanticLogger.flush
          assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ T \[\d+:.+\] DebugAsTraceLoggerTest -- hello world -- Calculations -- #{@hash_str}/, @mock_logger.message)
        end

        it 'log trace as trace' do
          @logger.level = :trace
          @logger.trace('hello world', @hash) { 'Calculations' }
          SemanticLogger.flush
          assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ T \[\d+:.+\] DebugAsTraceLoggerTest -- hello world -- Calculations -- #{@hash_str}/, @mock_logger.message)
        end
      end
    end

  end
end
