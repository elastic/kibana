# -*- encoding: utf-8 -*-
# stub: sawyer 0.8.2 ruby lib

Gem::Specification.new do |s|
  s.name = "sawyer".freeze
  s.version = "0.8.2"

  s.required_rubygems_version = Gem::Requirement.new(">= 1.3.5".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Rick Olson".freeze, "Wynn Netherland".freeze]
  s.date = "2019-05-01"
  s.email = "technoweenie@gmail.com".freeze
  s.homepage = "https://github.com/lostisland/sawyer".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Secret User Agent of HTTP".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 2

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<faraday>.freeze, ["> 0.8", "< 2.0"])
      s.add_runtime_dependency(%q<addressable>.freeze, [">= 2.3.5"])
    else
      s.add_dependency(%q<faraday>.freeze, ["> 0.8", "< 2.0"])
      s.add_dependency(%q<addressable>.freeze, [">= 2.3.5"])
    end
  else
    s.add_dependency(%q<faraday>.freeze, ["> 0.8", "< 2.0"])
    s.add_dependency(%q<addressable>.freeze, [">= 2.3.5"])
  end
end
