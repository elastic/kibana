# -*- ruby -*-
#
# Copyright (C) 2008-2017  Kouhei Sutou <kou@clear-code.com>
#
# This library is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public
# License as published by the Free Software Foundation; either
# version 2.1 of the License, or (at your option) any later version.
#
# This library is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public
# License along with this library; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA

Encoding.default_internal = "UTF-8" if defined?(Encoding.default_internal)

# TODO: Remove me when we drop Ruby 1.9 support.
unless "".respond_to?(:b)
  class String
    def b
      dup.force_encoding("ASCII-8BIT")
    end
  end
end

require "erb"
require "yaml"
require "rubygems"
require "rake/clean"
require "yard"
require "bundler/gem_helper"
require "packnga"

task :default => :test

base_dir = File.dirname(__FILE__)
html_base_dir = File.join(base_dir, "doc", "html")

helper = Bundler::GemHelper.new(base_dir)
def helper.version_tag
  version
end

helper.install
spec = helper.gemspec

document_task = Packnga::DocumentTask.new(spec) do |task|
  task.original_language = "en"
  task.translate_languages = ["ja"]
end

Packnga::ReleaseTask.new(spec) do |task|
  test_unit_github_io_dir_candidates = [
    "../../www/test-unit.github.io",
  ]
  test_unit_github_io_dir = test_unit_github_io_dir_candidates.find do |dir|
    File.directory?(dir)
  end
  task.index_html_dir = test_unit_github_io_dir
end

def rake(*arguments)
  ruby($0, *arguments)
end

namespace :html do
  desc "Publish HTML to Web site."
  task :publish do
    # FIXME Do nothing for now
    #rsync_to_rubyforge(spec, "#{html_base_dir}/", "")
  end
end

task :test do
  ruby("test/run-test.rb")
end
