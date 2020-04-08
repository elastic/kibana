require "rake"
require "rake/ant/version"

class Rake::Ant
  def self.load_from_ant
    IO.popen("#{ant_script} -diagnostics") do |diag|
      classpath_jars = []
      listing_path = nil
      jar_path = nil
      diag.readlines.each do |line|

        # workaround for JRUBY-4814 (IO.popen doesnt convert CRLF to LF on Windows)
        line.chomp!

        if line =~ /^ant\.home: (.*)$/ && !defined?(ANT_HOME)
          const_set(:ANT_HOME, $1)
        elsif line =~ /Tasks availability/
          break
        elsif line =~ /^ (.*) jar listing$/
          listing_path = $1
        elsif line =~ /^(.*\.home): (.*)$/
          home_var, path = $1, $2
          jar_path = listing_path.sub(home_var.upcase.sub('.','_'), path) if listing_path
        elsif line =~ /^ant\.core\.lib: (.*)$/
          classpath_jars << $1
        elsif line =~ /^(.*\.jar) \(\d+ bytes\)/
          classpath_jars << File.join(jar_path, $1)
        end
      end
      classpath_jars.uniq.each {|j| $CLASSPATH << j }
    end
  rescue Errno::ENOENT
    raise RuntimeError, "Could not execute `#{ant_script}`. Make sure Ant is installed on the local system."
  end

  def self.load
    if ENV['ANT_HOME'] && File.exist?(ENV['ANT_HOME'])
      const_set(:ANT_HOME, ENV['ANT_HOME'])
      Dir["#{ANT_HOME}/lib/*.jar"].each {|j| $CLASSPATH << j }
    else
      load_from_ant
    end

    # Explicitly add javac path to classpath.
    # 'java.home' usually contains the JRE home on Windows and Linux. We
    # want the directory above that which contains lib/tools.jar.
    java_home = ENV['JAVA_HOME'] || ENV_JAVA['java.home'].sub(/\/jre$/,'')
    if java_home && File.exist?(java_home)
      const_set(:JAVA_HOME, java_home)
      load_if_exist "#{java_home}/lib/tools.jar"
      load_if_exist "#{java_home}/lib/classes.zip"
    end
  end

  def self.load_if_exist(jar)
    $CLASSPATH << jar if File.exist?(jar)
  end

  def self.ant_script
    require 'rbconfig'
    RbConfig::CONFIG['host_os'] =~ /Windows|mswin/ ? 'ant.bat' : 'ant'
  end

  load
end

# For backward compatibility
Ant = Rake::Ant

require 'rake/ant/ant'
require 'rake/ant/rake' if defined?(::Rake)
