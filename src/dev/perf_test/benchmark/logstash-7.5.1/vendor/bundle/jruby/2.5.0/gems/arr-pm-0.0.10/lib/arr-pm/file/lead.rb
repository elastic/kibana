require File.expand_path(File.join(File.dirname(__FILE__), "..", "namespace"))
require "cabin"

class RPM::File::Lead
  include Cabin::Inspectable

  #struct rpmlead {
  attr_accessor :magic #unsigned char magic[4];
  attr_accessor :major #unsigned char major;
  attr_accessor :minor #unsigned char minor;
  attr_accessor :type  #short type;
  attr_accessor :archnum #short archnum;
  attr_accessor :name #char name[66];
  attr_accessor :osnum #short osnum;
  attr_accessor :signature_type #short signature_type;
  attr_accessor :reserved #char reserved[16];
  #}
  
  attr_accessor :length

  def initialize(file)
    @file = file
    @inspectables = [:@major, :@minor, :@length, :@type, :@archnum, :@signature_type, :@reserved, :@osnum]
  end

  def type
    case @type
      when 0
        return :binary
      when 1
        return :source
      else
        raise "Unknown package 'type' value #{@type}"
    end
  end # def type

  def read
    # Use 'A' here instead of 'a' to trim nulls.
    @length = 96
    data = @file.read(@length).unpack("A4CCnnA66nnA16")
    @magic, @major, @minor, @type, @archnum, @name, \
      @osnum, @signature_type, @reserved = data

    return nil
  end # def read

  def write(file)
    data = [ @magic, @major, @minor, @type, @archnum, @name, \
             @osnum, @signature_type, @reserved ].pack("a4CCnna66nna16")
    file.write(data)
  end # def write
end # class RPM::File::Lead
