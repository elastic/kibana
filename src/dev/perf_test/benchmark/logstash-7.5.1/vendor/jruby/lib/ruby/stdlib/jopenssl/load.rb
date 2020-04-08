warn 'Loading jruby-openssl gem in a non-JRuby interpreter' unless defined? JRUBY_VERSION

require 'jopenssl/version'

warn "JRuby #{JRUBY_VERSION} is not supported by jruby-openssl #{JOpenSSL::VERSION}" if JRUBY_VERSION < '1.7.20'

# NOTE: assuming user does pull in BC .jars from somewhere else on the CP
unless ENV_JAVA['jruby.openssl.load.jars'].eql?('false')
  version = JOpenSSL::BOUNCY_CASTLE_VERSION
  bc_jars = nil
  begin
    require 'jar-dependencies'
    # if we have jar-dependencies we let it track the jars
    require_jar( 'org.bouncycastle', 'bcprov-jdk15on', version )
    require_jar( 'org.bouncycastle', 'bcpkix-jdk15on', version )
    require_jar( 'org.bouncycastle', 'bctls-jdk15on',  version )
    bc_jars = true
  rescue LoadError
    bc_jars = false
  end
  unless bc_jars
    load "org/bouncycastle/bcprov-jdk15on/#{version}/bcprov-jdk15on-#{version}.jar"
    load "org/bouncycastle/bcpkix-jdk15on/#{version}/bcpkix-jdk15on-#{version}.jar"
    load "org/bouncycastle/bctls-jdk15on/#{version}/bctls-jdk15on-#{version}.jar"
  end
end

require 'jopenssl.jar'

if JRuby::Util.respond_to?(:load_ext) # JRuby 9.2
  JRuby::Util.load_ext('org.jruby.ext.openssl.OpenSSL')
else; require 'jruby'
  org.jruby.ext.openssl.OpenSSL.load(JRuby.runtime)
end

if RUBY_VERSION > '2.3'
  load 'jopenssl23/openssl.rb'
  load 'jopenssl/_compat23.rb'
elsif RUBY_VERSION > '2.2'
  load 'jopenssl22/openssl.rb'
elsif RUBY_VERSION > '2.1'
  load 'jopenssl21/openssl.rb'
else
  load 'jopenssl19/openssl.rb'
end

module OpenSSL
  autoload :Config, 'openssl/config' unless const_defined?(:Config, false)
  autoload :PKCS12, 'openssl/pkcs12'
end
