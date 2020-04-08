# -*- encoding: utf-8 -*-
# stub: webhdfs 0.9.0 ruby lib

Gem::Specification.new do |s|
  s.name = "webhdfs".freeze
  s.version = "0.9.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Kazuki Ohta".freeze, "Satoshi Tagomori".freeze]
  s.date = "2019-11-11"
  s.description = "Ruby WebHDFS/HttpFs client".freeze
  s.email = ["kazuki.ohta@gmail.com".freeze, "tagomoris@gmail.com".freeze]
  s.homepage = "https://github.com/kzk/webhdfs/".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Ruby WebHDFS/HttpFs client".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rake>.freeze, [">= 0"])
      s.add_development_dependency(%q<rdoc>.freeze, [">= 0"])
      s.add_development_dependency(%q<simplecov>.freeze, [">= 0"])
      s.add_development_dependency(%q<rr>.freeze, [">= 0"])
      s.add_runtime_dependency(%q<addressable>.freeze, [">= 0"])
    else
      s.add_dependency(%q<rake>.freeze, [">= 0"])
      s.add_dependency(%q<rdoc>.freeze, [">= 0"])
      s.add_dependency(%q<simplecov>.freeze, [">= 0"])
      s.add_dependency(%q<rr>.freeze, [">= 0"])
      s.add_dependency(%q<addressable>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<rake>.freeze, [">= 0"])
    s.add_dependency(%q<rdoc>.freeze, [">= 0"])
    s.add_dependency(%q<simplecov>.freeze, [">= 0"])
    s.add_dependency(%q<rr>.freeze, [">= 0"])
    s.add_dependency(%q<addressable>.freeze, [">= 0"])
  end
end
