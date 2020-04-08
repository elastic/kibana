require_relative 'test_helper'
require 'yaml'

class SessionTest < Minitest::Test
  describe 'JMS::Session' do
    before do
      @config, @queue_name, @topic_name = read_config
    end

    it 'create a session' do
      JMS::Connection.session(@config) do |session|
        assert session
      end
    end

    it 'create automatic messages' do
      JMS::Connection.session(@config) do |session|
        assert session
        # Create Text Message
        assert_equal session.message("Hello").java_kind_of?(JMS::TextMessage), true

        # Create Map Message
        assert_equal session.message('hello' => 'world').java_kind_of?(JMS::MapMessage), true
      end
    end

    it 'create explicit messages' do
      JMS::Connection.session(@config) do |session|
        assert session
        # Create Text Message
        assert_equal session.create_text_message("Hello").java_kind_of?(JMS::TextMessage), true

        # Create Map Message
        assert_equal session.create_map_message.java_kind_of?(JMS::MapMessage), true
      end
    end

    it 'create temporary destinations in blocks' do
      JMS::Connection.session(@config) do |session|
        assert session

        # Temporary Queue
        session.destination(queue_name: :temporary) do |destination|
          assert_equal destination.java_kind_of?(JMS::TemporaryQueue), true
        end

        # Temporary Topic
        session.create_destination(topic_name: :temporary) do |destination|
          assert_equal destination.java_kind_of?(JMS::TemporaryTopic), true
        end
      end
    end

    it 'create temporary destinations' do
      JMS::Connection.session(@config) do |session|
        assert session

        # Temporary Queue
        destination = session.create_destination(queue_name: :temporary)
        assert_equal destination.java_kind_of?(JMS::TemporaryQueue), true
        destination.delete

        # Temporary Topic
        destination = session.create_destination(topic_name: :temporary)
        assert_equal destination.java_kind_of?(JMS::TemporaryTopic), true
        destination.delete
      end
    end

    it 'create destinations in blocks' do
      JMS::Connection.session(@config) do |session|
        assert session

        # Temporary Queue
        session.destination(queue_name: @queue_name) do |destination|
          assert_equal destination.java_kind_of?(JMS::Queue), true
        end

        # Temporary Topic
        session.create_destination(topic_name: @topic_name) do |destination|
          assert_equal destination.java_kind_of?(JMS::Topic), true
        end
      end
    end

    it 'create destinations' do
      JMS::Connection.session(@config) do |session|
        assert session

        # Queue
        queue = session.create_destination(queue_name: @queue_name)
        assert_equal queue.java_kind_of?(JMS::Queue), true

        # Topic
        topic = session.create_destination(topic_name: @topic_name)
        assert_equal topic.java_kind_of?(JMS::Topic), true
      end
    end

    it 'create destinations using direct methods' do
      JMS::Connection.session(@config) do |session|
        assert session

        # Queue
        queue = session.queue(@queue_name)
        assert_equal queue.java_kind_of?(JMS::Queue), true

        # Temporary Queue
        queue = session.temporary_queue
        assert_equal queue.java_kind_of?(JMS::TemporaryQueue), true
        queue.delete

        # Topic
        topic = session.topic(@topic_name)
        assert_equal topic.java_kind_of?(JMS::Topic), true

        # Temporary Topic
        topic = session.temporary_topic
        assert_equal topic.java_kind_of?(JMS::TemporaryTopic), true
        topic.delete
      end
    end

  end
end
