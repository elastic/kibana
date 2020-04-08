# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)
require "gelfd2/version"

Gem::Specification.new do |s|
  s.name        = "gelfd2"
  s.version     = Gelfd2::VERSION
  s.authors     = ["John E. Vincent", "ptQa"]
  s.homepage    = "https://github.com/ptqa/gelfd2"
  s.summary     = %q{Pure ruby gelf server and decoding library}
  s.description = %q{Standalone implementation of the Graylog Extended Log Format}

  s.rubyforge_project = "gelfd2"

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ["lib"]

  # specify any dependencies here; for example:
  s.add_development_dependency "json", "~> 1.8.3"
  s.add_development_dependency "rake", "~> 11.2.2"
  s.add_development_dependency "test-unit", "~> 3.2.1"
  # s.add_runtime_dependency "rest-client"
end
