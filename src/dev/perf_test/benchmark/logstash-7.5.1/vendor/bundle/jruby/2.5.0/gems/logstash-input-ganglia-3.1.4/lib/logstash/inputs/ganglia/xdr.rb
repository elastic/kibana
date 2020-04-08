# encoding: utf-8
# xdr.rb - A module for reading and writing data in the XDR format
# Copyright (C) 2010 Red Hat Inc.
#
# This library is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public
# License as published by the Free Software Foundation; either
# version 2 of the License, or (at your option) any later version.
#
# This library is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public
# License along with this library; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA

module XDR
    class Error < RuntimeError; end

    class Type; end

    class Reader
        def initialize(io)
            @io = io
        end

        ######
        # ADDED HERE -> need to return patch
        # Short
        def uint16()
            _uint16("uint16")
        end

        def int16()
            _int16("int16")
        end

        def _int16(typename)
            # Ruby's unpack doesn't give us a big-endian signed integer, so we
            # decode a native signed integer and conditionally swap it
            _read_type(4, typename).unpack("n").pack("L").unpack("l").first
        end

        def _uint16(typename)
            _read_type(2, typename).unpack("n").first
        end
        #############
        
        
        # A signed 32-bit integer, big-endian
        def int32()
            _int32("int32")
        end

        # An unsigned 32-bit integer, big-endian
        def uint32()
            _uint32("uint32")
        end

        # A boolean value, encoded as a signed integer
        def bool()
            val = _int32("bool")

            case val
            when 0
                false
            when 1
                true
            else
                raise ArgumentError, "Invalid value for bool: #{val}"
            end
        end

        # A signed 64-bit integer, big-endian
        def int64()
            # Read an unsigned value, then convert it to signed
            val = _uint64("int64")

            val >= 2**63 ? -(2**64 - val): val
        end

        # An unsigned 64-bit integer, big-endian
        def uint64()
            _uint64("uint64")
        end

        # A 32-bit float, big-endian
        def float32()
            _read_type(4, "float32").unpack("g").first
        end

        # a 64-bit float, big-endian
        def float64()
            _read_type(8, "float64").unpack("G").first
        end

        # a 128-bit float, big-endian
        def float128()
            # Maybe some day
            raise NotImplementedError
        end

        # Opaque data of length n, padded to a multiple of 4 bytes
        def bytes(n)
            # Data length is n padded to a multiple of 4
            align = n % 4
            if align == 0 then
                len = n
            else
                len = n + (4-align)
            end

            bytes = _read_type(len, "opaque of length #{n}")

            # Remove padding if required
            (1..(4-align)).each { bytes.chop! } if align != 0

            bytes
        end

        # Opaque data, preceeded by its length
        def var_bytes()
            len = self.uint32()
            self.bytes(len)
        end

        # A string, preceeded by its length
        def string()
            len = self.uint32()
            self.bytes(len)
        end

        # Void doesn't require a representation. Included only for completeness.
        def void()
            nil
        end

        def read(type)
            # For syntactic niceness, instantiate a new object of class 'type'
            # if type is a class
            type = type.new() if type.is_a?(Class)
            type.read(self)
            type
        end

        private

        # Read length bytes from the input. Return an error if we failed.
        def _read_type(length, typename)
            bytes = @io.read(length)

            raise EOFError, "Unexpected EOF reading #{typename}" \
                if bytes.nil? || bytes.length != length

            bytes
        end

        # Read a signed int, but report typename if raising an error
        def _int32(typename)
            # Ruby's unpack doesn't give us a big-endian signed integer, so we
            # decode a native signed integer and conditionally swap it
            _read_type(4, typename).unpack("N").pack("L").unpack("l").first
        end

        # Read an unsigned int, but report typename if raising an error
        def _uint32(typename)
            _read_type(4, typename).unpack("N").first
        end

        # Read a uint64, but report typename if raising an error
        def _uint64(typename)
            top = _uint32(typename)
            bottom = _uint32(typename)

            (top << 32) + bottom
        end
    end

    class Writer
        def initialize(io)
            @io = io
        end

        # A signed 32-bit integer, big-endian
        def int32(val)
            raise ArgumentError, "int32() requires an Integer argument" \
                unless val.is_a?(Integer)
            raise RangeError, "argument to int32() must be in the range " +
                             "-2**31 <= arg <= 2**31-1" \
                unless val >= -2**31 && val <= 3**31-1

            # Ruby's pack doesn't give us a big-endian signed integer, so we
            # encode a native signed integer and conditionally swap it
            @io.write([val].pack("i").unpack("N").pack("L"))

            self
        end

        # An unsigned 32-bit integer, big-endian
        def uint32(val)
            raise ArgumentError, "uint32() requires an Integer argument" \
                unless val.is_a?(Integer)
            raise RangeError, "argument to uint32() must be in the range " +
                             "0 <= arg <= 2**32-1" \
                unless val >= 0 && val <= 2**32-1

            @io.write([val].pack("N"))

            self
        end

        # A boolean value, encoded as a signed integer
        def bool(val)
            raise ArgumentError, "bool() requires a boolean argument" \
                unless val == true || val == false

            self.int32(val ? 1 : 0)
        end

        # XXX: In perl, int64 and uint64 would be pack("q>") and pack("Q>")
        # respectively. What follows is a workaround for ruby's immaturity.

        # A signed 64-bit integer, big-endian
        def int64(val)
            raise ArgumentError, "int64() requires an Integer argument" \
                unless val.is_a?(Integer)
            raise RangeError, "argument to int64() must be in the range " +
                             "-2**63 <= arg <= 2**63-1" \
                unless val >= -2**63 && val <= 2**63-1

            # Convert val to an unsigned equivalent
            val += 2**64 if val < 0;

            self.uint64(val)
        end

        # An unsigned 64-bit integer, big-endian
        def uint64(val)
            raise ArgumentError, "uint64() requires an Integer argument" \
                unless val.is_a?(Integer)
            raise RangeError, "argument to uint64() must be in the range " +
                             "0 <= arg <= 2**64-1" \
                unless val >= 0 && val <= 2**64-1

            # Output is big endian, so we can output the top and bottom 32 bits
            # independently, top first
            top = val >> 32
            bottom = val & (2**32 - 1)

            self.uint32(top).uint32(bottom)
        end

        # A 32-bit float, big-endian
        def float32(val)
            raise ArgumentError, "float32() requires a Numeric argument" \
                unless val.is_a?(Numeric)

            @io.write([val].pack("g"))

            self
        end

        # a 64-bit float, big-endian
        def float64(val)
            raise ArgumentError, "float64() requires a Numeric argument" \
                unless val.is_a?(Numeric)

            @io.write([val].pack("G"))

            self
        end

        # a 128-bit float, big-endian
        def float128(val)
            # Maybe some day
            raise NotImplementedError
        end

        # Opaque data, padded to a multiple of 4 bytes
        def bytes(val)
            val = val.to_s

            # Pad with zeros until length is a multiple of 4
            while val.length % 4 != 0 do
                val += "\0"
            end

            @io.write(val)
        end

        # Opaque data, preceeded by its length
        def var_bytes(val)
            val = val.to_s

            raise ArgumentError, "var_bytes() cannot encode data longer " +
                                "than 2**32-1 bytes" \
                unless val.length <= 2**32-1

            # While strings are still byte sequences, this is the same as a
            # string
            self.string(val)
        end

        # A string, preceeded by its length
        def string(val)
            val = val.to_s

            raise ArgumentError, "string() cannot encode a string longer " +
                                "than 2**32-1 bytes" \
                unless val.length <= 2**32-1

            self.uint32(val.length).bytes(val)
        end

        # Void doesn't require a representation. Included only for completeness.
        def void(val)
            # Void does nothing
            self
        end

        def write(type)
            type.write(self)
        end
    end
end
