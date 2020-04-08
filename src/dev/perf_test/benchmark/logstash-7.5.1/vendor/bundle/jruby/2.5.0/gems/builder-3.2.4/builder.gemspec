# frozen_string_literal: true
require './lib/builder/version'

PKG_VERSION = Builder::VERSION

PKG_FILES = Dir[
  '[A-Z]*',
  'doc/**/*',
  'lib/**/*.rb',
  'test/**/*.rb',
  'rakelib/**/*'
]

Gem::Specification.new do |s|

  #### Basic information.

  s.name = 'builder'
  s.version = PKG_VERSION
  s.summary = "Builders for MarkUp."
  s.description = %{\
Builder provides a number of builder objects that make creating structured data
simple to do.  Currently the following builder objects are supported:

* XML Markup
* XML Events
}

  s.files = PKG_FILES
  s.require_path = 'lib'

  s.test_files = PKG_FILES.select { |fn| fn =~ /^test\/test/ }

  s.has_rdoc = true
  # s.extra_rdoc_files = rd.rdoc_files.reject { |fn| fn =~ /\.rb$/ }.to_a
  s.rdoc_options <<
    '--title' <<  'Builder -- Easy XML Building' <<
    '--main' << 'README.rdoc' <<
    '--line-numbers'

  s.authors = ["Jim Weirich", "Aaron Patterson"]
  s.email = "aron.patterson@gmail.com"
  s.homepage = "https://github.com/tenderlove/builder"
  s.license = 'MIT'
end
