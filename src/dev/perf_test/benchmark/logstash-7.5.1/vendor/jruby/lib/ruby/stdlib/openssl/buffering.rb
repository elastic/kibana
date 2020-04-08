if RUBY_VERSION > '2.3'
  load "jopenssl23/openssl/#{File.basename(__FILE__)}"
elsif RUBY_VERSION > '2.2'
  load "jopenssl22/openssl/#{File.basename(__FILE__)}"
elsif RUBY_VERSION > '2.1'
  load "jopenssl21/openssl/#{File.basename(__FILE__)}"
else
  load "jopenssl19/openssl/#{File.basename(__FILE__)}"
end