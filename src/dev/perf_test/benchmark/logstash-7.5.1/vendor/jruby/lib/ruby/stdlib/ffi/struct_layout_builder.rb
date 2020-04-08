#
# Copyright (C) 2008-2010 Wayne Meissner
#
# Version: EPL 2.0/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Common Public
# License Version 1.0 (the "License"); you may not use this file
# except in compliance with the License. You may obtain a copy of
# the License at http://www.eclipse.org/legal/cpl-v10.html
#
# Software distributed under the License is distributed on an "AS
# IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
# implied. See the License for the specific language governing
# rights and limitations under the License.
#
# Alternatively, the contents of this file may be used under the terms of
# either of the GNU General Public License Version 2 or later (the "GPL"),
# or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the EPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the EPL, the GPL or the LGPL.
#

module FFI
  class StructLayoutBuilder
    attr_reader :size, :alignment
    
    def initialize
      @size = 0
      @alignment = 1
      @min_alignment = 1
      @packed = false
      @union = false
      @fields = Array.new
    end

    def size=(size)
      @size = size if size > @size
    end

    def alignment=(align)
      @alignment = align if align > @alignment
      @min_alignment = align
    end

    def union=(is_union)
      @union = is_union
    end

    def union?
      @union
    end

    def packed=(packed)
      if packed.is_a?(Fixnum)
        @alignment = packed
        @packed = packed
      else
        @packed = packed ? 1 : 0
      end
    end


    SCALAR_TYPES = [
      Type::INT8,
      Type::UINT8,
      Type::INT16,
      Type::UINT16,
      Type::INT32,
      Type::UINT32,
      Type::LONG,
      Type::ULONG,
      Type::INT64,
      Type::UINT64,
      Type::FLOAT32,
      Type::FLOAT64,
      Type::BOOL,
    ]

    def add(name, type, offset = nil)

      if offset.nil? || offset == -1
        offset = @union ? 0 : align(@size, @packed ? [ @packed, type.alignment ].min : [ @min_alignment, type.alignment ].max)
      end

      #
      # If a FFI::Type type was passed in as the field arg, try and convert to a StructLayout::Field instance
      #
      field = type.is_a?(StructLayout::Field) ? type : field_for_type(name, offset, type)
      @fields << field
      @alignment = [ @alignment, field.alignment ].max unless @packed
      @size = [ @size, field.size + (@union ? 0 : field.offset) ].max

      return self
    end

    def add_field(name, type, offset = nil)
      add(name, type, offset)
    end
    
    def add_struct(name, type, offset = nil)
      add(name, Type::Struct.new(type), offset)
    end

    def add_array(name, type, count, offset = nil)
      add(name, Type::Array.new(type, count), offset)
    end

    def build
      # Add tail padding if the struct is not packed
      size = @packed ? @size : align(@size, @alignment)
      
      StructLayout.new(@fields, size, @alignment)
    end

    private
    
    def align(offset, align)
      align + ((offset - 1) & ~(align - 1));
    end

    def field_for_type(name, offset, type)
      field_class = case
      when type.is_a?(Type::Function)
        StructLayout::Function

      when type.is_a?(Type::Struct)
        StructLayout::InnerStruct

      when type.is_a?(Type::Array)
        StructLayout::Array

      when type.is_a?(FFI::Enum)
        StructLayout::Enum

      when SCALAR_TYPES.include?(type)
        StructLayout::Number

      when type == Type::POINTER
        StructLayout::Pointer

      when type == Type::STRING
        StructLayout::String

      when type.is_a?(Class) && type < StructLayout::Field
        type

      when type.is_a?(DataConverter)
        return StructLayout::Mapped.new(name, offset, Type::Mapped.new(type), field_for_type(name, offset, type.native_type))

      when type.is_a?(Type::Mapped)
        return StructLayout::Mapped.new(name, offset, type, field_for_type(name, offset, type.native_type))

      else
        raise TypeError, "invalid struct field type #{type.inspect}"
      end

      field_class.new(name, offset, type)
    end
  end

end
