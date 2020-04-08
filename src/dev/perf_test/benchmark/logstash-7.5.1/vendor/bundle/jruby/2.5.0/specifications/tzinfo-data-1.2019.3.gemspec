# -*- encoding: utf-8 -*-
# stub: tzinfo-data 1.2019.3 ruby lib

Gem::Specification.new do |s|
  s.name = "tzinfo-data".freeze
  s.version = "1.2019.3"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Philip Ross".freeze]
  s.cert_chain = ["-----BEGIN CERTIFICATE-----\nMIIDPDCCAiSgAwIBAgIBATANBgkqhkiG9w0BAQsFADAkMSIwIAYDVQQDDBlwaGls\nLnJvc3MvREM9Z21haWwvREM9Y29tMB4XDTE4MTAyNzE3NTQyNVoXDTE5MTAyNzE3\nNTQyNVowJDEiMCAGA1UEAwwZcGhpbC5yb3NzL0RDPWdtYWlsL0RDPWNvbTCCASIw\nDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJGcwfqn4ZsmPl0b1Lt9dCzExrE5\nEeP/CRQjBdGHkF+mSpi69XysxdwLdfg5SPr9LfxthUug4nNFd5fDCiXM8hYe9jQD\nTmkIQKNBh4fFpGngn9gyy+SumCXi6b5L6d/aMc59NAOM6LJ88TOdH1648dh5rq3C\nULq82n3gg4+u0HHGjRPuR/pnCFQCZbANYdX+UBWd0qkOJn/EreNKROmEeHr/xKuh\n2/GlKFKt9KLcW3hwBB4fHHVYUzRau7D1m9KbEERdg//qNDC4B7fD2BFJuPbM5S7J\n41VwDAh1O8B/Qpg0f+S83K4Kodw4MiPGsug55UkNtd3mGR/zZJ9WM03DSwkCAwEA\nAaN5MHcwCQYDVR0TBAIwADALBgNVHQ8EBAMCBLAwHQYDVR0OBBYEFA+Z8zvfzBuA\nesoHIfz7+jxfUOcfMB4GA1UdEQQXMBWBE3BoaWwucm9zc0BnbWFpbC5jb20wHgYD\nVR0SBBcwFYETcGhpbC5yb3NzQGdtYWlsLmNvbTANBgkqhkiG9w0BAQsFAAOCAQEA\nG7spOhX+wjEVvsn5KAqbeDXcRhnuAzz/DbAq8xkG84etG4HNNdGxe8z7DY0YuqQQ\nuau4AXpjQwtXRp6wYrzLjpn6Gsj0NGcv9TOcxHPPpr/cZnFuLdN5Sk7Q1sK8OuJ1\n7JSj/nRsuNVgoo5dSAghVbCUNd2Ch31oDGPQFzedmKo09mNTd72CfcjzrjXaHDIB\nObXSs1zIhlYXDJGC5Dpr1/fG2W7bd8xt4UwQBH8u53KKYbHjHcbF+9x3O9TDweZq\nlDDjxNrOZq4IuD3jrJI+T95Lo5RSCenQmPnJIGtfaoN+omC2q0HMFNx31TcWCcC8\nY2Wt5gQskVrMQo+j0zgJcw==\n-----END CERTIFICATE-----\n".freeze]
  s.date = "2019-09-12"
  s.description = "TZInfo::Data contains data from the IANA Time Zone database packaged as Ruby modules for use with TZInfo.".freeze
  s.email = "phil.ross@gmail.com".freeze
  s.extra_rdoc_files = ["README.md".freeze, "LICENSE".freeze]
  s.files = ["LICENSE".freeze, "README.md".freeze]
  s.homepage = "http://tzinfo.github.io".freeze
  s.licenses = ["MIT".freeze]
  s.rdoc_options = ["--title".freeze, "TZInfo::Data".freeze, "--main".freeze, "README.md".freeze, "--exclude".freeze, "definitions".freeze, "--exclude".freeze, "indexes".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.8.7".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Timezone Data for TZInfo".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<tzinfo>.freeze, [">= 1.0.0"])
    else
      s.add_dependency(%q<tzinfo>.freeze, [">= 1.0.0"])
    end
  else
    s.add_dependency(%q<tzinfo>.freeze, [">= 1.0.0"])
  end
end
