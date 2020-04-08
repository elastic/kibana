require "rubygems"
require "ffi"

# TODO(sissel): Check if 'grok-pure' has been loaded and abort?
class Grok < FFI::Struct
  module CGrok
    extend FFI::Library
    ffi_lib "libgrok"

    attach_function :grok_new, [], :pointer
    attach_function :grok_compilen, [:pointer, :pointer, :int], :int
    attach_function :grok_pattern_add,
                    [:pointer, :pointer, :int, :pointer, :int], :int
    attach_function :grok_patterns_import_from_file, [:pointer, :pointer], :int
    attach_function :grok_execn, [:pointer, :pointer, :int, :pointer], :int
  end

  include CGrok
  layout :pattern, :string,
         :pattern_len, :int,
         :full_pattern, :string,
         :full_pattern_len, :int,
         :__patterns, :pointer, # TCTREE*, technically
         :__re, :pointer, # pcre*
         :__pcre_capture_vector, :pointer, # int*
         :__pcre_num_captures, :int,
         :__captures_by_id, :pointer, # TCTREE*
         :__captures_by_name, :pointer, # TCTREE*
         :__captures_by_subname, :pointer, # TCTREE*
         :__captures_by_capture_number, :pointer, # TCTREE*
         :__max_capture_num, :int,
         :pcre_errptr, :string,
         :pcre_erroffset, :int,
         :pcre_errno, :int,
         :logmask, :uint,
         :logdepth, :uint,
         :errstr, :string

  GROK_OK = 0
  GROK_ERROR_FILE_NOT_ACCESSIBLE = 1
  GROK_ERROR_PATTERN_NOT_FOUND = 2
  GROK_ERROR_UNEXPECTED_READ_SIZE = 3
  GROK_ERROR_COMPILE_FAILED = 4
  GROK_ERROR_UNINITIALIZED = 5
  GROK_ERROR_PCRE_ERROR = 6
  GROK_ERROR_NOMATCH = 7

  public
  def initialize
    super(grok_new)
  end

  public
  def add_pattern(name, pattern)
    name_c = FFI::MemoryPointer.from_string(name)
    pattern_c = FFI::MemoryPointer.from_string(pattern)
    grok_pattern_add(self, name_c, name.length, pattern_c, pattern.length)
    return nil
  end

  public
  def add_patterns_from_file(path)
    path_c = FFI::MemoryPointer.from_string(path)
    ret = grok_patterns_import_from_file(self, path_c)
    if ret != GROK_OK
      raise ArgumentError, "Failed to add patterns from file #{path}"
    end
    return nil
  end

  public
  def pattern
    return self[:pattern]
  end

  public
  def expanded_pattern
    return self[:full_pattern]
  end

  public
  def compile(pattern)
    pattern_c = FFI::MemoryPointer.from_string(pattern)
    ret = grok_compilen(self, pattern_c, pattern.length)
    if ret != GROK_OK
      raise ArgumentError, "Compile failed: #{self[:errstr]})"
    end
    return ret
  end

  public
  def match(text)
    match = Grok::Match.new
    text_c = FFI::MemoryPointer.from_string(text)
    rc = grok_execn(self, text_c, text.size, match)
    case rc
    when GROK_OK
      # Give the Grok::Match object a reference to the 'text_c'
      # object which is also Grok::Match#subject string;
      # this will prevent Ruby from garbage collecting it until
      # the match object is garbage collectd.
      #
      # If we don't do this, then 'text_c' will fall out of
      # scope at the end of this function and become a candidate
      # for garbage collection, causing Grok::Match#subject to become
      # corrupt and any captures to point to those corrupt portions.
      # http://code.google.com/p/logstash/issues/detail?id=47
      match.subject_memorypointer = text_c

      return match
    when GROK_ERROR_NOMATCH
      return false
    end

    raise ValueError, "unknown return from grok_execn: #{rc}"
  end

  public
  def discover(input)
    init_discover if @discover == nil

    return @discover.discover(input)
  end

  private
  def init_discover
    @discover = GrokDiscover.new(self)
    @discover.logmask = logmask
  end
end # Grok

require "grok/c-ext/match"
require "grok/c-ext/pile"
