# this file is maven DSL and used by maven via jars/maven_exec.rb

eval(File.read(File.join(File.dirname(__FILE__), 'attach_jars_pom.rb')))

eval(File.read(File.join(File.dirname(__FILE__), 'output_jars_pom.rb')))
