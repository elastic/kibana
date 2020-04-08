# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)

Gem::Specification.new do |gem|
  gem.name          = "snappy-jars"
  gem.version       = "1.1.0.1.2"
  gem.platform      = "java"
  gem.homepage      = "https://github.com/doxavore/snappy-jars"
  gem.authors       = ["Doug Mayer"]
  gem.email         = ["doxavore@gmail.com"]
  gem.summary       = "Google Snappy compression JNI wrapper JARs."
  gem.description   = %q{Google Snappy compression JNI wrapper JARs.}

  gem.files         = `git ls-files`.split("\n")
  gem.require_paths = ["lib"]
end
