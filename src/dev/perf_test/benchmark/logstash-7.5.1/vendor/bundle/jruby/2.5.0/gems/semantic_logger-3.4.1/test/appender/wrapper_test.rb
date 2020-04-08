require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::Wrapper
#
module Appender
  class WrapperTest < Minitest::Test
    describe SemanticLogger::Appender::Wrapper do
      before do
        @time        = Time.new
        @mock_logger = MockLogger.new
        @appender    = SemanticLogger::Appender::Wrapper.new(@mock_logger)
        @hash        = {session_id: 'HSSKLEU@JDK767', tracking_number: 12345}
        @hash_str    = @hash.inspect.sub("{", "\\{").sub("}", "\\}")
      end

      describe 'format logs into text form' do
        it 'handle nil name, message and payload' do
          log       = SemanticLogger::Log.new
          log.time  = Time.now
          log.level = :debug
          @appender.log(log)
          assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ D \[\d+:\] /, @mock_logger.message)
        end

        it 'handle nil message and payload' do
          log       = SemanticLogger::Log.new
          log.time  = Time.now
          log.level = :debug
          log.name  = 'class'
          @appender.log(log)
          assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ D \[\d+:\] class/, @mock_logger.message)
        end

        it 'handle nil payload' do
          log         = SemanticLogger::Log.new
          log.time    = Time.now
          log.level   = :debug
          log.name    = 'class'
          log.message = 'hello world'
          @appender.log(log)
          assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ D \[\d+:\] class -- hello world/, @mock_logger.message)
        end

        it 'handle payload' do
          log         = SemanticLogger::Log.new
          log.time    = Time.now
          log.level   = :debug
          log.name    = 'class'
          log.message = 'hello world'
          log.payload = @hash
          @appender.log(log)
          assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ D \[\d+:\] class -- hello world -- #{@hash_str}/, @mock_logger.message)
        end
      end

      describe 'for each log level' do
        # Ensure that any log level can be logged
        Logger::Severity.constants.each do |level|
          it "log #{level.downcase.to_sym} info" do
            @appender.log SemanticLogger::Log.new(level.downcase.to_sym, 'thread', 'class', 'hello world', @hash, Time.now)
            assert_match(/\d+-\d+-\d+ \d+:\d+:\d+.\d+ \w \[\d+:thread\] class -- hello world -- #{@hash_str}/, @mock_logger.message)
          end
        end
      end

    end
  end
end
