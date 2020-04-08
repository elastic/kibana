require_relative 'test_helper'
require 'timeout'

class SessionPoolTest < Minitest::Test
  describe JMS::SessionPool do
    before do
      @config, @queue_name, @topic_name = read_config
      @pool_params                      = {
        pool_size:         10,
        pool_warn_timeout: 5.0
      }
    end

    it 'create a session pool' do
      JMS::Connection.start(@config) do |connection|
        pool = connection.create_session_pool(@pool_params)
        pool.session do |session|
          assert session
          assert session.is_a?(javax.jms.Session)
        end
        pool.close
      end
    end

    it 'remove bad session from pool' do
      JMS::Connection.start(@config) do |connection|
        pool = connection.create_session_pool(@pool_params.merge(pool_size: 1))
        s    = nil
        r    =
          begin
            pool.session do |session|
              assert session
              assert session.is_a?(javax.jms.Session)
              s = session
              s.close
              s.create_map_message
              false
            end
          rescue javax.jms.IllegalStateException
            true
          end
        assert r == true

        # Now verify that the previous closed session was removed from the pool
        pool.session do |session|
          assert session
          assert session.is_a?(javax.jms.Session)
          assert s != session
          session.create_map_message
        end
      end
    end

    it 'allow multiple sessions to be used concurrently' do
      JMS::Connection.start(@config) do |connection|
        pool = connection.create_session_pool(@pool_params)
        pool.session do |session|
          assert session
          assert session.is_a?(javax.jms.Session)
          pool.session do |session2|
            assert session2
            assert session2.is_a?(javax.jms.Session)
            assert session != session2
          end
        end
      end
    end

  end
end
