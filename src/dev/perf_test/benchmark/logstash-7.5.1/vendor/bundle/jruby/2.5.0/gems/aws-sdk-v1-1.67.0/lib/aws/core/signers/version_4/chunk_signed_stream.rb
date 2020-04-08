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

require 'stringio'

module AWS
  module Core
    module Signers
      class Version4
        class ChunkSignedStream

          # @api private
          DEFAULT_CHUNK_SIZE = 128 * 1024

          # @api private
          MAX_BUFFER_SIZE = 256 * 1024

          # @api private
          CHUNK_SIGNATURE_HEADER = ";chunk-signature="

          # @api private
          CHUNK_STRING_TO_SIGN_PREFIX = "AWS4-HMAC-SHA256-PAYLOAD"

          # @api private
          SIGNATURE_LENGTH = 64

          # @api private
          CLRF = "\r\n"

          # @param [IO] stream The original http request body stream.
          # @param [Integer] stream_size Size of the original stream in bytes.
          #   This must be greater than 0.
          # @param [String] key The derived sigv4 signing key.
          # @param [String] key_path The scope of the derived key.
          # @param [String] datetime The iso8601 formatted datetime.
          # @param [String] signature The computed signature of the request headers.
          # @return [IO] Returns an IO-like object.
          def initialize stream, stream_size, key, key_path, datetime, signature
            @stream = stream || StringIO.new('')
            @size = self.class.signed_size(stream_size)
            @key = key
            @key_path = key_path
            @datetime = datetime
            @prev_chunk_signature = signature
            reset
          end

          # @return [Integer] the size of the final (signed) stream
          attr_reader :size

          # @param [Integer] bytes (nil)
          # @param [String] output_buffer (nil)
          # @return [String,nil]
          def read bytes = nil, output_buffer = nil
            data = read_bytes(bytes || @size)
            if output_buffer
              output_buffer.replace(data || '')
            else
              (data.nil? and bytes.nil?) ? '' : data
            end
          end

          # @return [Integer]
          def rewind
            @stream.rewind
            reset
          end

          private

          def reset
            @buffer = ''
            @more_chunks = true
          end

          # @param [Integer] num_bytes The maximum number of bytes to return.
          # @return [String,nil] `nil` once the complete stream has been read
          def read_bytes num_bytes
            fill_buffer(num_bytes)
            bytes = @buffer[0,num_bytes]
            @buffer = @buffer[num_bytes..-1] || '' # flatten the buffer
            bytes == '' ? nil : bytes
          end

          # Fills the internal buffer at least +num_bytes+ of data.
          # @param [Integer] num_bytes
          def fill_buffer num_bytes
            while @buffer.bytesize < num_bytes && more_chunks?
              @buffer << next_chunk
            end
          end

          def more_chunks?
            @more_chunks
          end

          def next_chunk
            chunk = @stream.read(DEFAULT_CHUNK_SIZE)
            if chunk.nil?
              chunk = ''
              @more_chunks = false
            end
            sign_chunk(chunk)
          end

          # Given a chunk of the original stream, this method returns a signed
          # chunk with the prefixed header.
          # @param [String] chunk
          # @return [String]
          def sign_chunk chunk
            [
              chunk.bytesize.to_s(16),
              CHUNK_SIGNATURE_HEADER,
              next_chunk_signature(chunk),
              CLRF,
              chunk,
              CLRF,
            ].join
          end

          # @param [String] chunk
          # @return [String]
          def next_chunk_signature chunk
            string_to_sign = [
              "AWS4-HMAC-SHA256-PAYLOAD",
              @datetime,
              @key_path,
              @prev_chunk_signature,
              hash(''),
              hash(chunk),
            ].join("\n")
            signature = sign(string_to_sign)
            @prev_chunk_signature = signature
            signature
          end

          def sign value
            @digest ||= OpenSSL::Digest.new('sha256')
            OpenSSL::HMAC.hexdigest(@digest, @key, value)
          end

          def hash value
            OpenSSL::Digest::SHA256.new.update(value).hexdigest
          end

          class << self

            # Computes the final size of a chunked signed stream.
            # @param [Integer] size Size of the original, unsigned stream.
            # @return [Integer]
            def signed_size size
              full_sized_chunks = size / DEFAULT_CHUNK_SIZE
              trailing_bytes = size % DEFAULT_CHUNK_SIZE
              length = 0
              length += full_sized_chunks * header_length(DEFAULT_CHUNK_SIZE)
              length += trailing_bytes > 0 ? header_length(trailing_bytes) : 0
              length += header_length(0)
              length
            end

            private

            # Computes the size of a header that prefixes a chunk.  The size
            # appears in the header as a string.
            # @param [Integer] size
            # @return [Integer]
            def header_length size
              size.to_s(16).length +
              CHUNK_SIGNATURE_HEADER.length +
              SIGNATURE_LENGTH +
              CLRF.length +
              size +
              CLRF.length
            end

          end
        end
      end
    end
  end
end
