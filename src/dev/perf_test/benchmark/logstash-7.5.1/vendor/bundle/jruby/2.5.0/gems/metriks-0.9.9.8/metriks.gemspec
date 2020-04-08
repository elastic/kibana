## This is the rakegem gemspec template. Make sure you read and understand
## all of the comments. Some sections require modification, and others can
## be deleted if you don't need them. Once you understand the contents of
## this file, feel free to delete any comments that begin with two hash marks.
## You can find comprehensive Gem::Specification documentation, at
## http://docs.rubygems.org/read/chapter/20
Gem::Specification.new do |s|
  s.specification_version = 2 if s.respond_to? :specification_version=
  s.required_rubygems_version = Gem::Requirement.new(">= 0") if s.respond_to? :required_rubygems_version=
  s.rubygems_version = '1.3.5'

  ## Leave these as is they will be modified for you by the rake gemspec task.
  ## If your rubyforge_project name is different, then edit it and comment out
  ## the sub! line in the Rakefile
  s.name              = 'metriks'
  s.version           = '0.9.9.8'
  s.date              = '2017-04-26'

  ## Make sure your summary is short. The description may be as long
  ## as you like.
  s.summary     = "An experimental metrics client"
  s.description = "An experimental metrics client."

  ## List the primary authors. If there are a bunch of authors, it's probably
  ## better to set the email to an email list or something. If you don't have
  ## a custom homepage, consider using your GitHub URL or the like.
  s.authors  = ["Eric Lindvall"]
  s.email    = 'eric@sevenscale.com'
  s.homepage = 'https://github.com/eric/metriks'

  ## This gets added to the $LOAD_PATH so that 'lib/NAME.rb' can be required as
  ## require 'NAME.rb' or'/lib/NAME/file.rb' can be as require 'NAME/file.rb'
  s.require_paths = %w[lib]

  ## Specify any RDoc options here. You'll want to add your README and
  ## LICENSE files to the extra_rdoc_files list.
  s.rdoc_options = ["--charset=UTF-8"]
  s.extra_rdoc_files = %w[README.md LICENSE]

  ## List your runtime dependencies here. Runtime dependencies are those
  ## that are needed for an end user to actually USE your code.
  s.add_dependency('atomic', ["~> 1.0"])
  s.add_dependency('hitimes', [ "~> 1.1"])
  s.add_dependency('avl_tree', [ "~> 1.2.0" ])

  ## List your development dependencies here. Development dependencies are
  ## those that are only needed during development
  # s.add_development_dependency('tomdoc', ["~> 0.2"])
  s.add_development_dependency('mocha', ['~> 0.10'])

  ## Leave this section as-is. It will be automatically generated from the
  ## contents of your Git repository via the gemspec task. DO NOT REMOVE
  ## THE MANIFEST COMMENTS, they are used as delimiters by the task.
  # = MANIFEST =
  s.files = %w[
    Gemfile
    LICENSE
    README.md
    Rakefile
    benchmark/samplers.rb
    lib/metriks.rb
    lib/metriks/counter.rb
    lib/metriks/ewma.rb
    lib/metriks/exponentially_decaying_sample.rb
    lib/metriks/gauge.rb
    lib/metriks/histogram.rb
    lib/metriks/meter.rb
    lib/metriks/registry.rb
    lib/metriks/reporter/graphite.rb
    lib/metriks/reporter/librato_metrics.rb
    lib/metriks/reporter/logger.rb
    lib/metriks/reporter/proc_title.rb
    lib/metriks/reporter/riemann.rb
    lib/metriks/simple_moving_average.rb
    lib/metriks/snapshot.rb
    lib/metriks/time_tracker.rb
    lib/metriks/timer.rb
    lib/metriks/uniform_sample.rb
    lib/metriks/utilization_timer.rb
    metriks.gemspec
    test/counter_test.rb
    test/gauge_test.rb
    test/graphite_reporter_test.rb
    test/histogram_test.rb
    test/librato_metrics_reporter_test.rb
    test/logger_reporter_test.rb
    test/meter_test.rb
    test/metriks_test.rb
    test/proc_title_reporter_test.rb
    test/registry_test.rb
    test/riemann_reporter_test.rb
    test/test_helper.rb
    test/thread_error_handling_tests.rb
    test/timer_test.rb
    test/utilization_timer_test.rb
  ]
  # = MANIFEST =

  ## Test files will be grabbed from the file list. Make sure the path glob
  ## matches what you actually use.
  s.test_files = s.files.select { |path| path =~ /^test\/.*_test\.rb/ }
end
