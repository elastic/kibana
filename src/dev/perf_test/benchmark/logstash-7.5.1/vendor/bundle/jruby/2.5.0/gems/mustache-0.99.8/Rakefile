require 'rake/testtask'
require 'rdoc/task'

#
# Helpers
#

def command?(command)
  system("type #{command} &> /dev/null")
end


#
# Tests
#

task :default => :test

if command? :turn
  desc "Run tests"
  task :test do
    suffix = "-n #{ENV['TEST']}" if ENV['TEST']
    sh "turn test/*.rb #{suffix}"
  end
else
  Rake::TestTask.new do |t|
    t.libs << 'lib'
    t.pattern = 'test/**/*_test.rb'
    t.verbose = false
  end
end


#
# Ron
#

if command? :ronn
  desc "Show the manual"
  task :man => "man:build" do
    exec "man man/mustache.1"
  end

  desc "Build the manual"
  task "man:build" do
    sh "ronn -br5 --organization=DEFUNKT --manual='Mustache Manual' man/*.ron"
  end
end


#
# Gems
#

desc "Push a new version to Gemcutter and publish docs."
task :publish do
  require File.dirname(__FILE__) + '/lib/mustache/version'

  system "git tag v#{Mustache::Version}"
  sh "gem build mustache.gemspec"
  sh "gem push mustache-#{Mustache::Version}.gem"
  sh "git push origin master --tags"
  sh "git clean -fd"
  exec "rake pages"
end

#
# Documentation
#

desc "Publish to GitHub Pages"
task :pages => [ "man:build" ] do
  Dir['man/*.html'].each do |f|
    cp f, File.basename(f).sub('.html', '.newhtml')
  end

  `git commit -am 'generated manual'`
  `git checkout site`

  Dir['*.newhtml'].each do |f|
    mv f, f.sub('.newhtml', '.html')
  end

  `git add .`
  `git commit -m updated`
  `git push site site:master`
  `git checkout master`
  puts :done
end
