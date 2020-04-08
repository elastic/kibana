require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::Bugsnag
module Appender
  class SentryTest < Minitest::Test
    describe SemanticLogger::Appender::Sentry do
      before do
        @appender = SemanticLogger::Appender::Sentry.new(:trace)
        @message  = 'AppenderRavenTest log message'
        SemanticLogger.backtrace_level = :error
      end

      SemanticLogger::LEVELS.each do |level|
        it "sends #{level} message" do
          error_message = hash = nil
          Raven.stub(:capture_message, -> msg, h { error_message = msg; hash = h }) do
            @appender.send(level, @message)
          end
          assert_equal @message, hash[:error_message]
          assert_equal 'SemanticLogger::Appender::Sentry', hash[:error_class]

          if [:error, :fatal].include?(level)
            assert hash.has_key?(:backtrace)
          else
            refute hash.has_key?(:backtrace)
          end
          assert_equal true, hash.has_key?(:extra)
          assert_equal level, hash[:extra][:level]
        end

        it "sends #{level} exceptions" do
          error     = RuntimeError.new('Oh no, Error.')
          exception = hash = nil
          Raven.stub(:capture_exception, -> exc, h { exception = exc; hash = h }) do
            @appender.send(level, @message, error)
          end

          assert_equal error.class.to_s, exception.class.to_s
          assert_equal error.message, exception.message
          assert_equal @message, hash[:message], hash
        end
      end

    end
  end
end
