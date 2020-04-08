require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::Http
module Appender
  class HttpTest < Minitest::Test
    response_mock = Struct.new(:code, :body)

    describe SemanticLogger::Appender::Http do
      before do
        Net::HTTP.stub_any_instance(:start, true) do
          @appender = SemanticLogger::Appender::Http.new(url: 'http://localhost:8088/path')
        end
        @message = 'AppenderHttpTest log message'
      end

      SemanticLogger::LEVELS.each do |level|
        it "send #{level}" do
          request = nil
          @appender.http.stub(:request, -> r { request = r; response_mock.new('200', 'ok') }) do
            @appender.send(level, @message)
          end
          hash = JSON.parse(request.body)
          assert_equal @message, hash['message']
          assert_equal level.to_s, hash['level']
          refute hash['stack_trace']
        end

        it "send #{level} exceptions" do
          exc = nil
          begin
            Uh oh
          rescue Exception => e
            exc = e
          end
          request = nil
          @appender.http.stub(:request, -> r { request = r; response_mock.new('200', 'ok') }) do
            @appender.send(level, 'Reading File', exc)
          end
          hash = JSON.parse(request.body)
          assert 'Reading File', hash['message']
          assert 'NameError', hash['exception']['name']
          assert 'undefined local variable or method', hash['exception']['message']
          assert_equal level.to_s, hash['level'], 'Should be error level (3)'
          assert hash['exception']['stack_trace'].first.include?(__FILE__), hash['exception']
        end

        it "send #{level} custom attributes" do
          request = nil
          @appender.http.stub(:request, -> r { request = r; response_mock.new('200', 'ok') }) do
            @appender.send(level, @message, {key1: 1, key2: 'a'})
          end
          hash = JSON.parse(request.body)
          assert_equal @message, hash['message']
          assert_equal level.to_s, hash['level']
          refute hash['stack_trace']
          assert_equal 1, hash['key1'], hash
          assert_equal 'a', hash['key2'], hash
        end

      end
    end
  end
end
