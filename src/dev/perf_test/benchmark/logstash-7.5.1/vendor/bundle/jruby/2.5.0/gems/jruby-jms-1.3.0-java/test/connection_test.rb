require_relative 'test_helper'

class ConnectionTest < Minitest::Test
  describe JMS::Connection do
    before do
      @config, @queue_name, @topic_name = read_config
    end

    it 'Create Connection to the Broker/Server' do
      connection = JMS::Connection.new(@config)
      JMS.logger.info connection.to_s
      assert connection
      connection.close
    end

    it 'Create and start Connection to the Broker/Server with block' do
      JMS::Connection.start(@config) do |connection|
        assert connection
      end
    end

    it 'Create and start Connection to the Broker/Server with block and start one session' do
      JMS::Connection.session(@config) do |session|
        assert session
      end
    end

    it 'Start and stop connection' do
      connection = JMS::Connection.new(@config)
      assert connection
      assert_nil connection.start

      assert_nil connection.stop
      assert_nil connection.close
    end

    it 'Create a session from the connection' do
      connection = JMS::Connection.new(@config)
      session    = connection.create_session
      assert session
      assert_equal session.transacted?, false
      assert_nil session.close

      assert_nil connection.stop
      assert_nil connection.close
    end

    it 'Create a session with a block' do
      connection = JMS::Connection.new(@config)
      connection.session do |session|
        assert session
        assert_equal session.transacted?, false
      end

      assert_nil connection.stop
      assert_nil connection.close
    end

    it 'create a session without a block and throw exception' do
      connection = JMS::Connection.new(@config)

      assert_raises(ArgumentError) { connection.session }

      assert_nil connection.stop
      assert_nil connection.close
    end

    it 'Create a session from the connection with params' do
      connection = JMS::Connection.new(@config)
      session    = connection.create_session(transacted: true, options: JMS::Session::AUTO_ACKNOWLEDGE)
      assert session
      assert_equal session.transacted?, true
      # When session is transacted, options are ignore, so ack mode must be transacted
      assert_equal session.acknowledge_mode, JMS::Session::SESSION_TRANSACTED
      assert_nil session.close

      assert_nil connection.stop
      assert_nil connection.close
    end

    it 'Create a session from the connection with block and params' do
      JMS::Connection.start(@config) do |connection|
        connection.session(transacted: true, options: JMS::Session::CLIENT_ACKNOWLEDGE) do |session|
          assert session
          assert_equal session.transacted?, true
          # When session is transacted, options are ignore, so ack mode must be transacted
          assert_equal session.acknowledge_mode, JMS::Session::SESSION_TRANSACTED
        end
      end
    end

    it 'Create a session from the connection with block and params opposite test' do
      JMS::Connection.start(@config) do |connection|
        connection.session(transacted: false, options: JMS::Session::AUTO_ACKNOWLEDGE) do |session|
          assert session
          assert_equal session.transacted?, false
          assert_equal session.acknowledge_mode, JMS::Session::AUTO_ACKNOWLEDGE
        end
      end
    end

    describe 'additional capabilities' do
      it 'start an on_message handler' do
        JMS::Connection.start(@config) do |connection|
          value = nil
          connection.on_message(transacted: true, queue_name: :temporary) do |message|
            value = 'received'
          end
        end
      end
    end

  end
end
