# to do as bundler does and allow to load Jars.lock via
# require 'jars/setup'. can be useful via commandline -rjars/setup
# or tell bundler autorequire to load it

require 'jar_dependencies'

Jars.setup
