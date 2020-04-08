module MIME
  class Types
  end
end

require 'mime/type/columnar'

# MIME::Types::Columnar is used to extend a MIME::Types container to load data
# by columns instead of from JSON or YAML. Column loads of MIME types loaded
# through the columnar store are synchronized with a Mutex.
#
# MIME::Types::Columnar is not intended to be used directly, but will be added
# to an instance of MIME::Types when it is loaded with
# MIME::Types::Loader#load_columnar.
module MIME::Types::Columnar
  LOAD_MUTEX = Mutex.new # :nodoc:

  def self.extended(obj) # :nodoc:
    super
    obj.instance_variable_set(:@__mime_data__, [])
    obj.instance_variable_set(:@__attributes__, [])
  end

  # Load the first column data file (type and extensions).
  def load_base_data(path) #:nodoc:
    @__root__ = path

    each_file_line('content_type', false) do |line|
      content_type, *extensions = line.split

      type = MIME::Type::Columnar.new(self, content_type, extensions)
      @__mime_data__ << type
      add(type)
    end

    self
  end

  private

  def each_file_line(name, lookup = true)
    LOAD_MUTEX.synchronize do
      next if @__attributes__.include?(name)

      File.open(File.join(@__root__, "mime.#{name}.column"), 'r:UTF-8') do |f|
        i = -1

        f.each_line do |line|
          line.chomp!

          if lookup
            type = @__mime_data__[i += 1] or next
            yield type, line
          else
            yield line
          end
        end
      end

      @__attributes__ << name
    end
  end

  def load_encoding
    pool = {}
    each_file_line('encoding') do |type, line|
      line.freeze
      type.encoding = (pool[line] ||= line)
    end
  end

  def load_docs
    each_file_line('docs') do |type, line|
      type.docs = arr(line)
    end
  end

  def load_obsolete
    each_file_line('obsolete') do |type, line|
      type.obsolete = bool(line)
    end
  end

  def load_references
    each_file_line('references') do |type, line|
      type.instance_variable_set(:@references, arr(line))
    end
  end

  def load_registered
    each_file_line('registered') do |type, line|
      type.registered = bool(line)
    end
  end

  def load_signature
    each_file_line('signature') do |type, line|
      type.signature = bool(line)
    end
  end

  def load_system
    each_file_line('system') do |type, line|
      type.system = (line unless line == '-'.freeze)
    end
  end

  def load_xrefs
    each_file_line('xrefs') { |type, line| type.xrefs = dict(line) }
  end

  def load_friendly
    each_file_line('friendly') { |type, line|
      v = dict(line)
      type.friendly = v.empty? ? nil : v
    }
  end

  def load_use_instead
    each_file_line('use_instead') do |type, line|
      type.use_instead = (line unless line == '-'.freeze)
    end
  end

  def dict(line)
    if line == '-'.freeze
      {}
    else
      line.split('|'.freeze).each_with_object({}) { |l, h|
        k, v = l.split('^'.freeze)
        v = [ nil ] if v.empty?
        h[k] = v
      }
    end
  end

  def arr(line)
    if line == '-'.freeze
      []
    else
      line.split('|'.freeze).flatten.compact.uniq
    end
  end

  def bool(line)
    line == '1'.freeze ? true : false
  end
end

unless MIME::Types.private_method_defined?(:load_mode)
  class << MIME::Types
    private

    def load_mode
      { columnar: true }
    end
  end

  require 'mime/types'
end
