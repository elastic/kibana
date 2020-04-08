require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::Tcp
module Appender
  class UdpTest < Minitest::Test
    response_mock = Struct.new(:code, :body)

    describe SemanticLogger::Appender::Udp do
      before do
        @appender = SemanticLogger::Appender::Udp.new(server: 'localhost:8088')
        @message = 'AppenderUdpTest log message'
      end

      SemanticLogger::LEVELS.each do |level|
        it "send #{level}" do
          data = nil
          @appender.socket.stub(:send, -> d, flags { data = d }) do
            @appender.send(level, @message)
          end
          hash = JSON.parse(data)
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
          data = nil
          @appender.socket.stub(:send, -> d, flags { data = d }) do
            @appender.send(level, 'Reading File', exc)
          end
          hash = JSON.parse(data)
          assert 'Reading File', hash['message']
          assert 'NameError', hash['exception']['name']
          assert 'undefined local variable or method', hash['exception']['message']
          assert_equal level.to_s, hash['level'], 'Should be error level (3)'
          assert hash['exception']['stack_trace'].first.include?(__FILE__), hash['exception']
        end

        it "send #{level} custom attributes" do
          data = nil
          @appender.socket.stub(:send, -> d, flags { data = d }) do
            @appender.send(level, @message, {key1: 1, key2: 'a'})
          end
          hash = JSON.parse(data)
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
