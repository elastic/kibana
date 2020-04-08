# -*- encoding: utf-8 -*-

# This is only used when puma is a git dep from Bundler, so it's a little
# weird.

d = File.read(File.expand_path("../lib/puma/const.rb", __FILE__))
if d =~ /VERSION = "(\d+\.\d+\.\d+)"/
  version = $1
else
  version = "0.0.1"
end

Gem::Specification.new do |s|
  s.name = "puma"
  s.version = version

  s.required_rubygems_version = Gem::Requirement.new(">= 0") if s.respond_to? :required_rubygems_version=
  s.authors = ["Evan Phoenix"]
  s.date = `git log --pretty="%ai" -n 1`.split(" ").first
  s.description = "Puma is a simple, fast, threaded, and highly concurrent HTTP 1.1 server for Ruby/Rack applications. Puma is intended for use in both development and production environments. In order to get the best throughput, it is highly recommended that you use a Ruby implementation with real threads like Rubinius or JRuby."
  s.email = ["evan@phx.io"]
  s.executables = ["puma", "pumactl"]
  s.extensions = ["ext/puma_http11/extconf.rb"]
  s.files = `git ls-files`.split($/)
  s.homepage = "http://puma.io"
  s.license = "BSD-3-Clause"
  s.rdoc_options = ["--main", "README.md"]
  s.require_paths = ["lib"]
  s.required_ruby_version = Gem::Requirement.new(">= 1.8.7")
  s.rubyforge_project = "puma"
  s.rubygems_version = "1.8.25"
  s.summary = "Puma is a simple, fast, threaded, and highly concurrent HTTP 1.1 server for Ruby/Rack applications"
  s.test_files = s.files.grep(/^test/)

  if s.respond_to? :specification_version then
    s.specification_version = 3

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rdoc>, ["~> 4.0"])
      s.add_development_dependency(%q<rake-compiler>, ["~> 0.8.0"])
      s.add_development_dependency(%q<hoe>, ["~> 3.6"])
    else
      s.add_dependency(%q<rdoc>, ["~> 4.0"])
      s.add_dependency(%q<rake-compiler>, ["~> 0.8.0"])
      s.add_dependency(%q<hoe>, ["~> 3.6"])
    end
  else
    s.add_dependency(%q<rdoc>, ["~> 4.0"])
    s.add_dependency(%q<rake-compiler>, ["~> 0.8.0"])
    s.add_dependency(%q<hoe>, ["~> 3.6"])
  end
end
