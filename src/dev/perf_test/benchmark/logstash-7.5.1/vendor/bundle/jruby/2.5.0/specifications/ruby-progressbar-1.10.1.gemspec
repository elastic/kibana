# -*- encoding: utf-8 -*-
# stub: ruby-progressbar 1.10.1 ruby lib

Gem::Specification.new do |s|
  s.name = "ruby-progressbar".freeze
  s.version = "1.10.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "bug_tracker_uri" => "https://github.com/jfelchner/ruby-progressbar/issues", "changelog_uri" => "https://github.com/jfelchner/ruby-progressbar/blob/master/CHANGELOG.md", "documentation_uri" => "https://github.com/jfelchner/ruby-progressbar/tree/releases/v1.10.1", "homepage_uri" => "https://github.com/jfelchner/ruby-progressbar", "source_code_uri" => "https://github.com/jfelchner/ruby-progressbar", "wiki_uri" => "https://github.com/jfelchner/ruby-progressbar/wiki" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["thekompanee".freeze, "jfelchner".freeze]
  s.cert_chain = ["-----BEGIN CERTIFICATE-----\nMIIEdjCCAt6gAwIBAgIBATANBgkqhkiG9w0BAQsFADAyMTAwLgYDVQQDDCdhY2Nv\ndW50c19ydWJ5Z2Vtcy9EQz10aGVrb21wYW5lZS9EQz1jb20wHhcNMTgwODAzMjEz\nNDA1WhcNMTkwODAzMjEzNDA1WjAyMTAwLgYDVQQDDCdhY2NvdW50c19ydWJ5Z2Vt\ncy9EQz10aGVrb21wYW5lZS9EQz1jb20wggGiMA0GCSqGSIb3DQEBAQUAA4IBjwAw\nggGKAoIBgQCqhYn5ODEoLvuBIF2M1GzoaZU28+ntP5QApvDE0Te04n0JbBC1cNYH\nmr71neeSx7tlZ9w9kJ/8GNcY5bm7pNJqhyhfc+uG9M7FttcxM8AYXogjcdUDP234\n+TdmZIz20JxtWBgAZK2I3ktlgLFLC3Pxq63yzhJ75Xok07Wh+ypwjGzDNofPhz+y\nXR+UeUTp2UGe7kDVoqu/AwwPVhk1qUIRFLfC8SLDTD0CuNW3/AnkwQrKSm8vkiIn\nq9GCnOq0+jQly0b6a1Gi3ZDYEEswnTzziw2gotUZnQkF5bcOcxK1CB/Okk2jtG7i\nztMEU785tERbOSszZrz9rBS/+GnMxlD0pxy50zFfHX3jY1hwnwGjE8Gg+0iYr/tm\neysjhcbZfKrMynoqAioCSwstIwtYYYYpYzCPZzwaIBaBqQmUTkuMeiGbAdOdFOrR\nlOgl5jxCYbNOOTaXbm0nGBFaTucB88+JLbsNAuoNGUf/ybDcZ1zKRkMr2vtb+OtL\nGoP81fN6l88CAwEAAaOBljCBkzAJBgNVHRMEAjAAMAsGA1UdDwQEAwIEsDAdBgNV\nHQ4EFgQUL4eV4OM9h7fkM27qf9p4ragHi6AwLAYDVR0RBCUwI4EhYWNjb3VudHMr\ncnVieWdlbXNAdGhla29tcGFuZWUuY29tMCwGA1UdEgQlMCOBIWFjY291bnRzK3J1\nYnlnZW1zQHRoZWtvbXBhbmVlLmNvbTANBgkqhkiG9w0BAQsFAAOCAYEANh9Y8ccw\no3/+ZNjNhewsxip/oj8NZHRBLfrSXNT8nIxlB/CrHXHJ5UvJmsH45MYnU8Blsm04\nT6PNtZIh8sPWF0ByU/gJhs23C2CGgeDrijZWL/VcOK8ErhLd92lrtXiCei4mexo5\nflFW1vLZVTJRiXzVSmuBLkrhQE7BqSHvUTz2vkyf4f/G9jnqp+8Tf0IRZiPGFi82\n2qI/IOGmCb8Oqybt4lcHymLZBYPmj1hb/HVxEWTmQ9Y6ePHSonoK+QZf6Vi+wKga\nJxeLxFp0fQc+Mfjx+bFdJgOhcXMjLnDtAaQoDkQfRvQmCTKkXUhNRoTiWtxojkjX\n8mN+AQ66SKTSztEZRZWizqWmTUtkSG+IKlL5E9fUkLYsKV3xgiuwgh+3vSdz398u\nKuaMSG4L1U+uHNl3upTjh6wZjzKptsxE0eHSeTlt74ei2EZ4XpDQgMAdxnG19eUY\nEw38fD/eb7KjFt6HWjaE88pp12uYoAUV0xTysHhml+rk1/rn/h3T1Exa\n-----END CERTIFICATE-----\n".freeze]
  s.date = "2019-05-27"
  s.description = "Ruby/ProgressBar is an extremely flexible text progress bar library for Ruby. The output can be customized with a flexible formatting system including: percentage, bars of various formats, elapsed time and estimated time remaining.".freeze
  s.email = ["support@thekompanee.com".freeze]
  s.homepage = "https://github.com/jfelchner/ruby-progressbar".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Ruby/ProgressBar is a flexible text progress bar library for Ruby.".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<rspec>.freeze, ["~> 3.7"])
      s.add_development_dependency(%q<rspectacular>.freeze, ["~> 0.70.6"])
      s.add_development_dependency(%q<fuubar>.freeze, ["~> 2.3"])
      s.add_development_dependency(%q<warning_filter>.freeze, ["~> 0.0.6"])
      s.add_development_dependency(%q<timecop>.freeze, ["= 0.6.0"])
    else
      s.add_dependency(%q<rspec>.freeze, ["~> 3.7"])
      s.add_dependency(%q<rspectacular>.freeze, ["~> 0.70.6"])
      s.add_dependency(%q<fuubar>.freeze, ["~> 2.3"])
      s.add_dependency(%q<warning_filter>.freeze, ["~> 0.0.6"])
      s.add_dependency(%q<timecop>.freeze, ["= 0.6.0"])
    end
  else
    s.add_dependency(%q<rspec>.freeze, ["~> 3.7"])
    s.add_dependency(%q<rspectacular>.freeze, ["~> 0.70.6"])
    s.add_dependency(%q<fuubar>.freeze, ["~> 2.3"])
    s.add_dependency(%q<warning_filter>.freeze, ["~> 0.0.6"])
    s.add_dependency(%q<timecop>.freeze, ["= 0.6.0"])
  end
end
