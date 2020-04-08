require 'mime/type'

# A version of MIME::Type that works hand-in-hand with a MIME::Types::Columnar
# container to load data by columns.
#
# When a field is has not yet been loaded, that data will be loaded for all
# types in the container before forwarding the message to MIME::Type.
#
# More information can be found in MIME::Types::Columnar.
#
# MIME::Type::Columnar is *not* intended to be created except by
# MIME::Types::Columnar containers.
class MIME::Type::Columnar < MIME::Type
  attr_writer :friendly # :nodoc:

  def initialize(container, content_type, extensions) # :nodoc:
    @container = container
    self.content_type = content_type
    self.extensions = extensions
  end

  def friendly(*) # :nodoc:
    @container.send(:load_friendly) unless defined?(@friendly)
    super if @friendly
  end

  def encoding # :nodoc:
    @container.send(:load_encoding) unless defined?(@encoding)
    @encoding
  end

  def docs # :nodoc:
    @container.send(:load_docs) unless defined?(@docs)
    @docs
  end

  def obsolete? # :nodoc:
    @container.send(:load_obsolete) unless defined?(@obsolete)
    super
  end

  def references(*) # :nodoc:
    @container.send(:load_references) unless defined?(@references)
    super if @references
  end

  def registered? # :nodoc:
    @container.send(:load_registered) unless defined?(@registered)
    super
  end

  def signature? # :nodoc:
    @container.send(:load_signature) unless defined?(@signature)
    super
  end

  def system?(*) # :nodoc:
    @container.send(:load_system) unless defined?(@system)
    super
  end

  def system # :nodoc:
    @container.send(:load_system) unless defined?(@system)
    @system
  end

  def xrefs # :nodoc:
    @container.send(:load_xrefs) unless defined?(@xrefs)
    @xrefs
  end

  def use_instead # :nodoc:
    @container.send(:load_use_instead) unless defined?(@use_instead)
    @use_instead
  end

  def binary? # :nodoc:
    @container.send(:load_encoding) unless defined?(@encoding)
    super
  end

  def to_a # :nodoc:
    @container.send(:load_encoding) unless defined?(@encoding)
    @container.send(:load_system) unless defined?(@system)
    @container.send(:load_docs) unless defined?(@docs)
    @container.send(:load_references) unless defined?(@references)
    super
  end

  def to_hash # :nodoc:
    @container.send(:load_encoding) unless defined?(@encoding)
    @container.send(:load_system) unless defined?(@system)
    @container.send(:load_docs) unless defined?(@docs)
    @container.send(:load_references) unless defined?(@references)
    super
  end

  def encode_with(coder) # :nodoc:
    @container.send(:load_friendly) unless defined?(@friendly)
    @container.send(:load_encoding) unless defined?(@encoding)
    @container.send(:load_system) unless defined?(@system)
    @container.send(:load_docs) unless defined?(@docs)
    @container.send(:load_references) unless defined?(@references)
    @container.send(:load_obsolete) unless defined?(@obsolete)
    @container.send(:load_use_instead) unless defined?(@use_instead)
    @container.send(:load_xrefs) unless defined?(@xrefs)
    @container.send(:load_system) unless defined?(@system)
    @container.send(:load_registered) unless defined?(@registered)
    @container.send(:load_signature) unless defined?(@signature)
    super
  end
end
