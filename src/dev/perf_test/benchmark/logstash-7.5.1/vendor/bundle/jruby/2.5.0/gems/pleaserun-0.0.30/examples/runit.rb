#! /usr/bin/env ruby

require 'pleaserun/runit'

pr = PleaseRun::RunIt.new('debian-7.0')
pr.name    = 'foo'
pr.user    = 'nobody'
pr.command = '/bin/true'
pr.args    = []

pr.files.each do |path, content|
  puts path => content.bytes.size
  puts "#{path}:"
  puts content.gsub(/^/, '  ')
end

