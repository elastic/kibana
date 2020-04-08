require "bundler/setup"
require "bundler/gem_tasks"
require "rake/testtask"
require "rbconfig"
DLEXT = RbConfig::CONFIG['DLEXT']

Rake::TestTask.new do |t|
  t.warning = true
  t.verbose = true
end

if defined?(JRUBY_VERSION)
  require 'ant'

  directory 'ext/java/build'

  task :setup => 'ext/java/build' do
    ant.property name: 'src.dir', value: 'ext/java/src'
    ant.property name: 'build.dir', value: 'ext/java/build'

    ant.path id: 'compile.class.path' do
      pathelement location: File.join(RbConfig::CONFIG['prefix'], 'lib', 'jruby.jar')
      $LOAD_PATH.flat_map { |path| Dir[File.join(path, '**', '*.jar')] }.each do |jar|
        pathelement location: jar
      end
    end
  end

  desc 'Compile the extension'
  task :compile => :setup do
    ant.javac destdir: '${build.dir}', includeantruntime: 'no', target: '1.6', source: '1.6', debug: 'on' do
      classpath refid: 'compile.class.path'
      src { pathelement location: '${src.dir}' }
    end
  end

  desc 'Package the jar'
  file 'lib/snappy_ext.jar' => :compile do |t|
    ant.jar destfile: 'lib/snappy_ext.jar', basedir: '${build.dir}' do
      ant.fileset dir: '${build.dir}', includes: 'snappy/*.class'
      ant.fileset dir: '${build.dir}', includes: 'SnappyExtLibraryService.class'
    end
  end

  task :test => 'lib/snappy_ext.jar'
  task :build => [:clean, 'lib/snappy_ext.jar']
else
  file "ext/snappy_ext.#{DLEXT}" => Dir.glob("ext/*{.rb,.c}") do
    Dir.chdir("ext") do
      ruby "extconf.rb"
      sh "make"
    end
    cp "ext/snappy_ext.#{DLEXT}", "lib/snappy_ext.#{DLEXT}"
  end


  task :test => "ext/snappy_ext.#{DLEXT}"
end

desc 'Clean up build artifacts'
task :clean do
  rm_rf 'ext/java/build'
  rm_rf 'lib/snappy_ext.jar'
  rm_rf(["ext/snappy_ext.#{DLEXT}", "lib/snappy_ext.#{DLEXT}", 'ext/mkmf.log', 'ext/config.h', 'ext/api.o', 'ext/Makefile', 'ext/snappy.cc', 'ext/snappy.h', 'ext/snappy.o'] + Dir['ext/snappy-*'])
end

task :default => :test
