require 'convert'

class Convert::Columnar < Convert
  class << self
    # Converts from YAML to Columnar format. This *always* converts to multiple
    # files.
    def from_yaml_to_columnar(args)
      from_yaml(yaml_path(args.source)).
        to_columnar(destination: columnar_path(args.destination))
    end

    private

    def columnar_path(path)
      path_or_default(path, 'data')
    end
  end

  # Convert the data to multiple text files.
  def to_columnar(options = {})
    root = options[:destination] or require_destination!
    @root = must_be_directory!(root)
    @data = @loader.container.sort.map(&:to_h)

    column_file('content_type') do |type|
      [ type['content-type'], Array(type['extensions']).join(' ') ].
        flatten.join(' ').strip
    end

    required_file('encoding')
    optional_file('docs')
    optional_file('system')
    bool_file('obsolete')
    bool_file('registered')
    bool_file('signature')
    array_file('references')
    dict_file('xrefs')
    dict_file('friendly')
    optional_file('use_instead', 'use-instead')
  end

  def column_file(name, &block)
    File.open(File.join(@root, "mime.#{name}.column"), 'wb') do |f|
      f.puts @data.map(&block)
    end
  end

  def bool_file(name, *fields)
    fields = [ name ] if fields.empty?
    column_file(name) do |type|
      fields.map { |field|
        type[field] ? 1 : 0
      }.join(' ')
    end
  end

  def required_file(name, field = name)
    column_file(name) { |type| type[field] }
  end

  def optional_file(name, field = name)
    column_file(name) { |type| opt(type[field]) }
  end

  def array_file(name, field = name)
    column_file(name) { |type| arr(type[field]) }
  end

  def dict_file(name, field = name)
    column_file(name) { |type| dict(type[field]) }
  end

  def opt(value)
    value || '-'
  end

  def arr(value)
    Array(opt(value)).join('|')
  end

  def dict(value)
    if value
      value.sort.map { |k, v|
        [ k, Array(v).compact.join('^') ].join('^')
      }.join('|')
    else
      '-'
    end
  end
end
