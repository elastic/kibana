# encoding: utf-8
require "bundler"
require "rake"
require "rake/tasklib"
require "fileutils"
require "net/http"
require "paquet/gem"

# This class add new rake methods to a an existing ruby gem,
# these methods allow developpers to create a Uber gem, a uber gem is
# a tarball that contains the current gems and one or more of his dependencies.
#
# This Tool will take care of looking at the current dependency tree defined in the Gemspec and the gemfile
# and will traverse all graph and download the gem file into a specified directory.
#
# By default, the tool wont fetch everything and the developper need to declare what gems he want to download.
module Paquet
  class Task < Rake::TaskLib
    def initialize(target_path, cache_path = nil, &block)
      @gem = Gem.new(target_path, cache_path)

      instance_eval(&block)

      namespace :paquet do
        desc "Build a pack with #{@gem.size} gems: #{@gem.gems.join(",")}"
        task :vendor do
          @gem.pack
        end
      end
    end

    def pack(name)
      @gem.add(name)
    end

    def ignore(name)
      @gem.ignore(name)
    end
  end
end
