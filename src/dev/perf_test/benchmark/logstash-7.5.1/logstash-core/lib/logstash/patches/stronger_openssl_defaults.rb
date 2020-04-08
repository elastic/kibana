# encoding: utf-8
require "openssl"

# :nodoc:
class OpenSSL::SSL::SSLContext
  # Wrap SSLContext.new to a stronger default settings.
  class << self
    alias_method :orig_new, :new
    def new(*args)
      c = orig_new(*args)

      # MRI nor JRuby seem to actually invoke `SSLContext#set_params` by
      # default, which makes the default ciphers (and other settings) not
      # actually defaults. Oops!
      # To force this, and force our (hopefully more secure) defaults on
      # all things using openssl in Ruby, we will invoke set_params
      # on all new SSLContext objects.
      c.set_params
      c
    end
  end

  # This cipher selection comes from https://wiki.mozilla.org/Security/Server_Side_TLS
  MOZILLA_INTERMEDIATE_CIPHERS = "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:AES:CAMELLIA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA"

  # Returns the value that should be used for the default SSLContext options
  #
  # This is a method instead of a constant because some constants (like
  # OpenSSL::SSL::OP_NO_COMPRESSION) may not be available in all Ruby
  # versions/platforms.
  def self.__default_options
    # ruby-core is refusing to patch ruby's default openssl settings to be more
    # secure, so let's fix that here. The next few lines setting options and
    # ciphers come from jmhodges' proposed patch
    ssloptions = OpenSSL::SSL::OP_ALL
 
    # TODO(sissel): JRuby doesn't have this. Maybe work on a fix?
    if defined?(OpenSSL::SSL::OP_DONT_INSERT_EMPTY_FRAGMENTS)
      ssloptions &= ~OpenSSL::SSL::OP_DONT_INSERT_EMPTY_FRAGMENTS
    end

    # TODO(sissel): JRuby doesn't have this. Maybe work on a fix?
    if defined?(OpenSSL::SSL::OP_NO_COMPRESSION)
      ssloptions |= OpenSSL::SSL::OP_NO_COMPRESSION
    end

    # Disable SSLv2 and SSLv3. They are insecure and highly discouraged.
    ssloptions |= OpenSSL::SSL::OP_NO_SSLv2 if defined?(OpenSSL::SSL::OP_NO_SSLv2)
    ssloptions |= OpenSSL::SSL::OP_NO_SSLv3 if defined?(OpenSSL::SSL::OP_NO_SSLv3)
    ssloptions
  end

  # Overwriting the DEFAULT_PARAMS const idea from here: https://www.ruby-lang.org/en/news/2014/10/27/changing-default-settings-of-ext-openssl/
  #
  # This monkeypatch doesn't enforce a `VERIFY_MODE` on the SSLContext,
  # SSLContext are both used for the client and the server implementation,
  # If set the `verify_mode` to peer the server won't accept any connection,
  # because it will try to verify the client certificate, this is a protocol
  # details implemented at the plugin level.
  #
  # For more details see: https://github.com/elastic/logstash/issues/3657
  remove_const(:DEFAULT_PARAMS) if const_defined?(:DEFAULT_PARAMS)
  DEFAULT_PARAMS = {
    :ssl_version => "TLS",
    :ciphers => MOZILLA_INTERMEDIATE_CIPHERS,
    :options => __default_options # Not a constant because it's computed at start-time.
  }
end
