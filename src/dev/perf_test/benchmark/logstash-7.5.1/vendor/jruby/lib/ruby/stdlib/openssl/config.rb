if RUBY_VERSION > '2.3'
  load "jopenssl23/openssl/#{File.basename(__FILE__)}"
elsif RUBY_VERSION > '2.2'
  load "jopenssl22/openssl/#{File.basename(__FILE__)}"
elsif RUBY_VERSION > '2.1'
  load "jopenssl21/openssl/#{File.basename(__FILE__)}"
else
  load "jopenssl19/openssl/#{File.basename(__FILE__)}"
end

# @note moved from JOpenSSL native bits.
module OpenSSL
  class Config
    DEFAULT_CONFIG_FILE = nil
  end
  class ConfigError < OpenSSLError; end
end
