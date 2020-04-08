
require 'rubygems'

require 'rake'
require 'rake/clean'
require 'rdoc/task'


#
# clean

CLEAN.include('pkg', 'rdoc')


#
# test / spec

#task :spec => :check_dependencies do
task :spec do
  exec 'rspec spec/'
end
task :test => :spec

task :default => :spec


#
# gem

GEMSPEC_FILE = Dir['*.gemspec'].first
GEMSPEC = eval(File.read(GEMSPEC_FILE))
GEMSPEC.validate


desc %{
  builds the gem and places it in pkg/
}
task :build do

  sh "gem build #{GEMSPEC_FILE}"
  sh "mkdir -p pkg"
  sh "mv #{GEMSPEC.name}-#{GEMSPEC.version}.gem pkg/"
end

desc %{
  builds the gem and pushes it to rubygems.org
}
task :push => :build do

  sh "gem push pkg/#{GEMSPEC.name}-#{GEMSPEC.version}.gem"
end


#
# rdoc
#
# make sure to have rdoc 2.5.x to run that

Rake::RDocTask.new do |rd|

  rd.main = 'README.txt'
  rd.rdoc_dir = "rdoc/#{GEMSPEC.name}"

  rd.rdoc_files.include('README.rdoc', 'CHANGELOG.txt', 'lib/**/*.rb')

  rd.title = "#{GEMSPEC.name} #{GEMSPEC.version}"
end


#
# upload_rdoc

desc %{
  upload the rdoc to rubyforge
}
task :upload_rdoc => [ :clean, :rdoc ] do

  account = 'jmettraux@rubyforge.org'
  webdir = '/var/www/gforge-projects/rufus'

  sh "rsync -azv -e ssh rdoc/#{GEMSPEC.name} #{account}:#{webdir}/"
end

