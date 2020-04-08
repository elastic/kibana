if RUBY_VERSION > '2.1'
  raise LoadError, "no such library in #{RUBY_VERSION}: openssl/ssl-internal.rb"
else
  load "jopenssl19/openssl/#{File.basename(__FILE__)}"
end