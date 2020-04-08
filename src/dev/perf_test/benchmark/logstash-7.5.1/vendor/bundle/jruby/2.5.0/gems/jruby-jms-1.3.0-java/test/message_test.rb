require_relative 'test_helper'

class MessageTest < Minitest::Test
  describe 'JMS::Message' do
    before do
      @config, @queue_name, @topic_name = read_config
    end

    it 'produce and consume messages to/from a temporary queue' do
      JMS::Connection.session(@config) do |session|
        assert session
        data = nil
        session.producer(queue_name: :temporary) do |producer|
          # Send Message
          producer.send(session.message('Hello World'))

          # Consume Message
          session.consume(destination: producer.destination, timeout: 1000) do |message|
            assert_equal message.java_kind_of?(JMS::TextMessage), true
            data = message.data
          end
        end
        assert_equal data, 'Hello World'
      end
    end

    it 'produce, browse and consume messages to/from a queue' do
      JMS::Connection.session(@config) do |session|
        assert session
        data        = :timed_out
        browse_data = :timed_out
        session.producer(queue_name: @queue_name) do |producer|
          # Send Message
          producer.send(session.message('Hello World'))

          # Browse Message
          session.browse(queue_name: @queue_name, timeout: 1000) do |message|
            assert_equal message.java_kind_of?(JMS::TextMessage), true
            browse_data = message.data
          end

          # Consume Message
          session.consume(queue_name: @queue_name, timeout: 1000) do |message|
            assert_equal message.java_kind_of?(JMS::TextMessage), true
            data = message.data
          end
        end
        assert_equal 'Hello World', data
        assert_equal 'Hello World', browse_data
      end
    end

    it 'support setting persistence using symbols and the java constants' do
      JMS::Connection.session(@config) do |session|
        message                       = session.message('Hello World')
        message.jms_delivery_mode_sym = :non_persistent
        assert_equal message.jms_delivery_mode_sym, :non_persistent
        message.jms_delivery_mode_sym = :persistent
        assert_equal message.jms_delivery_mode_sym, :persistent
      end
    end

    it 'produce and consume non-persistent messages' do
      JMS::Connection.session(@config) do |session|
        assert session
        data = nil
        session.producer(queue_name: :temporary) do |producer|
          message                       = session.message('Hello World')
          message.jms_delivery_mode_sym = :non_persistent
          assert_equal :non_persistent, message.jms_delivery_mode_sym
          assert_equal false, message.persistent?

          # Send Message
          producer.send(message)

          # Consume Message
          session.consume(destination: producer.destination, timeout: 1000) do |message|
            assert_equal message.java_kind_of?(JMS::TextMessage), true
            data = message.data
            #assert_equal :non_persistent, message.jms_delivery_mode
            #assert_equal false, message.persistent?
          end
        end
        assert_equal data, 'Hello World'
      end
    end

    it 'produce and consume persistent messages' do
      JMS::Connection.session(@config) do |session|
        assert session
        data = nil
        session.producer(queue_name: @queue_name) do |producer|
          message                       = session.message('Hello World')
          message.jms_delivery_mode_sym = :persistent
          assert_equal :persistent, message.jms_delivery_mode_sym
          assert_equal true, message.persistent?

          # Send Message
          producer.send(message)

          # Consume Message
          session.consume(destination: producer.destination, timeout: 1000) do |message|
            assert_equal message.java_kind_of?(JMS::TextMessage), true
            data = message.data
            assert_equal :persistent, message.jms_delivery_mode_sym
            assert_equal true, message.persistent?
          end
        end
        assert_equal data, 'Hello World'
      end
    end

  end
end
