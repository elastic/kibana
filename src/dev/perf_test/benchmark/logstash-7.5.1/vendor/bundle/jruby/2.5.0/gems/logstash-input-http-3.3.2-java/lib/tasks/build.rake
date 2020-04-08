# encoding: utf-8
require "jars/installer"
require "fileutils"

desc "vendor"
task :vendor do
  exit(1) unless system './gradlew vendor'
  version = File.read("VERSION").strip
end

desc "clean"
task :clean do
  ["build", "vendor/jar-dependencies", "Gemfile.lock"].each do |p|
    FileUtils.rm_rf(p)
  end
end
