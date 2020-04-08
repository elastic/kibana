require "hoe"
require "rake/extensiontask"
require "rake/javaextensiontask"

IS_JRUBY = defined?(RUBY_ENGINE) ? RUBY_ENGINE == "jruby" : false

Hoe.plugin :git
Hoe.plugin :ignore

HOE = Hoe.spec "puma" do
  self.readme_file    = "README.md"
  self.urls = %w!http://puma.io https://github.com/puma/puma!

  license "BSD-3-Clause"
  developer 'Evan Phoenix', 'evan@phx.io'

  spec_extras[:extensions]  = ["ext/puma_http11/extconf.rb"]
  spec_extras[:executables] = ['puma', 'pumactl']
  spec_extras[:homepage] = self.urls.first

  require_ruby_version ">= 1.8.7"

  dependency "rack", [">= 1.1", "< 2.0"], :development

  extra_dev_deps << ["rake-compiler", "~> 0.8"]
end

task :prerelease => [:clobber, :check_manifest, :test]

# hoe/test and rake-compiler don't seem to play well together, so disable
# hoe/test's .gemtest touch file thingy for now
HOE.spec.files -= [".gemtest"]

include Hoe::Git

desc "Print the current changelog."
task "changelog" do
  tag   = ENV["FROM"] || git_tags.last
  range = [tag, "HEAD"].compact.join ".."
  cmd   = "git log #{range} '--format=tformat:%B|||%aN|||%aE|||'"
  now   = Time.new.strftime "%Y-%m-%d"

  changes = `#{cmd}`.split(/\|\|\|/).each_slice(3).map { |msg, author, email|
              msg.split(/\n/).reject { |s| s.empty? }.first
            }.flatten.compact

  $changes = Hash.new { |h,k| h[k] = [] }

  codes = {
    "!" => :major,
    "+" => :minor,
    "*" => :minor,
    "-" => :bug,
    "?" => :unknown,
  }

  codes_re = Regexp.escape codes.keys.join

  changes.each do |change|
    if change =~ /^\s*([#{codes_re}])\s*(.*)/ then
      code, line = codes[$1], $2
    else
      code, line = codes["?"], change.chomp
    end

    $changes[code] << line
  end

  puts "=== #{ENV['VERSION'] || 'NEXT'} / #{now}"
  puts
  changelog_section :major
  changelog_section :minor
  changelog_section :bug
  changelog_section :unknown
  puts
end

# generate extension code using Ragel (C and Java)
desc "Generate extension code (C and Java) using Ragel"
task :ragel

file 'ext/puma_http11/http11_parser.c' => ['ext/puma_http11/http11_parser.rl'] do |t|
  begin
    sh "ragel #{t.prerequisites.last} -C -G2 -I ext/puma_http11 -o #{t.name}"
  rescue
    fail "Could not build wrapper using Ragel (it failed or not installed?)"
  end
end
task :ragel => ['ext/puma_http11/http11_parser.c']

file 'ext/puma_http11/org/jruby/puma/Http11Parser.java' => ['ext/puma_http11/http11_parser.java.rl'] do |t|
  begin
    sh "ragel #{t.prerequisites.last} -J -G2 -I ext/puma_http11 -o #{t.name}"
  rescue
    fail "Could not build wrapper using Ragel (it failed or not installed?)"
  end
end
task :ragel => ['ext/puma_http11/org/jruby/puma/Http11Parser.java']

if !IS_JRUBY

# compile extensions using rake-compiler
# C (MRI, Rubinius)
Rake::ExtensionTask.new("puma_http11", HOE.spec) do |ext|
  # place extension inside namespace
  ext.lib_dir = "lib/puma"

  ext.cross_compile = true
  ext.cross_platform = ['i386-mswin32-60', 'i386-mingw32']
  ext.cross_compiling do |spec|
    # add fat-binary stub only when cross compiling
    spec.files << "lib/puma/puma_http11.rb"
  end

  CLEAN.include "lib/puma/{1.8,1.9}"
  CLEAN.include "lib/puma/puma_http11.rb"
end

else

# Java (JRuby)
Rake::JavaExtensionTask.new("puma_http11", HOE.spec) do |ext|
  ext.lib_dir = "lib/puma"
end

end

# the following is a fat-binary stub that will be used when
# require 'puma/puma_http11' and will use either 1.8 or 1.9 version depending
# on RUBY_VERSION
file "lib/puma/puma_http11.rb" do |t|
  File.open(t.name, "w") do |f|
    f.puts "RUBY_VERSION =~ /(\d+.\d+)/"
    f.puts 'require "puma/#{$1}/puma_http11"'
  end
end

# tests require extension be compiled, but depend on the platform
if IS_JRUBY
  task :test => [:java]
else
  task :test => [:compile]
end

namespace :test do
  desc "Run the integration tests"
  task :integration do
    sh "cd test/shell; sh run.sh"
  end

  desc "Run all tests"
  if defined?(JRUBY_VERSION) and ENV['TRAVIS']
    task :all => :test
  else
    task :all => [:test, "test:integration"]
  end
end

