# encoding: utf-8
require "gems"

# This patch is necessary to avoid encoding problems when Net:HTTP return stuff in ASCII format, but
# consumer libraries, like the YAML parsers expect them to be in UTF-8. As we're using UTF-8 everywhere
# and the usage of versions is minimal in our codebase, the patch is done here. If extended usage of this
# is done in the feature, more proper fix should be implemented, including the creation of our own lib for
# this tasks.
module Gems
  module Request
    def get(path, data = {}, content_type = 'application/x-www-form-urlencoded', request_host = host)
      request(:get, path, data, content_type, request_host).force_encoding("UTF-8")
    end
  end
end

