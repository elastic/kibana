require "rubygems"
require "ffi"
require "grok"

class Grok::Match < FFI::Struct
  module CGrokMatch
    extend FFI::Library
    ffi_lib "libgrok"

    attach_function :grok_match_get_named_substring,
                    [:pointer, :pointer], :pointer
    attach_function :grok_match_walk_init, [:pointer], :void
    attach_function :grok_match_walk_next,
                    [:pointer, :pointer, :pointer, :pointer, :pointer], :int
    attach_function :grok_match_walk_end, [:pointer], :void
  end

  include CGrokMatch
  layout :grok, :pointer,
         :subject, :string,
         :start, :int,
         :end, :int

  # Placeholder for the FFI::MemoryPointer that we pass to
  # grok_execn() during Grok#match; this should prevent ruby from
  # garbage collecting us until the GrokMatch goes out of scope.
  # http://code.google.com/p/logstash/issues/detail?id=47
  attr_accessor :subject_memorypointer

  public
  def initialize
    super

    @captures = nil
  end

  public
  def each_capture
    @captures = Hash.new { |h, k| h[k] = Array.new }
    grok_match_walk_init(self)
    name_ptr = FFI::MemoryPointer.new(:pointer)
    namelen_ptr = FFI::MemoryPointer.new(:int)
    data_ptr = FFI::MemoryPointer.new(:pointer)
    datalen_ptr = FFI::MemoryPointer.new(:int)
    while grok_match_walk_next(self, name_ptr, namelen_ptr, data_ptr, datalen_ptr) == Grok::GROK_OK
      namelen = namelen_ptr.read_int
      name = name_ptr.get_pointer(0).get_string(0, namelen)
      datalen = datalen_ptr.read_int
      data = data_ptr.get_pointer(0).get_string(0, datalen)
      yield name, data
    end
    grok_match_walk_end(self)
  end # def each_capture

  public
  def captures
    if @captures.nil?
      @captures = Hash.new { |h,k| h[k] = [] }
      each_capture do |key, val|
        @captures[key] << val
      end
    end
    return @captures
  end # def captures

  public
  def start
    return self[:start]
  end

  public
  def end
    return self[:end]
  end

  public
  def subject
    return self[:subject]
  end
end # Grok::Match
