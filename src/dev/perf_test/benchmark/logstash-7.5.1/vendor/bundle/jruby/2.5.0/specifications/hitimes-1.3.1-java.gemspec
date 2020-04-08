# -*- encoding: utf-8 -*-
# stub: hitimes 1.3.1 java lib

Gem::Specification.new do |s|
  s.name = "hitimes".freeze
  s.version = "1.3.1"
  s.platform = "java".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Jeremy Hinegardner".freeze]
  s.date = "2019-01-18"
  s.description = "A fast, high resolution timer library for recording peformance metrics. * (http://github.com/copiousfreetime/hitimes) * (http://github.com.org/copiousfreetime/hitimes) * email jeremy at copiousfreetime dot org * `git clone url git://github.com/copiousfreetime/hitimes.git`".freeze
  s.email = "jeremy@copiousfreetime.org".freeze
  s.extra_rdoc_files = ["CONTRIBUTING.md".freeze, "HISTORY.md".freeze, "Manifest.txt".freeze, "README.md".freeze]
  s.files = ["CONTRIBUTING.md".freeze, "HISTORY.md".freeze, "Manifest.txt".freeze, "README.md".freeze]
  s.homepage = "http://github.com/copiousfreetime/hitimes".freeze
  s.licenses = ["ISC".freeze]
  s.rdoc_options = ["--main".freeze, "README.md".freeze, "--markup".freeze, "tomdoc".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.2.2".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "A fast, high resolution timer library for recording peformance metrics.".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rake>.freeze, ["~> 12.0"])
      s.add_development_dependency(%q<minitest>.freeze, ["~> 5.5"])
      s.add_development_dependency(%q<rdoc>.freeze, ["~> 5.0"])
      s.add_development_dependency(%q<json>.freeze, ["~> 2.0"])
      s.add_development_dependency(%q<rake-compiler>.freeze, ["~> 1.0"])
      s.add_development_dependency(%q<rake-compiler-dock>.freeze, ["~> 0.6"])
      s.add_development_dependency(%q<simplecov>.freeze, ["~> 0.14"])
    else
      s.add_dependency(%q<rake>.freeze, ["~> 12.0"])
      s.add_dependency(%q<minitest>.freeze, ["~> 5.5"])
      s.add_dependency(%q<rdoc>.freeze, ["~> 5.0"])
      s.add_dependency(%q<json>.freeze, ["~> 2.0"])
      s.add_dependency(%q<rake-compiler>.freeze, ["~> 1.0"])
      s.add_dependency(%q<rake-compiler-dock>.freeze, ["~> 0.6"])
      s.add_dependency(%q<simplecov>.freeze, ["~> 0.14"])
    end
  else
    s.add_dependency(%q<rake>.freeze, ["~> 12.0"])
    s.add_dependency(%q<minitest>.freeze, ["~> 5.5"])
    s.add_dependency(%q<rdoc>.freeze, ["~> 5.0"])
    s.add_dependency(%q<json>.freeze, ["~> 2.0"])
    s.add_dependency(%q<rake-compiler>.freeze, ["~> 1.0"])
    s.add_dependency(%q<rake-compiler-dock>.freeze, ["~> 0.6"])
    s.add_dependency(%q<simplecov>.freeze, ["~> 0.14"])
  end
end
