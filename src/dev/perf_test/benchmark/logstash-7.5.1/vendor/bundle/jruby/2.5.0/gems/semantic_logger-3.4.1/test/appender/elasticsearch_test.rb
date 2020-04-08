require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::Elasticsearch
module Appender
  class ElasticsearchTest < Minitest::Test
    response_mock = Struct.new(:code, :body)

    describe SemanticLogger::Appender::Elasticsearch do
      before do
        Net::HTTP.stub_any_instance(:start, true) do
          @appender = SemanticLogger::Appender::Elasticsearch.new(
            url: 'http://localhost:9200'
          )
        end
        @message = 'AppenderElasticsearchTest log message'
      end

      it 'logs to daily indexes' do
        index = nil
        @appender.stub(:post, -> json, ind { index = ind }) do
          @appender.info @message
        end
        assert_equal "semantic_logger-#{Time.now.utc.strftime('%Y.%m.%d')}/log", index
      end

      SemanticLogger::LEVELS.each do |level|
        it "send #{level}" do
          request = nil
          @appender.http.stub(:request, -> r { request = r; response_mock.new('200', 'ok') }) do
            @appender.send(level, @message)
          end
          message = JSON.parse(request.body)
          assert_equal @message, message['message']
          assert_equal level.to_s, message['level']
          refute message['exception']
        end

        it "sends #{level} exceptions" do
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
          assert exception = hash['exception']
          assert 'NameError', exception['name']
          assert 'undefined local variable or method', exception['message']
          assert_equal level.to_s, hash['level']
          assert exception['stack_trace'].first.include?(__FILE__), exception
        end

        it "sends #{level} custom attributes" do
          request = nil
          @appender.http.stub(:request, -> r { request = r; response_mock.new('200', 'ok') }) do
            @appender.send(level, @message, {key1: 1, key2: 'a'})
          end
          message = JSON.parse(request.body)
          assert_equal @message, message['message']
          assert_equal level.to_s, message['level']
          refute message['stack_trace']
          assert_equal(1, message['key1'], message)
          assert_equal('a', message['key2'], message)
        end
      end

    end
  end
end
