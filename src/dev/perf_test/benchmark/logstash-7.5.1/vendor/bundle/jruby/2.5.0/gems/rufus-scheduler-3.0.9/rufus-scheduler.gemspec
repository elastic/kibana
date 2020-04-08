
Gem::Specification.new do |s|

  s.name = 'rufus-scheduler'

  s.version = File.read(
    File.expand_path('../lib/rufus/scheduler.rb', __FILE__)
  ).match(/ VERSION *= *['"]([^'"]+)/)[1]

  s.platform = Gem::Platform::RUBY
  s.authors = [ 'John Mettraux' ]
  s.email = [ 'jmettraux@gmail.com' ]
  s.homepage = 'http://github.com/jmettraux/rufus-scheduler'
  s.rubyforge_project = 'rufus'
  s.license = 'MIT'
  s.summary = 'job scheduler for Ruby (at, cron, in and every jobs)'

  s.description = %{
job scheduler for Ruby (at, cron, in and every jobs).
  }.strip

  #s.files = `git ls-files`.split("\n")
  s.files = Dir[
    'Rakefile',
    'lib/**/*.rb', 'spec/**/*.rb', 'test/**/*.rb',
    '*.gemspec', '*.txt', '*.rdoc', '*.md'
  ]

  s.add_runtime_dependency 'tzinfo'

  s.add_development_dependency 'rake'
  s.add_development_dependency 'rspec', '>= 2.13.0'
  s.add_development_dependency 'chronic'

  s.require_path = 'lib'

  s.post_install_message =
    %{
***

Thanks for installing rufus-scheduler #{s.version}

It might not be 100% compatible with rufus-scheduler 2.x.

If you encounter issues with this new rufus-scheduler, especially
if your app worked fine with previous versions of it, you can

A) Forget it and peg your Gemfile to rufus-scheduler 2.0.24

and / or

B) Take some time to carefully report the issue at
   https://github.com/jmettraux/rufus-scheduler/issues

For general help about rufus-scheduler, ask via:
http://stackoverflow.com/questions/ask?tags=rufus-scheduler+ruby

Cheers.

***
    }
end

