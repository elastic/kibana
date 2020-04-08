#
# Copyright (C) 2008, 2009 Wayne Meissner
# Copyright (C) 2008, 2009 Andrea Fazzi
# Copyright (C) 2008, 2009 Luc Heinrich
# Copyright (c) 2007, 2008 Evan Phoenix
#
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, this
#   list of conditions and the following disclaimer.
# * Redistributions in binary form must reproduce the above copyright notice
#   this list of conditions and the following disclaimer in the documentation
#   and/or other materials provided with the distribution.
# * Neither the name of the Evan Phoenix nor the names of its contributors
#   may be used to endorse or promote products derived from this software
#   without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

require 'ffi/platform'
require 'ffi/struct_layout_builder'

module FFI

  class Struct
    alias_method :align, :alignment

    def self.size=(size)
      raise ArgumentError, "Size already set" if defined?(@size) || defined?(@layout)
      @size = size
    end

    def self.in
      ptr(:in)
    end

    def self.out
      ptr(:out)
    end

    def self.ptr(flags = :inout)
      @ref_data_type ||= Type::Mapped.new(StructByReference.new(self))
    end

    def self.val
      @val_data_type ||= StructByValue.new(self)
    end

    def self.by_value
      self.val
    end

    def self.by_ref(flags = :inout)
      self.ptr(flags)
    end

    class ManagedStructConverter < StructByReference

      def initialize(struct_class)
        super(struct_class)

        raise NoMethodError, "release() not implemented for class #{struct_class}" unless struct_class.respond_to? :release
        @method = struct_class.method(:release)
      end

      def from_native(ptr, ctx)
        struct_class.new(AutoPointer.new(ptr, @method))
      end
    end

    def self.auto_ptr
      @managed_type ||= Type::Mapped.new(ManagedStructConverter.new(self))
    end


    class << self
      public

      def layout(*spec)
        return @layout if spec.size == 0

        builder = StructLayoutBuilder.new
        builder.union = self < Union
        builder.packed = @packed if defined?(@packed)
        builder.alignment = @min_alignment if defined?(@min_alignment)

        if spec[0].kind_of?(Hash)
          hash_layout(builder, spec)
        else
          array_layout(builder, spec)
        end

        builder.size = @size if defined?(@size) && @size > builder.size
        layout = builder.build
        @size = layout.size
        self.layout = layout unless self == Struct
        layout
      end


      protected

      def callback(params, ret)
        mod = enclosing_module
        FFI::CallbackInfo.new(find_type(ret, mod), params.map { |e| find_type(e, mod) })
      end

      def packed(packed = 1)
        @packed = packed
      end
      alias :pack :packed
      
      def aligned(alignment = 1)
        @min_alignment = alignment
      end
      alias :align :aligned

      def enclosing_module
        begin
          mod = self.name.split("::")[0..-2].inject(Object) { |obj, c| obj.const_get(c) }
          (mod < FFI::Library || mod < FFI::Struct || mod.respond_to?(:find_type)) ? mod : nil
        rescue Exception => ex
          nil
        end
      end


      def find_field_type(type, mod = enclosing_module)
        if type.kind_of?(Class) && type < Struct
          FFI::Type::Struct.new(type)

        elsif type.kind_of?(Class) && type < FFI::StructLayout::Field
          type

        elsif type.kind_of?(::Array)
          FFI::Type::Array.new(find_field_type(type[0]), type[1])

        else
          find_type(type, mod)
        end
      end

      def find_type(type, mod = enclosing_module)
        if mod
          mod.find_type(type)
        end || FFI.find_type(type)
      end

      private

      def hash_layout(builder, spec)
        raise "Ruby version not supported" if RUBY_VERSION =~ /1.8.*/ && !(RUBY_PLATFORM =~ /java/)
        spec[0].each do |name, type|
          builder.add name, find_field_type(type), nil
          end
        end

      def array_layout(builder, spec)
        i = 0
        while i < spec.size
          name, type = spec[i, 2]
          i += 2

          # If the next param is a Integer, it specifies the offset
          if spec[i].kind_of?(Integer)
            offset = spec[i]
            i += 1
          else
            offset = nil
          end

          builder.add name, find_field_type(type), offset
          end
        end
      end
    end
  end
