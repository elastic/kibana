# -*- ruby encoding: utf-8 -*-

require 'mime/type'
require 'fileutils'

gem 'minitest'
require 'minitest/autorun'
require 'minitest/focus'

module Minitest::MIMEDeprecated
  def assert_deprecated name, message = 'and will be removed'
    name = Regexp.escape(name)
    message = Regexp.escape(message)

    assert_output nil, /#{name} is deprecated #{message}./ do
      yield
    end
  end

  Minitest::Test.send(:include, self)
end
