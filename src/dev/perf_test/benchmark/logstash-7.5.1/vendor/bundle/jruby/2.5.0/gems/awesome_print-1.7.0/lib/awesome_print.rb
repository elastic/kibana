# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
#
# AwesomePrint might be loaded implicitly through ~/.irbrc or ~/.pryrc
# so do nothing for subsequent requires.
#
unless defined?(AwesomePrint::Inspector)
  %w(array string method object class kernel).each do |file|
    require File.dirname(__FILE__) + "/awesome_print/core_ext/#{file}"
  end

  require File.dirname(__FILE__) + "/awesome_print/inspector"
  require File.dirname(__FILE__) + "/awesome_print/formatter"
  require File.dirname(__FILE__) + "/awesome_print/version"
  require File.dirname(__FILE__) + "/awesome_print/core_ext/logger" if defined?(Logger)
  #
  # Load the following under normal circumstances as well as in Rails
  # console when required from ~/.irbrc or ~/.pryrc.
  #
  require File.dirname(__FILE__) + "/awesome_print/ext/active_record"  if defined?(ActiveRecord)  || AwesomePrint.rails_console?
  require File.dirname(__FILE__) + "/awesome_print/ext/active_support" if defined?(ActiveSupport) || AwesomePrint.rails_console?
  #
  # Load remaining extensions.
  #
  if defined?(ActiveSupport.on_load)
    ActiveSupport.on_load(:action_view) do
      require File.dirname(__FILE__) + "/awesome_print/ext/action_view"
    end
  end
  require File.dirname(__FILE__) + "/awesome_print/ext/mongo_mapper"   if defined?(MongoMapper)
  require File.dirname(__FILE__) + "/awesome_print/ext/mongoid"        if defined?(Mongoid)
  require File.dirname(__FILE__) + "/awesome_print/ext/nokogiri"       if defined?(Nokogiri)
  require File.dirname(__FILE__) + "/awesome_print/ext/nobrainer"      if defined?(NoBrainer)
  require File.dirname(__FILE__) + "/awesome_print/ext/ripple"         if defined?(Ripple)
  require File.dirname(__FILE__) + "/awesome_print/ext/sequel"         if defined?(Sequel)
  require File.dirname(__FILE__) + "/awesome_print/ext/ostruct"        if defined?(OpenStruct)
end
