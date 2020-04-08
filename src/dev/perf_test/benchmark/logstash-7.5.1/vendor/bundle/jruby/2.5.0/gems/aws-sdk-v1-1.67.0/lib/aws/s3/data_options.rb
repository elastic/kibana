# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

require 'pathname'

module AWS
  class S3

    # Used by S3#S3Object and S3::Client to accept options with
    # data that should be uploaded (streamed).
    # @api private
    module DataOptions

      protected

      # @return [Hash] Returns a hash of options with a :data option that
      #   responds to #read and #eof?.
      def compute_write_options *args, &block

        options = convert_args_to_options_hash(*args)

        validate_data!(options, &block)

        rename_file_to_data(options)

        convert_data_to_io_obj(options, &block)

        try_to_determine_content_length(options)

        options

      end

      # Converts an argument list into a single hash of options.  Treats
      # non-hash arguments in the first position as a data option.
      def convert_args_to_options_hash *args
        case args.count
        when 0 then {}
        when 1 then args[0].is_a?(Hash) ? args[0] : { :data => args[0] }
        when 2 then args[1].merge(:data => args[0])
        else
          msg = "expected 0, 1 or 2 arguments, got #{args.count}"
          raise ArgumentError, msg
        end
      end

      # Moves options[:file] to options[:data].  If this option is a string
      # then it is treated as a file path and is converted to an open file.
      def rename_file_to_data options
        if file = options.delete(:file)
          options[:data] = file.is_a?(String) ? open_file(file) : file
        end
      end

      # Converts the :data option to an IO-like object.  This allows us
      # to always perform streaming uploads.
      def convert_data_to_io_obj options, &block

        data = options.delete(:data)

        if block_given?
          options[:data] = IOProxy.new(block)
        elsif data.is_a?(String)
          data = data.dup if data.frozen?
          data.force_encoding("BINARY") if data.respond_to?(:force_encoding)
          options[:data] = StringIO.new(data)
        elsif data.is_a?(Pathname)
          options[:data] = open_file(data.to_s)
        elsif io_like?(data)
          options[:data] = data
        else
          msg = "invalid :data option, expected a String, Pathname or "
          msg << "an object that responds to #read and #eof?"
          raise ArgumentError, msg
        end

      end

      # Attempts to determine the content length of the :data option.
      # This is only done when a content length is not already provided.
      def try_to_determine_content_length options
        unless options[:content_length]

          data = options[:data]

          length = case
            when data.respond_to?(:path) && data.path then File.size(data.path)
            when data.respond_to?(:bytesize) then data.bytesize
            when data.respond_to?(:size)     then data.size
            when data.respond_to?(:length)   then data.length
            else nil
          end

          options[:content_length] = length if length

        end
      end

      def validate_data! options, &block

        data = options[:data]
        file = options[:file]

        raise ArgumentError, 'Object data passed multiple ways.' if
          [data, file, block].compact.count > 1

        data = file if file

        return if block_given?
        return if data.kind_of?(String)
        return if data.kind_of?(Pathname)
        return if io_like?(data)

        msg = ":data must be provided as a String, Pathname, File, or "
        msg << "an object that responds to #read and #eof?"
        raise ArgumentError, msg

      end

      # @return [Boolean] Returns `true` if the object responds to
      #   `#read` and `#eof?`.
      def io_like? io
        io.respond_to?(:read) and io.respond_to?(:eof?)
      end

      # @param [String] path Path to a file on disk.
      # @return [File] Given a path string, returns an open File.
      def open_file path
        Core::ManagedFile.open(path)
      end

      # A utility class that turns a block (with 2 args) into an
      # IO object that responds to #read and #eof.
      # @api private
      class IOProxy

        def initialize write_block
          unless write_block.arity == 2
            msg = "a write block must accept 2 yield params: a buffer and "
            msg << "a number of bytes to write"
            raise ArgumentError, msg
          end
          @write_block = write_block
          @eof = false
        end

        def read bytes = nil, output_buffer = nil
          data = if bytes
            (@eof) ? nil : read_chunk(bytes)
          else
            (@eof) ? ""  : read_all
          end
          output_buffer ? output_buffer.replace(data || '') : data
        end

        def eof?
          @eof
        end

        protected

        def read_chunk bytes
          buffer = StringIO.new
          @write_block.call(buffer, bytes)
          buffer.rewind
          @eof = true if buffer.size < bytes
          buffer.read
        end

        def read_all
          buffer = StringIO.new
          buffer << read_chunk(1024 * 1024 * 5) until @eof
          buffer.rewind
          buffer.read
        end

      end

    end
  end
end
