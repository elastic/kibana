require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::Splunk
#
module Appender
  class SplunkTest < Minitest::Test

    class Mock
      attr_accessor :message, :event

      def submit(message, event)
        self.message = message
        self.event   = event
      end
    end

    describe SemanticLogger::Appender::Splunk do
      before do
        SemanticLogger::Appender::Splunk.stub_any_instance(:reopen, nil) do
          @appender = SemanticLogger::Appender::Splunk.new
        end
        @message = 'AppenderSplunkTest log message'
      end

      SemanticLogger::LEVELS.each do |level|
        it "send #{level}" do
          mock = Mock.new
          @appender.stub(:service_index, mock) do
            @appender.send(level, @message)
          end
          assert_equal @message, mock.message
          assert_equal level, mock.event[:event][:level]
          refute mock.event[:event][:exception]
        end

        it "sends #{level} exceptions" do
          exc = nil
          begin
            Uh oh
          rescue Exception => e
            exc = e
          end

          mock = Mock.new
          @appender.stub(:service_index, mock) do
            @appender.send(level, @message, exc)
          end
          assert_equal @message, mock.message

          assert exception = mock.event[:event][:exception]
          assert 'NameError', exception[:name]
          assert 'undefined local variable or method', exception[:message]
          assert_equal level, mock.event[:event][:level]
          assert exception[:stack_trace].first.include?(__FILE__), exception
        end

        it "sends #{level} custom attributes" do
          mock = Mock.new
          @appender.stub(:service_index, mock) do
            @appender.send(level, @message, {key1: 1, key2: 'a'})
          end
          assert_equal @message, mock.message

          assert mock.event[:event], mock.event.ai
          assert_equal level, mock.event[:event][:level]
          refute mock.event[:event][:stack_trace]
          assert_equal(1, mock.event[:event][:key1], mock.event)
          assert_equal('a', mock.event[:event][:key2], mock.event)
        end
      end

      it 'does not send :trace notifications to Splunk when set to :error' do
        mock            = Mock.new
        @appender.level = :error
        @appender.stub(:service_index, mock) do
          @appender.trace('AppenderSplunkTest trace message')
        end
        assert_nil mock.event
        assert_nil mock.message
      end
    end

  end
end
