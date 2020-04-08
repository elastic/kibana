# frozen_string_literal: true
# This file allows for the running of rubygems with a nice
# command line look-and-feel: ruby -rubygems foo.rb
#--
# Copyright 2006 by Chad Fowler, Rich Kilmer, Jim Weirich and others.
# All rights reserved.
# See LICENSE.txt for permissions.
#++

# TODO: Remove this file at RubyGems 4.0
# Based by https://bugs.ruby-lang.org/issues/14322#note-4
warn "`ubygems.rb' is deprecated, and will be removed on or after 2018-12-01. Remove `-rubygems' from your command-line, or use `-r rubygems' instead"

require 'rubygems'
