# So that the NewRelic appender will load the mock
$LOAD_PATH.unshift File.dirname(__FILE__)
require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::NewRelic
module Appender
  class NewRelicTest < Minitest::Test
    describe SemanticLogger::Appender::NewRelic do

      before do
        @appender = SemanticLogger::Appender::NewRelic.new(:error)
        @message  = 'AppenderNewRelicTest log message'
      end

      (SemanticLogger::LEVELS - [:error, :fatal]).each do |level|
        it "does not send :#{level.to_s} notifications to New Relic" do
          exception = hash = nil
          NewRelic::Agent.stub(:notice_error, -> exc, h { exception = exc; hash = h }) do
            @appender.tagged('test') do
              @appender.send(level, "AppenderNewRelicTest #{level.to_s} message")
            end
          end
          assert_nil exception
          assert_nil hash
        end
      end

      [:error, :fatal].each do |level|
        it "sends :#{level.to_s} notifications to New Relic" do
          exception = hash = nil
          NewRelic::Agent.stub(:notice_error, -> exc, h { exception = exc; hash = h }) do
            @appender.tagged('test') do
              @appender.send(level, @message)
            end
          end
          assert_equal 'RuntimeError', exception.class.to_s
          assert_equal @message, exception.message
          assert_equal ['test'], hash[:custom_params][:tags]
          assert_nil hash[:custom_params][:duration]
          assert hash[:custom_params][:thread], hash.inspect
        end
      end

      it 'send notification to New Relic with custom attributes' do
        exception = hash = nil
        NewRelic::Agent.stub(:notice_error, -> exc, h { exception = exc; hash = h }) do
          @appender.tagged('test') do
            @appender.with_payload({key1: 1, key2: 'a'}) do
              @appender.measure(:error, @message) do
                sleep 0.001
              end
            end
          end
        end
        assert_equal 'RuntimeError', exception.class.to_s
        assert_equal @message, exception.message
        assert_equal ['test'], hash[:custom_params][:tags], hash
        assert_equal 1, hash[:custom_params][:key1], hash
        assert_equal 'a', hash[:custom_params][:key2], hash
        assert hash[:custom_params][:duration], hash
        assert hash[:custom_params][:thread], hash
      end
    end
  end
end
