$:.unshift(File.expand_path(File.join(File.dirname(__FILE__), "..", "test")))
require 'test/unit'
require 'tc_unchunked'
require 'tc_uncompressed'
require 'tc_chunked'
