if RUBY_VERSION > '2.3'
  load "jopenssl23/openssl/#{File.basename(__FILE__)}"
else
  raise LoadError, "no such file to load -- openssl/pkey"
end