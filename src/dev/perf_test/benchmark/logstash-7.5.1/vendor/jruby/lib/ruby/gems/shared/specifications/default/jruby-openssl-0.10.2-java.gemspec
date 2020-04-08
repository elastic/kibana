# -*- encoding: utf-8 -*-
# stub: jruby-openssl 0.10.2 java lib

Gem::Specification.new do |s|
  s.name = "jruby-openssl".freeze
  s.version = "0.10.2"
  s.platform = "java".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 2.4.8".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Karol Bucek".freeze, "Ola Bini".freeze, "JRuby contributors".freeze]
  s.date = "2019-03-01"
  s.description = "JRuby-OpenSSL is an add-on gem for JRuby that emulates the Ruby OpenSSL native library.".freeze
  s.email = "self+jruby-openssl@kares.org".freeze
  s.files = ["History.md".freeze, "LICENSE.txt".freeze, "Mavenfile".freeze, "README.md".freeze, "Rakefile".freeze, "lib/jopenssl.jar".freeze, "lib/jopenssl/_compat23.rb".freeze, "lib/jopenssl/load.rb".freeze, "lib/jopenssl/version.rb".freeze, "lib/jopenssl19/openssl.rb".freeze, "lib/jopenssl19/openssl/bn.rb".freeze, "lib/jopenssl19/openssl/buffering.rb".freeze, "lib/jopenssl19/openssl/cipher.rb".freeze, "lib/jopenssl19/openssl/config.rb".freeze, "lib/jopenssl19/openssl/digest.rb".freeze, "lib/jopenssl19/openssl/ssl-internal.rb".freeze, "lib/jopenssl19/openssl/ssl.rb".freeze, "lib/jopenssl19/openssl/x509-internal.rb".freeze, "lib/jopenssl19/openssl/x509.rb".freeze, "lib/jopenssl21/openssl.rb".freeze, "lib/jopenssl21/openssl/bn.rb".freeze, "lib/jopenssl21/openssl/buffering.rb".freeze, "lib/jopenssl21/openssl/cipher.rb".freeze, "lib/jopenssl21/openssl/config.rb".freeze, "lib/jopenssl21/openssl/digest.rb".freeze, "lib/jopenssl21/openssl/ssl.rb".freeze, "lib/jopenssl21/openssl/x509.rb".freeze, "lib/jopenssl22/openssl.rb".freeze, "lib/jopenssl22/openssl/bn.rb".freeze, "lib/jopenssl22/openssl/buffering.rb".freeze, "lib/jopenssl22/openssl/cipher.rb".freeze, "lib/jopenssl22/openssl/config.rb".freeze, "lib/jopenssl22/openssl/digest.rb".freeze, "lib/jopenssl22/openssl/ssl.rb".freeze, "lib/jopenssl22/openssl/x509.rb".freeze, "lib/jopenssl23/openssl.rb".freeze, "lib/jopenssl23/openssl/bn.rb".freeze, "lib/jopenssl23/openssl/buffering.rb".freeze, "lib/jopenssl23/openssl/cipher.rb".freeze, "lib/jopenssl23/openssl/config.rb".freeze, "lib/jopenssl23/openssl/digest.rb".freeze, "lib/jopenssl23/openssl/pkey.rb".freeze, "lib/jopenssl23/openssl/ssl.rb".freeze, "lib/jopenssl23/openssl/x509.rb".freeze, "lib/jruby-openssl.rb".freeze, "lib/openssl.rb".freeze, "lib/openssl/bn.rb".freeze, "lib/openssl/buffering.rb".freeze, "lib/openssl/cipher.rb".freeze, "lib/openssl/config.rb".freeze, "lib/openssl/digest.rb".freeze, "lib/openssl/pkcs12.rb".freeze, "lib/openssl/pkcs5.rb".freeze, "lib/openssl/pkey.rb".freeze, "lib/openssl/ssl-internal.rb".freeze, "lib/openssl/ssl.rb".freeze, "lib/openssl/x509-internal.rb".freeze, "lib/openssl/x509.rb".freeze, "lib/org/bouncycastle/bcpkix-jdk15on/1.61/bcpkix-jdk15on-1.61.jar".freeze, "lib/org/bouncycastle/bcprov-jdk15on/1.61/bcprov-jdk15on-1.61.jar".freeze, "lib/org/bouncycastle/bctls-jdk15on/1.61/bctls-jdk15on-1.61.jar".freeze, "pom.xml".freeze]
  s.homepage = "https://github.com/jruby/jruby-openssl".freeze
  s.licenses = ["EPL-1.0".freeze, "GPL-2.0".freeze, "LGPL-2.1".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.9.3".freeze)
  s.requirements = ["jar org.bouncycastle:bcprov-jdk15on, 1.61".freeze, "jar org.bouncycastle:bcpkix-jdk15on, 1.61".freeze, "jar org.bouncycastle:bctls-jdk15on,  1.61".freeze]
  s.rubygems_version = "2.6.14.1".freeze
  s.summary = "JRuby OpenSSL".freeze

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<jar-dependencies>.freeze, ["~> 0.1"])
      s.add_development_dependency(%q<mocha>.freeze, ["~> 1.1.0"])
      s.add_development_dependency(%q<ruby-maven>.freeze, ["~> 3.0"])
    else
      s.add_dependency(%q<jar-dependencies>.freeze, ["~> 0.1"])
      s.add_dependency(%q<mocha>.freeze, ["~> 1.1.0"])
      s.add_dependency(%q<ruby-maven>.freeze, ["~> 3.0"])
    end
  else
    s.add_dependency(%q<jar-dependencies>.freeze, ["~> 0.1"])
    s.add_dependency(%q<mocha>.freeze, ["~> 1.1.0"])
    s.add_dependency(%q<ruby-maven>.freeze, ["~> 3.0"])
  end
end
