module Snappy
  class Reader
    attr_reader :io, :magic, :default_version, :minimum_compatible_version

    def initialize(io)
      @io = io
      @io.set_encoding Encoding::ASCII_8BIT unless RUBY_VERSION =~ /^1\.8/
      read_header!
      yield self if block_given?
    end

    def each
      until @io.eof?
        if @chunked
          size = @io.read(4).unpack('N').first
          yield Snappy.inflate(@io.read(size)) if block_given?
        else
          yield Snappy.inflate @io.read if block_given?
        end
      end
    end

    def read
      @buff = StringIO.new
      each do |chunk|
        @buff << chunk
      end
      @buff.string
    end

    def each_line(sep_string=$/)
      last = ""
      each do |chunk|
        chunk = last + chunk
        lines = chunk.split(sep_string)
        last = lines.pop
        lines.each do |line|
          yield line if block_given?
        end
      end
      yield last
    end

    private

    def read_header!
      header = @io.read Snappy::Writer::MAGIC.length
      if header.length == Snappy::Writer::MAGIC.length && header == Snappy::Writer::MAGIC
        @magic, @default_version, @minimum_compatible_version = header, *@io.read(8).unpack('NN')
        @chunked = true
      else
        @io.rewind
        @chunked = false
      end
    end
  end
end
