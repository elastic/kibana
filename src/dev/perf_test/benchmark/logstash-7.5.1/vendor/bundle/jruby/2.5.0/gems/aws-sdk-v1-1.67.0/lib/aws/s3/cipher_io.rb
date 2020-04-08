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

module AWS
  class S3

    # @api private
    class CipherIO

      def initialize cipher, stream, stream_size = nil

        @stream = stream
        @stream_size = stream_size
        @orig_cipher = cipher.clone

        reset_cipher

        # add a #rewind method if the original stream can be rewound
        if @stream.respond_to?(:rewind)
          Core::MetaUtils.extend_method(self, :rewind) do
            reset_cipher
            @stream.rewind
          end
        end

        # add a #size method if the stream size is known
        if stream_size
          Core::MetaUtils.extend_method(self, :size) do
            EncryptionUtils.get_encrypted_size(@stream_size)
          end
        end

      end

      # @return [String] Returns the requested number of bytes.  If no byte
      #   amount is given, it will return the entire body of encrypted data
      def read bytes = nil, output_buffer = nil
        data = if bytes
          (@eof) ? nil : read_chunk(bytes)
        else
          (@eof) ? ""  : read_all
        end
        output_buffer ? output_buffer.replace(data || '') : data
      end

      # @return [Boolean] Returns `true` when the entire stream has been read.
      def eof?
        @eof
      end

      private

      attr_reader :cipher

      # Sets the CipherIO in a reset state without having to know anything
      #  about the cipher
      def reset_cipher
        @cipher = @orig_cipher.clone
        @eof    = false
        @final  = nil
      end

      # @return [String] Returns an encrytped chunk
      def read_chunk bytes
        unless @final
          # If given a number of bytes, read it out and work out encryption
          #  issues
          chunk = @stream.read(bytes)

          # If there is nothing, finish the encryption
          if chunk and chunk.length > 0
            handle_finish(bytes, cipher.update(chunk))
          else
            @eof = true
            cipher.final
          end
          # Read as much as possible if not given a byte size
        else
          @eof = true
          @final
        end
      end

      # @return [String] Returns the entire encrypted data
      def read_all
        @eof = true
        body = @stream.read()
        data = (body and body.length > 0) ? cipher.update(body) : ""
        data << cipher.final
      end

      # Figures out how much of the final block goes into the current chunk
      #   and adds it.
      # @return [String] Returns the encrypted chunk with possible padding.
      def handle_finish(bytes, chunk)
        free_space = bytes - chunk.size

        if free_space > 0
          @final = cipher.final
          chunk << @final[0..free_space-1]
          @final = @final[free_space..@final.size-1]
          @eof   = true unless @final and @final.size > 0
        end

        chunk
      end

    end
  end
end
