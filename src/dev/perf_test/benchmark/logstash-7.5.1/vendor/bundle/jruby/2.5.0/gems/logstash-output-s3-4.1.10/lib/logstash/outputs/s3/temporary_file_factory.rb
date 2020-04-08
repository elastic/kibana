# encoding: utf-8
require "socket"
require "securerandom"
require "fileutils"
require "zlib"
require "forwardable"

module LogStash
  module Outputs
    class S3
      # Since the file can contains dynamic part, we have to handle a more local structure to
      # allow a nice recovery from a crash.
      #
      # The local structure will look like this.
      #
      # <TEMPORARY_PATH>/<UUID>/<prefix>/ls.s3.localhost.%Y-%m-%dT%H.%m.tag_es_fb.part1.txt.gz
      #
      # Since the UUID should be fairly unique I can destroy the whole path when an upload is complete.
      # I do not have to mess around to check if the other directory have file in it before destroying them.
      class TemporaryFileFactory
        FILE_MODE = "a"
        GZIP_ENCODING = "gzip"
        GZIP_EXTENSION = "txt.gz"
        TXT_EXTENSION = "txt"
        STRFTIME = "%Y-%m-%dT%H.%M"

        attr_accessor :counter, :tags, :prefix, :encoding, :temporary_directory, :current

        def initialize(prefix, tags, encoding, temporary_directory)
          @counter = 0
          @prefix = prefix

          @tags = tags
          @encoding = encoding
          @temporary_directory = temporary_directory
          @lock = Mutex.new

          rotate!
        end

        def rotate!
          @lock.synchronize {
            @current = new_file
            increment_counter
            @current
          }
        end

        private
        def extension
          gzip? ? GZIP_EXTENSION : TXT_EXTENSION
        end

        def gzip?
          encoding == GZIP_ENCODING
        end

        def increment_counter
          @counter += 1
        end

        def current_time
          Time.now.strftime(STRFTIME)
        end

        def generate_name
          filename = "ls.s3.#{SecureRandom.uuid}.#{current_time}"

          if tags.size > 0
            "#{filename}.tag_#{tags.join('.')}.part#{counter}.#{extension}"
          else
            "#{filename}.part#{counter}.#{extension}"
          end
        end

        def new_file
          uuid = SecureRandom.uuid
          name = generate_name
          path = ::File.join(temporary_directory, uuid)
          key = ::File.join(prefix, name)

          FileUtils.mkdir_p(::File.join(path, prefix))

          io = if gzip?
                 # We have to use this wrapper because we cannot access the size of the
                 # file directly on the gzip writer.
                 IOWrappedGzip.new(::File.open(::File.join(path, key), FILE_MODE))
               else
                 ::File.open(::File.join(path, key), FILE_MODE)
               end

          TemporaryFile.new(key, io, path)
        end

        class IOWrappedGzip
          extend Forwardable

          def_delegators :@gzip_writer, :write, :close
          attr_reader :file_io, :gzip_writer

          def initialize(file_io)
            @file_io = file_io
            @gzip_writer = Zlib::GzipWriter.new(file_io)
          end

          def path
            @gzip_writer.to_io.path
          end

          def size
            # to get the current file size
            if @gzip_writer.pos == 0
              # Ensure a zero file size is returned when nothing has
              # yet been written to the gzip file.
              0
            else
              @gzip_writer.flush
              @gzip_writer.to_io.size
            end
          end

          def fsync
            @gzip_writer.to_io.fsync
          end
        end
      end
    end
  end
end
