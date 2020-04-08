# -*- encoding: utf-8 -*-
# stub: sequel 5.27.0 ruby lib

Gem::Specification.new do |s|
  s.name = "sequel".freeze
  s.version = "5.27.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "bug_tracker_uri" => "https://github.com/jeremyevans/sequel/issues", "changelog_uri" => "http://sequel.jeremyevans.net/rdoc/files/CHANGELOG.html", "documentation_uri" => "http://sequel.jeremyevans.net/documentation.html", "mailing_list_uri" => "https://groups.google.com/forum/#!forum/sequel-talk", "source_code_uri" => "https://github.com/jeremyevans/sequel" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Jeremy Evans".freeze]
  s.date = "2019-12-01"
  s.description = "The Database Toolkit for Ruby".freeze
  s.email = "code@jeremyevans.net".freeze
  s.executables = ["sequel".freeze]
  s.extra_rdoc_files = ["README.rdoc".freeze, "CHANGELOG".freeze, "MIT-LICENSE".freeze, "doc/association_basics.rdoc".freeze, "doc/model_dataset_method_design.rdoc".freeze, "doc/advanced_associations.rdoc".freeze, "doc/bin_sequel.rdoc".freeze, "doc/cheat_sheet.rdoc".freeze, "doc/code_order.rdoc".freeze, "doc/core_extensions.rdoc".freeze, "doc/dataset_basics.rdoc".freeze, "doc/dataset_filtering.rdoc".freeze, "doc/extensions.rdoc".freeze, "doc/mass_assignment.rdoc".freeze, "doc/migration.rdoc".freeze, "doc/opening_databases.rdoc".freeze, "doc/model_hooks.rdoc".freeze, "doc/model_plugins.rdoc".freeze, "doc/object_model.rdoc".freeze, "doc/sql.rdoc".freeze, "doc/mssql_stored_procedures.rdoc".freeze, "doc/thread_safety.rdoc".freeze, "doc/postgresql.rdoc".freeze, "doc/querying.rdoc".freeze, "doc/prepared_statements.rdoc".freeze, "doc/reflection.rdoc".freeze, "doc/security.rdoc".freeze, "doc/virtual_rows.rdoc".freeze, "doc/schema_modification.rdoc".freeze, "doc/sharding.rdoc".freeze, "doc/testing.rdoc".freeze, "doc/validations.rdoc".freeze, "doc/transactions.rdoc".freeze, "doc/release_notes/4.0.0.txt".freeze, "doc/release_notes/4.1.0.txt".freeze, "doc/release_notes/4.10.0.txt".freeze, "doc/release_notes/4.11.0.txt".freeze, "doc/release_notes/4.12.0.txt".freeze, "doc/release_notes/4.13.0.txt".freeze, "doc/release_notes/4.14.0.txt".freeze, "doc/release_notes/4.15.0.txt".freeze, "doc/release_notes/4.16.0.txt".freeze, "doc/release_notes/4.17.0.txt".freeze, "doc/release_notes/4.18.0.txt".freeze, "doc/release_notes/4.19.0.txt".freeze, "doc/release_notes/4.2.0.txt".freeze, "doc/release_notes/4.20.0.txt".freeze, "doc/release_notes/4.21.0.txt".freeze, "doc/release_notes/4.22.0.txt".freeze, "doc/release_notes/4.23.0.txt".freeze, "doc/release_notes/4.24.0.txt".freeze, "doc/release_notes/4.25.0.txt".freeze, "doc/release_notes/4.26.0.txt".freeze, "doc/release_notes/4.27.0.txt".freeze, "doc/release_notes/4.28.0.txt".freeze, "doc/release_notes/4.29.0.txt".freeze, "doc/release_notes/4.3.0.txt".freeze, "doc/release_notes/4.30.0.txt".freeze, "doc/release_notes/4.31.0.txt".freeze, "doc/release_notes/4.32.0.txt".freeze, "doc/release_notes/4.33.0.txt".freeze, "doc/release_notes/4.34.0.txt".freeze, "doc/release_notes/4.35.0.txt".freeze, "doc/release_notes/4.36.0.txt".freeze, "doc/release_notes/4.37.0.txt".freeze, "doc/release_notes/4.38.0.txt".freeze, "doc/release_notes/4.39.0.txt".freeze, "doc/release_notes/4.4.0.txt".freeze, "doc/release_notes/4.40.0.txt".freeze, "doc/release_notes/4.41.0.txt".freeze, "doc/release_notes/4.42.0.txt".freeze, "doc/release_notes/4.43.0.txt".freeze, "doc/release_notes/4.44.0.txt".freeze, "doc/release_notes/4.45.0.txt".freeze, "doc/release_notes/4.46.0.txt".freeze, "doc/release_notes/4.47.0.txt".freeze, "doc/release_notes/4.48.0.txt".freeze, "doc/release_notes/4.49.0.txt".freeze, "doc/release_notes/4.5.0.txt".freeze, "doc/release_notes/4.6.0.txt".freeze, "doc/release_notes/4.7.0.txt".freeze, "doc/release_notes/4.8.0.txt".freeze, "doc/release_notes/4.9.0.txt".freeze, "doc/release_notes/5.5.0.txt".freeze, "doc/release_notes/5.6.0.txt".freeze, "doc/release_notes/5.0.0.txt".freeze, "doc/release_notes/5.1.0.txt".freeze, "doc/release_notes/5.2.0.txt".freeze, "doc/release_notes/5.3.0.txt".freeze, "doc/release_notes/5.4.0.txt".freeze, "doc/release_notes/5.8.0.txt".freeze, "doc/release_notes/5.7.0.txt".freeze, "doc/release_notes/5.9.0.txt".freeze, "doc/release_notes/5.10.0.txt".freeze, "doc/release_notes/5.11.0.txt".freeze, "doc/release_notes/5.12.0.txt".freeze, "doc/release_notes/5.13.0.txt".freeze, "doc/release_notes/5.14.0.txt".freeze, "doc/release_notes/5.15.0.txt".freeze, "doc/release_notes/5.16.0.txt".freeze, "doc/release_notes/5.17.0.txt".freeze, "doc/release_notes/5.18.0.txt".freeze, "doc/release_notes/5.19.0.txt".freeze, "doc/release_notes/5.20.0.txt".freeze, "doc/release_notes/5.21.0.txt".freeze, "doc/release_notes/5.22.0.txt".freeze, "doc/release_notes/5.23.0.txt".freeze, "doc/release_notes/5.24.0.txt".freeze, "doc/release_notes/5.25.0.txt".freeze, "doc/release_notes/5.26.0.txt".freeze, "doc/release_notes/5.27.0.txt".freeze]
  s.files = ["CHANGELOG".freeze, "MIT-LICENSE".freeze, "README.rdoc".freeze, "bin/sequel".freeze, "doc/advanced_associations.rdoc".freeze, "doc/association_basics.rdoc".freeze, "doc/bin_sequel.rdoc".freeze, "doc/cheat_sheet.rdoc".freeze, "doc/code_order.rdoc".freeze, "doc/core_extensions.rdoc".freeze, "doc/dataset_basics.rdoc".freeze, "doc/dataset_filtering.rdoc".freeze, "doc/extensions.rdoc".freeze, "doc/mass_assignment.rdoc".freeze, "doc/migration.rdoc".freeze, "doc/model_dataset_method_design.rdoc".freeze, "doc/model_hooks.rdoc".freeze, "doc/model_plugins.rdoc".freeze, "doc/mssql_stored_procedures.rdoc".freeze, "doc/object_model.rdoc".freeze, "doc/opening_databases.rdoc".freeze, "doc/postgresql.rdoc".freeze, "doc/prepared_statements.rdoc".freeze, "doc/querying.rdoc".freeze, "doc/reflection.rdoc".freeze, "doc/release_notes/4.0.0.txt".freeze, "doc/release_notes/4.1.0.txt".freeze, "doc/release_notes/4.10.0.txt".freeze, "doc/release_notes/4.11.0.txt".freeze, "doc/release_notes/4.12.0.txt".freeze, "doc/release_notes/4.13.0.txt".freeze, "doc/release_notes/4.14.0.txt".freeze, "doc/release_notes/4.15.0.txt".freeze, "doc/release_notes/4.16.0.txt".freeze, "doc/release_notes/4.17.0.txt".freeze, "doc/release_notes/4.18.0.txt".freeze, "doc/release_notes/4.19.0.txt".freeze, "doc/release_notes/4.2.0.txt".freeze, "doc/release_notes/4.20.0.txt".freeze, "doc/release_notes/4.21.0.txt".freeze, "doc/release_notes/4.22.0.txt".freeze, "doc/release_notes/4.23.0.txt".freeze, "doc/release_notes/4.24.0.txt".freeze, "doc/release_notes/4.25.0.txt".freeze, "doc/release_notes/4.26.0.txt".freeze, "doc/release_notes/4.27.0.txt".freeze, "doc/release_notes/4.28.0.txt".freeze, "doc/release_notes/4.29.0.txt".freeze, "doc/release_notes/4.3.0.txt".freeze, "doc/release_notes/4.30.0.txt".freeze, "doc/release_notes/4.31.0.txt".freeze, "doc/release_notes/4.32.0.txt".freeze, "doc/release_notes/4.33.0.txt".freeze, "doc/release_notes/4.34.0.txt".freeze, "doc/release_notes/4.35.0.txt".freeze, "doc/release_notes/4.36.0.txt".freeze, "doc/release_notes/4.37.0.txt".freeze, "doc/release_notes/4.38.0.txt".freeze, "doc/release_notes/4.39.0.txt".freeze, "doc/release_notes/4.4.0.txt".freeze, "doc/release_notes/4.40.0.txt".freeze, "doc/release_notes/4.41.0.txt".freeze, "doc/release_notes/4.42.0.txt".freeze, "doc/release_notes/4.43.0.txt".freeze, "doc/release_notes/4.44.0.txt".freeze, "doc/release_notes/4.45.0.txt".freeze, "doc/release_notes/4.46.0.txt".freeze, "doc/release_notes/4.47.0.txt".freeze, "doc/release_notes/4.48.0.txt".freeze, "doc/release_notes/4.49.0.txt".freeze, "doc/release_notes/4.5.0.txt".freeze, "doc/release_notes/4.6.0.txt".freeze, "doc/release_notes/4.7.0.txt".freeze, "doc/release_notes/4.8.0.txt".freeze, "doc/release_notes/4.9.0.txt".freeze, "doc/release_notes/5.0.0.txt".freeze, "doc/release_notes/5.1.0.txt".freeze, "doc/release_notes/5.10.0.txt".freeze, "doc/release_notes/5.11.0.txt".freeze, "doc/release_notes/5.12.0.txt".freeze, "doc/release_notes/5.13.0.txt".freeze, "doc/release_notes/5.14.0.txt".freeze, "doc/release_notes/5.15.0.txt".freeze, "doc/release_notes/5.16.0.txt".freeze, "doc/release_notes/5.17.0.txt".freeze, "doc/release_notes/5.18.0.txt".freeze, "doc/release_notes/5.19.0.txt".freeze, "doc/release_notes/5.2.0.txt".freeze, "doc/release_notes/5.20.0.txt".freeze, "doc/release_notes/5.21.0.txt".freeze, "doc/release_notes/5.22.0.txt".freeze, "doc/release_notes/5.23.0.txt".freeze, "doc/release_notes/5.24.0.txt".freeze, "doc/release_notes/5.25.0.txt".freeze, "doc/release_notes/5.26.0.txt".freeze, "doc/release_notes/5.27.0.txt".freeze, "doc/release_notes/5.3.0.txt".freeze, "doc/release_notes/5.4.0.txt".freeze, "doc/release_notes/5.5.0.txt".freeze, "doc/release_notes/5.6.0.txt".freeze, "doc/release_notes/5.7.0.txt".freeze, "doc/release_notes/5.8.0.txt".freeze, "doc/release_notes/5.9.0.txt".freeze, "doc/schema_modification.rdoc".freeze, "doc/security.rdoc".freeze, "doc/sharding.rdoc".freeze, "doc/sql.rdoc".freeze, "doc/testing.rdoc".freeze, "doc/thread_safety.rdoc".freeze, "doc/transactions.rdoc".freeze, "doc/validations.rdoc".freeze, "doc/virtual_rows.rdoc".freeze]
  s.homepage = "http://sequel.jeremyevans.net".freeze
  s.licenses = ["MIT".freeze]
  s.rdoc_options = ["--quiet".freeze, "--line-numbers".freeze, "--inline-source".freeze, "--title".freeze, "Sequel: The Database Toolkit for Ruby".freeze, "--main".freeze, "README.rdoc".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 1.9.2".freeze)
  s.rubygems_version = "2.7.9".freeze
  s.summary = "The Database Toolkit for Ruby".freeze

  s.installed_by_version = "2.7.9" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4

    if Gem::Version.new(Gem::VERSION) >= Gem::Version.new('1.2.0') then
      s.add_development_dependency(%q<minitest>.freeze, [">= 5.7.0"])
      s.add_development_dependency(%q<minitest-hooks>.freeze, [">= 0"])
      s.add_development_dependency(%q<minitest-global_expectations>.freeze, [">= 0"])
      s.add_development_dependency(%q<minitest-shared_description>.freeze, [">= 0"])
      s.add_development_dependency(%q<tzinfo>.freeze, [">= 0"])
      s.add_development_dependency(%q<activemodel>.freeze, [">= 0"])
      s.add_development_dependency(%q<nokogiri>.freeze, [">= 0"])
    else
      s.add_dependency(%q<minitest>.freeze, [">= 5.7.0"])
      s.add_dependency(%q<minitest-hooks>.freeze, [">= 0"])
      s.add_dependency(%q<minitest-global_expectations>.freeze, [">= 0"])
      s.add_dependency(%q<minitest-shared_description>.freeze, [">= 0"])
      s.add_dependency(%q<tzinfo>.freeze, [">= 0"])
      s.add_dependency(%q<activemodel>.freeze, [">= 0"])
      s.add_dependency(%q<nokogiri>.freeze, [">= 0"])
    end
  else
    s.add_dependency(%q<minitest>.freeze, [">= 5.7.0"])
    s.add_dependency(%q<minitest-hooks>.freeze, [">= 0"])
    s.add_dependency(%q<minitest-global_expectations>.freeze, [">= 0"])
    s.add_dependency(%q<minitest-shared_description>.freeze, [">= 0"])
    s.add_dependency(%q<tzinfo>.freeze, [">= 0"])
    s.add_dependency(%q<activemodel>.freeze, [">= 0"])
    s.add_dependency(%q<nokogiri>.freeze, [">= 0"])
  end
end
