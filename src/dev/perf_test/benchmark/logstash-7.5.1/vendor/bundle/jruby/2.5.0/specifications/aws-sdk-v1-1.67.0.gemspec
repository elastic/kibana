# -*- encoding: utf-8 -*-
# stub: aws-sdk-v1 1.67.0 ruby lib

Gem::Specification.new do |s|
  s.name = "aws-sdk-v1".freeze
  s.version = "1.67.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Amazon Web Services".freeze]
  s.date = "2017-04-03"
  s.description = "Version 1 of the AWS SDK for Ruby. Available as both `aws-sdk` and `aws-sdk-v1`.\nUse `aws-sdk-v1` if you want to load v1 and v2 of the Ruby SDK in the same\napplication.".freeze
  s.executables = ["aws-rb".freeze]
  s.files = ["bin/aws-rb".freeze]
  s.homepage = "http://aws.amazon.com/sdkforruby".freeze
  s.licenses = ["Apache 2.0".freeze]
  s.rubygems_version = "2.7.9".freeze
  s.summary = "AWS SDK for Ruby V1".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<nokogiri>.freeze, ["~> 1"])
      s.add_runtime_dependency(%q<json>.freeze, ["~> 1.4"])
    else
      s.add_dependency(%q<nokogiri>.freeze, ["~> 1"])
      s.add_dependency(%q<json>.freeze, ["~> 1.4"])
    end
  else
    s.add_dependency(%q<nokogiri>.freeze, ["~> 1"])
    s.add_dependency(%q<json>.freeze, ["~> 1.4"])
  end
end
