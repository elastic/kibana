require File.expand_path(File.join(File.dirname(__FILE__), "..", "namespace"))
require File.join(File.dirname(__FILE__), "tag")
require "cabin"

class RPM::File::Header
  include Cabin::Inspectable
  attr_reader :tags
  attr_reader :length

  attr_accessor :magic  # 8-byte string magic
  attr_accessor :index_count  # rpmlib calls this field 'il' unhelpfully
  attr_accessor :data_length  # rpmlib calls this field 'dl' unhelpfully

  HEADER_SIGNED_TYPE = 5
  
  if RUBY_VERSION =~ /^2\./
    # Ruby 2 forces all strings to be UTF-8, so "\x01" becomes "\u0001"
    # which is two bytes 00 01 which is not what we want. I can't find
    # a sane way to create a string without this madness in Ruby 2,
    # so let's just pack two 4-byte integers and go about our day.
    HEADER_MAGIC = [0x8eade801, 0x00000000].pack("NN")
  else
    HEADER_MAGIC = "\x8e\xad\xe8\x01\x00\x00\x00\x00"
  end
  # magic + index_count + data_length
  HEADER_HEADER_LENGTH = HEADER_MAGIC.length + 4 + 4
  TAG_ENTRY_SIZE = 16 # tag id, type, offset, count == 16 bytes

  def initialize(file)
    @file = file

    @inspectables = [:@length, :@index_count, :@data_length]
    @tags = []
  end

  def read
    # TODO(sissel): update the comments here to reflect learnings about rpm
    # internals
    # At this point assume we've read and consumed the lead and signature.
    #len = @rpm.signature.index_length + @rpm.signature
    #
    # header size is
    #     ( @rpm.signature.index_length * size of a header entry )
    #     + @rpm.signature.data_length
    #
    # header 'entries' are an
    #   int32 (tag id), int32 (tag type), int32  (offset), uint32 (count)
    #
    #       len = sizeof(il) + sizeof(dl) + (il * sizeof(struct entryInfo_s)) + dl;
    # See rpm's header.c, the headerLoad method function for reference.

    # Header always starts with HEADER_MAGIC + index_count(2bytes) +
    # data_length(2bytes)
    data = @file.read(HEADER_HEADER_LENGTH).unpack("a8NN")
    # TODO(sissel): @index_count is really a count, rename?
    @magic, @index_count, @data_length = data
    validate
    
    @index_size = @index_count * TAG_ENTRY_SIZE
    tag_data = @file.read(@index_size)
    data = @file.read(@data_length)

    (0 ... @index_count).each do |i|
      offset = i * TAG_ENTRY_SIZE
      entry_data = tag_data[i * TAG_ENTRY_SIZE, TAG_ENTRY_SIZE]
      entry = entry_data.unpack("NNNN")
      entry << data
      tag = ::RPM::File::Tag.new(*entry)
      @tags << tag
    end # each index

    @length = HEADER_HEADER_LENGTH + @index_size + @data_length
  end # def read

  def write
    raise "not implemented yet"
    # Sort tags by type (integer value)
    # emit all tags in order
    # then emit all data segments in same order
  end # def write

  def validate
    # TODO(sissel): raise real exceptions
    if @magic != ::RPM::File::Header::HEADER_MAGIC
      raise "Header magic did not match; got #{@magic.inspect}, " \
            "expected #{::RPM::File::Header::HEADER_MAGIC.inspect}"
    end

    #if !(0..32).include?(@index_count)
      #raise "Invalid 'index_count' value #{@index_count}, expected to be in range [0..32]"
    #end

    #if !(0..8192).include?(@data_length)
      #raise "Invalid 'data_length' value #{@data_length}, expected to be in range [0..8192]"
    #end
  end # def validate

end # class RPM::File::Header
