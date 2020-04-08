# -*- ruby encoding: utf-8 -*-

module MIME; end
class MIME::Types; end

require 'mime/types/loader_path'

# This class is responsible for initializing the MIME::Types registry from
# the data files supplied with the mime-types library.
#
# The Loader will use one of the following paths:
# 1.  The +path+ provided in its constructor argument;
# 2.  The value of ENV['RUBY_MIME_TYPES_DATA']; or
# 3.  The value of MIME::Types::Loader::PATH.
#
# When #load is called, the +path+ will be searched recursively for all YAML
# (.yml or .yaml) files. By convention, there is one file for each media
# type (application.yml, audio.yml, etc.), but this is not required.
class MIME::Types::Loader
  # The path that will be read for the MIME::Types files.
  attr_reader :path
  # The MIME::Types container instance that will be loaded. If not provided
  # at initialization, a new MIME::Types instance will be constructed.
  attr_reader :container

  # Creates a Loader object that can be used to load MIME::Types registries
  # into memory, using YAML, JSON, or v1 registry format loaders.
  def initialize(path = nil, container = nil)
    path = path || ENV['RUBY_MIME_TYPES_DATA'] || MIME::Types::Loader::PATH
    @container = container || MIME::Types.new
    @path = File.expand_path(path)
    # begin
    #   require 'mime/lazy_types'
    #   @container.extend(MIME::LazyTypes)
    # end
  end

  # Loads a MIME::Types registry from YAML files (<tt>*.yml</tt> or
  # <tt>*.yaml</tt>) recursively found in +path+.
  #
  # It is expected that the YAML objects contained within the registry array
  # will be tagged as <tt>!ruby/object:MIME::Type</tt>.
  #
  # Note that the YAML format is about 2½ times *slower* than either the v1
  # format or the JSON format.
  #
  # NOTE: The purpose of this format is purely for maintenance reasons.
  def load_yaml
    Dir[yaml_path].sort.each do |f|
      container.add(*self.class.load_from_yaml(f), :silent)
    end
    container
  end

  # Loads a MIME::Types registry from JSON files (<tt>*.json</tt>)
  # recursively found in +path+.
  #
  # It is expected that the JSON objects will be an array of hash objects.
  # The JSON format is the registry format for the MIME types registry
  # shipped with the mime-types library.
  def load_json
    Dir[json_path].sort.each do |f|
      types = self.class.load_from_json(f)
      container.add(*types, :silent)
    end
    container
  end

  # Loads a MIME::Types registry from columnar files recursively found in
  # +path+.
  def load_columnar
    require 'mime/types/columnar' unless defined?(MIME::Types::Columnar)
    container.extend(MIME::Types::Columnar)
    container.load_base_data(path)

    container
  end

  # Loads a MIME::Types registry. Loads from JSON files by default
  # (#load_json).
  #
  # This will load from columnar files (#load_columnar) if <tt>columnar:
  # true</tt> is provided in +options+ and there are columnar files in +path+.
  def load(options = { columnar: false })
    if options[:columnar] && !Dir[columnar_path].empty?
      load_columnar
    else
      load_json
    end
  end

  # Loads a MIME::Types registry from files found in +path+ that are in the
  # v1 data format. The file search for this will exclude both JSON
  # (<tt>*.json</tt>) and YAML (<tt>*.yml</tt> or <tt>*.yaml</tt>) files.
  #
  # This method has been deprecated and will be removed from mime-types 3.0.
  def load_v1
    MIME::Types.deprecated(self.class, __method__)
    Dir[v1_path].sort.each do |f|
      next if f =~ /\.(?:ya?ml|json|column)$/
      container.add(self.class.load_from_v1(f, true), true)
    end
    container
  end

  # Raised when a V1 format file is discovered. This exception will be removed
  # for mime-types 3.0.
  BadV1Format = Class.new(Exception)

  class << self
    # Loads the default MIME::Type registry.
    def load(options = { columnar: false })
      new.load(options)
    end

    # Build the type list from a file in the format:
    #
    #   [*][!][os:]mt/st[<ws>@ext][<ws>:enc][<ws>'url-list][<ws>=docs]
    #
    # == *
    # An unofficial MIME type. This should be used if and only if the MIME type
    # is not properly specified (that is, not under either x-type or
    # vnd.name.type).
    #
    # == !
    # An obsolete MIME type. May be used with an unofficial MIME type.
    #
    # == os:
    # Platform-specific MIME type definition.
    #
    # == mt
    # The media type.
    #
    # == st
    # The media subtype.
    #
    # == <ws>@ext
    # The list of comma-separated extensions.
    #
    # == <ws>:enc
    # The encoding.
    #
    # == <ws>'url-list
    # The list of comma-separated URLs.
    #
    # == <ws>=docs
    # The documentation string.
    #
    # That is, everything except the media type and the subtype is optional. The
    # more information that's available, though, the richer the values that can
    # be provided.
    #
    # This method has been deprecated and will be removed in mime-types 3.0.
    def load_from_v1(filename, __internal__ = false)
      MIME::Types.deprecated(self.class, __method__) unless __internal__
      data = read_file(filename).split($/)
      mime = MIME::Types.new
      data.each_with_index { |line, index|
        item = line.chomp.strip
        next if item.empty?

        m = V1_FORMAT.match(item)

        unless m
          MIME::Types.logger.warn <<-EOS
#{filename}:#{index + 1}: Parsing error in v1 MIME type definition.
=> #{line}
          EOS
          fail BadV1Format, line
        end

        unregistered, obsolete, platform, mediatype, subtype, extensions,
          encoding, urls, docs, _ = *m.captures

        next if mediatype.nil?

        extensions &&= extensions.split(/,/)
        urls &&= urls.split(/,/)

        if docs.nil?
          use_instead = nil
        else
          use_instead = docs.scan(%r{use-instead:(\S+)}).flatten.first
          docs = docs.gsub(%r{use-instead:\S+}, '').squeeze(' \t')
        end

        mime_type = MIME::Type.new("#{mediatype}/#{subtype}") do |t|
          t.extensions  = extensions
          t.encoding    = encoding
          t.system      = platform
          t.obsolete    = obsolete
          t.registered  = false if unregistered
          t.use_instead = use_instead
          t.docs        = docs

          # This is being removed. Cheat to silence it for now.
          t.instance_variable_set :@references,
                                  Array(urls).flatten.compact.uniq
        end

        mime.add_type(mime_type, true)
      }
      mime
    end

    # Loads MIME::Types from a single YAML file.
    #
    # It is expected that the YAML objects contained within the registry
    # array will be tagged as <tt>!ruby/object:MIME::Type</tt>.
    #
    # Note that the YAML format is about 2½ times *slower* than either the v1
    # format or the JSON format.
    #
    # NOTE: The purpose of this format is purely for maintenance reasons.
    def load_from_yaml(filename)
      begin
        require 'psych'
      rescue LoadError
        nil
      end
      require 'yaml'
      YAML.load(read_file(filename))
    end

    # Loads MIME::Types from a single JSON file.
    #
    # It is expected that the JSON objects will be an array of hash objects.
    # The JSON format is the registry format for the MIME types registry
    # shipped with the mime-types library.
    def load_from_json(filename)
      require 'json'
      JSON.parse(read_file(filename)).map { |type| MIME::Type.new(type) }
    end

    private

    def read_file(filename)
      File.open(filename, 'r:UTF-8:-') { |f| f.read }
    end
  end

  private

  def yaml_path
    File.join(path, '*.y{,a}ml')
  end

  def json_path
    File.join(path, '*.json')
  end

  def columnar_path
    File.join(path, '*.column')
  end

  def v1_path
    File.join(path, '*')
  end

  # The regular expression used to match a v1-format file-based MIME type
  # definition.
  #
  # This constant has been deprecated and will be removed in mime-types 3.0.
  V1_FORMAT = # :nodoc:
    %r{\A\s*
    ([*])?                                        # 0:    Unregistered?
    (!)?                                          # 1:    Obsolete?
    (?:(\w+):)?                                   # 2:    Platform marker
    ([-\w.+]+)/([-\w.+]*)                         # 3, 4: Media Type
    (?:\s+@(\S+))?                                # 5:    Extensions
    (?:\s+:(base64|7bit|8bit|quoted\-printable))? # 6:    Encoding
    (?:\s+'(\S+))?                                # 7:    URL list
    (?:\s+=(.+))?                                 # 8:    Documentation
    (?:\s*([#].*)?)?                              #       Comments
    \s*
    \z
    }x

  private_constant :V1_FORMAT if respond_to? :private_constant
end
