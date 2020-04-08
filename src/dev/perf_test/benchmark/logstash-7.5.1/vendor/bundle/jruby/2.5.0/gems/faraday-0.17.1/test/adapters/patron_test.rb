require File.expand_path('../integration', __FILE__)

module Adapters
  class Patron < Faraday::TestCase

    def adapter() :patron end

    unless jruby?
      Integration.apply(self, :NonParallel) do
        # https://github.com/toland/patron/issues/34
        undef :test_PATCH_send_url_encoded_params

        # https://github.com/toland/patron/issues/52
        undef :test_GET_with_body

        # no support for SSL peer verification
        undef :test_GET_ssl_fails_with_bad_cert if ssl_mode?
      end

      def test_custom_adapter_config
        conn = create_connection do |session|
          assert_kind_of ::Patron::Session, session
          session.max_redirects = 10
          throw :config_block_called
        end

        assert_throws(:config_block_called) do
          conn.get 'http://8.8.8.8:88'
        end
      end

      def test_connection_timeout
        conn = create_connection(:request => {:timeout => 10, :open_timeout => 1})
        assert_raises Faraday::ConnectionFailed do
          conn.get 'http://8.8.8.8:88'
        end
      end
    end
  end
end
