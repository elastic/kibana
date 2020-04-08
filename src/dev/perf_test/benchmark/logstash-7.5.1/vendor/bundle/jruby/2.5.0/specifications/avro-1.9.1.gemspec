# -*- encoding: utf-8 -*-
# stub: avro 1.9.1 ruby lib

Gem::Specification.new do |s|
  s.name = "avro".freeze
  s.version = "1.9.1"

  s.required_rubygems_version = Gem::Requirement.new(">= 1.2".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Apache Software Foundation".freeze]
  s.date = "2019-08-28"
  s.description = "Avro is a data serialization and RPC format".freeze
  s.email = "dev@avro.apache.org".freeze
  s.extra_rdoc_files = ["CHANGELOG".freeze, "LICENSE".freeze, "lib/avro.rb".freeze, "lib/avro/data_file.rb".freeze, "lib/avro/io.rb".freeze, "lib/avro/ipc.rb".freeze, "lib/avro/logical_types.rb".freeze, "lib/avro/protocol.rb".freeze, "lib/avro/schema.rb".freeze, "lib/avro/schema_compatibility.rb".freeze, "lib/avro/schema_normalization.rb".freeze, "lib/avro/schema_validator.rb".freeze]
  s.files = ["CHANGELOG".freeze, "LICENSE".freeze, "lib/avro.rb".freeze, "lib/avro/data_file.rb".freeze, "lib/avro/io.rb".freeze, "lib/avro/ipc.rb".freeze, "lib/avro/logical_types.rb".freeze, "lib/avro/protocol.rb".freeze, "lib/avro/schema.rb".freeze, "lib/avro/schema_compatibility.rb".freeze, "lib/avro/schema_normalization.rb".freeze, "lib/avro/schema_validator.rb".freeze]
  s.homepage = "https://avro.apache.org/".freeze
  s.licenses = ["Apache License 2.0 (Apache-2.0)".freeze]
  s.rdoc_options = ["--line-numbers".freeze, "--title".freeze, "Avro".freeze]
  s.rubyforge_project = "avro".freeze
  s.rubygems_version = "2.7.9".freeze
  s.summary = "Apache Avro for Ruby".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_runtime_dependency(%q<multi_json>.freeze, [">= 0"])
    else
      s.add_dependency(%q<multi_json>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<multi_json>.freeze, [">= 0"])
  end
end
