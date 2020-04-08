require 'gelfd2/version'

module Gelfd2
  CHUNKED_MAGIC = [0x1e, 0x0f].pack('C*').freeze
  ZLIB_MAGIC = [0x78, 0x9c].pack('C*').freeze
  GZIP_MAGIC = [0x1f, 0x8b].pack('C*').freeze
  UNCOMPRESSED_MAGIC = [0x1f, 0x3c].pack('C*').freeze
  HEADER_LENGTH = 12
  DATA_LENGTH = 8192 - HEADER_LENGTH
  MAX_CHUNKS = 128
end

require File.join(File.dirname(__FILE__), 'gelfd2', 'exceptions')
require File.join(File.dirname(__FILE__), 'gelfd2', 'zlib_parser')
require File.join(File.dirname(__FILE__), 'gelfd2', 'gzip_parser')
require File.join(File.dirname(__FILE__), 'gelfd2', 'chunked_parser')
require File.join(File.dirname(__FILE__), 'gelfd2', 'parser')
