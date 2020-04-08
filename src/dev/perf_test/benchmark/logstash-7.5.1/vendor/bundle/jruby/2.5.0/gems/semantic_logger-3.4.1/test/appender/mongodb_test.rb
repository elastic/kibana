require_relative '../test_helper'

# Unit Test for SemanticLogger::Appender::MongoDB
#
module Appender
  class MongoDBTest < Minitest::Test
    describe SemanticLogger::Appender::MongoDB do
      before do
        @db                 = Mongo::Connection.new['test']
        @appender           = SemanticLogger::Appender::MongoDB.new(
          db:              @db,
          collection_size: 10*1024**2, # 10MB
          host:            'test',
          application:     'test_application',
          level:           :trace
        )
        @hash               = {tracking_number: 12345, session_id: 'HSSKLEU@JDK767'}
        Thread.current.name = 'thread'
      end

      after do
        @appender.purge_all if @appender
      end

      describe 'format logs into documents' do
        it 'handle no arguments' do
          @appender.debug
          document = @appender.collection.find_one
          assert_equal :debug, document['level']
          assert_equal nil, document['message']
          assert_equal 'thread', document['thread']
          assert document['time'].is_a?(Time)
          assert_equal nil, document['payload']
          assert_equal $$, document['pid']
          assert_equal 'test', document['host']
          assert_equal 'test_application', document['application']
        end

        it 'handle hash message' do
          @appender.debug(@hash)

          document = @appender.collection.find_one
          assert_equal :debug, document['level']
          assert_equal nil, document['message']
          assert_equal 'thread', document['thread']
          assert document['time'].is_a?(Time)
          assert_equal 12345, document['tracking_number']
          assert_equal 'HSSKLEU@JDK767', document['session_id']
          assert_equal $$, document['pid']
          assert_equal 'test', document['host']
          assert_equal 'test_application', document['application']
        end

        it 'handle message and payload' do
          @appender.debug('hello world', @hash)

          document = @appender.collection.find_one
          assert_equal :debug, document['level']
          assert_equal 'hello world', document['message']
          assert_equal 'thread', document['thread']
          assert document['time'].is_a?(Time)
          assert_equal 12345, document['tracking_number']
          assert_equal 'HSSKLEU@JDK767', document['session_id']
          assert_equal $$, document['pid']
          assert_equal 'test', document['host']
          assert_equal 'test_application', document['application']
        end

        it 'handle message without payload' do
          @appender.debug('hello world')

          document = @appender.collection.find_one
          assert_equal :debug, document['level']
          assert_equal 'hello world', document['message']
          assert_equal 'thread', document['thread']
          assert document['time'].is_a?(Time)
          assert_equal $$, document['pid']
          assert_equal 'test', document['host']
          assert_equal 'test_application', document['application']
        end
      end

      describe 'for each log level' do
        # Ensure that any log level can be logged
        SemanticLogger::LEVELS.each do |level|
          it 'log #{level} information' do
            @appender.send(level, 'hello world -- Calculations', @hash)
            document = @appender.collection.find_one
            assert_equal level, document['level']
            assert_equal 'hello world -- Calculations', document['message']
            assert_equal 'thread', document['thread']
            assert document['time'].is_a?(Time)
            assert_equal 12345, document['tracking_number']
            assert_equal 'HSSKLEU@JDK767', document['session_id']
            assert_equal $$, document['pid']
            assert_equal 'test', document['host'], document.ai
            assert_equal 'test_application', document['application']
          end
        end

      end

    end
  end
end
