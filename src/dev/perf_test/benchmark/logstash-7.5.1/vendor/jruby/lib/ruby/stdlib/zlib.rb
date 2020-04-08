# Load built-in zlib library
JRuby::Util.load_ext("org.jruby.ext.zlib.ZlibLibrary")

require 'stringio'

module Zlib
  def self.gzip(src, opts = nil)
    if Hash === opts
      level = opts[:level]
      strategy = opts[:strategy]
    end
    io = StringIO.new("".force_encoding("ASCII-8BIT"))
    GzipWriter.new(io, level, strategy) do |writer|
      writer.write(src)
    end
    io.string
  end

  def self.gunzip(src)
    io = StringIO.new(src)
    reader = GzipReader.new(io)
    result = reader.read
    reader.close
    result
  end
end