require File.join(File.dirname(__FILE__), "namespace")
require File.join(File.dirname(__FILE__), "file", "header")
require File.join(File.dirname(__FILE__), "file", "lead")
require File.join(File.dirname(__FILE__), "file", "tag")
require "fcntl"

# Much of the code here is derived from knowledge gained by reading the rpm
# source code, but mostly it started making more sense after reading this site:
# http://www.rpm.org/max-rpm/s1-rpm-file-format-rpm-file-format.html

class RPM::File
  attr_reader :file

  FLAG_LESS = (1 << 1)    #     RPMSENSE_LESS = (1 << 1),
  FLAG_GREATER = (1 << 2) #     RPMSENSE_GREATER  = (1 << 2),
  FLAG_EQUAL = (1 << 3)   #     RPMSENSE_EQUAL  = (1 << 3),

  # from rpm/rpmfi.h
  FLAG_CONFIG_FILE = (1 << 0) # RPMFILE_CONFIG = (1 << 0)

  def initialize(file)
    if file.is_a?(String)
      file = File.new(file, "r")
    end
    @file = file
  end # def initialize

  # Return the lead for this rpm
  #
  # This 'lead' structure is almost entirely deprecated in the RPM file format.
  def lead
    if @lead.nil?
      # Make sure we're at the beginning of the file.
      @file.seek(0, IO::SEEK_SET)
      @lead = ::RPM::File::Lead.new(@file)

      # TODO(sissel): have 'read' return number of bytes read?
      @lead.read
    end
    return @lead
  end # def lead

  # Return the signature header for this rpm
  def signature
    lead # Make sure we've parsed the lead...

    # If signature_type is not 5 (HEADER_SIGNED_TYPE), no signature.
    if @lead.signature_type != Header::HEADER_SIGNED_TYPE
      @signature = false
      return
    end

    if @signature.nil?
      @signature = ::RPM::File::Header.new(@file)
      @signature.read

      # signature headers are padded up to an 8-byte boundar, details here:
      # http://rpm.org/gitweb?p=rpm.git;a=blob;f=lib/signature.c;h=63e59c00f255a538e48cbc8b0cf3b9bd4a4dbd56;hb=HEAD#l204
      # Throw away the pad.
      @file.read(@signature.length % 8)
    end

    return @signature
  end # def signature

  # Return the header for this rpm.
  def header
    signature

    if @header.nil?
      @header = ::RPM::File::Header.new(@file)
      @header.read
    end
    return @header
  end # def header

  # Returns a file descriptor for the payload. On first invocation, it seeks to
  # the start of the payload
  def payload
    header
    if @payload.nil?
      @payload = @file.clone
      # The payload starts after the lead, signature, and header. Remember the signature has an
      # 8-byte boundary-rounding.
    end

    @payload.seek(@lead.length + @signature.length + @signature.length % 8 + @header.length, IO::SEEK_SET)
    return @payload
  end # def payload

  # Extract this RPM to a target directory.
  #
  # This should have roughly the same effect as:
  # 
  #   % rpm2cpio blah.rpm | (cd {target}; cpio -i --make-directories)
  def extract(target)
    if !File.directory?(target)
      raise Errno::ENOENT.new(target)
    end
    
    extractor = IO.popen("#{tags[:payloadcompressor]} -d | (cd #{target}; cpio -i --quiet --make-directories)", "w")
    buffer = ""
    begin
        buffer.force_encoding("BINARY")
    rescue NoMethodError
        # Do Nothing
    end
    payload_fd = payload.clone
    loop do
      data = payload_fd.read(16384, buffer)
      break if data.nil? # eof
      extractor.write(data)
    end
    payload_fd.close
    extractor.close
  end # def extract

  def tags
    if @tags.nil?
      @tags = {}
      header.tags.each do |tag|
        tags[tag.tag] = tag.value
      end
    end
    @tags
  end # def taghash

  # Get all relations of a given type to this package.
  #
  # Examples:
  #
  #     rpm.relation(:require)
  #     rpm.relation(:conflict)
  #     rpm.relation(:provide)
  #
  # In the return array-of-arrays, the elements are:
  # [ name (string), operator (string), version (string) ]
  #
  # operator will be ">=", ">", "=", "<", or "<="
  #
  # @return Array of [name, operator, version]
  def relation(type)
    name = "#{type}name".to_sym
    flags = "#{type}flags".to_sym
    version = "#{type}version".to_sym
    # There is no data if we are missing all 3 tag types (name/flags/version)
    # FYI: 'tags.keys' is an array, Array#& does set intersection. 
    return [] if (tags.keys & [name, flags, version]).size != 3
    # Find tags <type>name, <type>flags, and <type>version, and return
    # an array of "name operator version"
    return tags[name].zip(tags[flags], tags[version]) \
      .reduce([]) { |memo, (n,o,v)| memo << [n, operator(o), v] }
  end # def relation

  # Get an array of requires defined in this package.
  #
  # @return Array of [ [name, operator, version], ... ]
  def requires
    return relation(:require)
  end # def requires

  # Get an array of conflicts defined in this package.
  #
  # @return Array of [ [name, operator, version], ... ]
  def conflicts
    return relation(:conflict)
  end # def conflicts

  # Get an array of provides defined in this package.
  #
  # @return Array of [ [name, operator, version], ... ]
  def provides
    return relation(:provide)
  end # def provides

  # Get an array of config files
  def config_files
    # this stuff seems to be in the 'enum rpmfileAttrs_e' from rpm/rpmfi.h
    results = []
    # short-circuit if there's no :fileflags tag
    return results unless tags.include?(:fileflags)
    tags[:fileflags].each_with_index do |flag, i|
      # The :fileflags (and other :file... tags) are an array, in order of
      # files in the rpm payload, we want a list of paths of config files.
      results << files[i] if mask?(flag, FLAG_CONFIG_FILE)
    end
    return results
  end # def config_files

  # List the files in this RPM.
  #
  # This should have roughly the same effect as:
  # 
  #   % rpm2cpio blah.rpm | cpio -it
  def files
    return @files unless @files.nil?

    lister = IO.popen("#{tags[:payloadcompressor]} -d | cpio -it --quiet", "r+")
    buffer = ""
    begin
        buffer.force_encoding("BINARY")
    rescue NoMethodError
        # Do Nothing
    end
    payload_fd = payload.clone
    output = ""
    loop do
      data = payload_fd.read(16384, buffer)
      break if data.nil? # listerextractor.write(data)
      lister.write(data)

      # Read output from the pipe.
      begin
        output << lister.read_nonblock(16384)
      rescue Errno::EAGAIN
        # Nothing to read, move on!
      end
    end
    lister.close_write

    # Read remaining output
    begin
      output << lister.read
    rescue Errno::EAGAIN
      # Because read_nonblock enables NONBLOCK the 'lister' fd,
      # and we may have invoked a read *before* cpio has started
      # writing, let's keep retrying this read until we get an EOF
      retry
    rescue EOFError
      # At EOF, hurray! We're done reading.
    end

    # Split output by newline and strip leading "."
    @files = output.split("\n").collect { |s| s.gsub(/^\./, "") }
    return @files
  ensure
    lister.close unless lister.nil?
    payload_fd.close unless payload_fd.nil?
  end # def files

  def mask?(value, mask)
    return (value & mask) == mask
  end # def mask?

  def operator(flag)
    return "<=" if mask?(flag, FLAG_LESS | FLAG_EQUAL)
    return ">=" if mask?(flag, FLAG_GREATER | FLAG_EQUAL)
    return "=" if mask?(flag, FLAG_EQUAL)
    return "<" if mask?(flag, FLAG_LESS)
    return ">" if mask?(flag, FLAG_GREATER)
  end # def operator

  public(:extract, :payload, :header, :lead, :signature, :initialize, :requires, :conflicts, :provides)
end # class RPM::File
