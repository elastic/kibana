# -*- ruby encoding: utf-8 -*-

$LOAD_PATH.unshift File.expand_path('../../lib', __FILE__)
ENV['RUBY_MIME_TYPES_LAZY_LOAD'] = 'true'
require 'mime/types'
require 'fileutils'
require 'json'

class MIME::Types
  def self.deprecated(*_args, &_block)
    # We are an internal tool. Silence deprecation warnings.
  end
end

class Convert
  class << self
    # Create a Convert instance that converts from YAML.
    def from_yaml(path = nil)
      new(path: path, from: :yaml)
    end

    # Create a Convert instance that converts from JSON.
    def from_json(path = nil)
      new(path: path, from: :json)
    end

    # Create a Convert instance that converts from the mime-types 1.x file
    # format.
    def from_v1(path = nil)
      new(path: path, from: :v1)
    end

    # Converts from YAML to JSON. Defaults to converting to a single file.
    def from_yaml_to_json(args)
      from_yaml(yaml_path(args.source)).
        to_json(
          destination:    json_path(args.destination),
          multiple_files: multiple_files(args.multiple_files || 'single')
        )
    end

    # Converts from JSON to YAML. Defaults to converting to multiple files.
    def from_json_to_yaml(args)
      from_json(json_path(args.source)).
        to_yaml(
          destination:    yaml_path(args.destination),
          multiple_files: multiple_files(args.multiple_files || 'multiple')
        )
    end

    private :new

    private

    def yaml_path(path)
      path_or_default(path, 'type-lists'.freeze)
    end

    def json_path(path)
      path_or_default(path, 'data'.freeze)
    end

    def path_or_default(path, default)
      if path.nil? or path.empty?
        default
      else
        path
      end
    end

    def multiple_files(flag)
      case flag.to_s.downcase
      when 'true', 'yes', 'multiple'
        true
      else
        false
      end
    end
  end

  def initialize(options = {})
    if options[:path].nil? or options[:path].empty?
      fail ArgumentError, ':path is required'
    elsif options[:from].nil? or options[:from].empty?
      fail ArgumentError, ':from is required'
    end

    @loader = MIME::Types::Loader.new(options[:path])
    load_from(options[:from])
  end

  # Convert the data to JSON.
  def to_json(options = {})
    options[:destination] or require_destination!
    write_types(options.merge(format: :json))
  end

  # Convert the data to YAML.
  def to_yaml(options = {})
    options[:destination] or require_destination!
    write_types(options.merge(format: :yaml))
  end

  private

  def load_from(source_type)
    method = :"load_#{source_type}"
    @loader.send(method)
  end

  def write_types(options)
    if options[:multiple_files]
      write_multiple_files(options)
    else
      write_one_file(options)
    end
  end

  def write_one_file(options)
    d = options[:destination]
    d = File.join(d, "mime-types.#{options[:format]}") if File.directory?(d)

    File.open(d, 'wb') { |f|
      f.puts convert(@loader.container.map.sort, options[:format])
    }
  end

  def write_multiple_files(options)
    d = options[:destination]
    must_be_directory!(d)

    media_types = MIME::Types.map(&:media_type).uniq
    media_types.each { |media_type|
      n = File.join(d, "#{media_type}.#{options[:format]}")
      t = @loader.container.select { |e| e.media_type == media_type }
      File.open(n, 'wb') { |f|
        f.puts convert(t.sort, options[:format])
      }
    }
  end

  def convert(data, format)
    data.send(:"to_#{format}")
  end

  def require_destination!
    fail ArgumentError, 'Destination path is required.'
  end

  def must_be_directory!(path)
    if File.exist?(path) and !File.directory?(path)
      fail ArgumentError, 'Cannot write multiple files to a file.'
    end

    FileUtils.mkdir_p(path) unless File.exist?(path)
    path
  end
end
