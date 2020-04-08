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
# Copyright (C) 2008 JRuby project
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
# Copyright (c) 2007, 2008 Evan Phoenix
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

require 'rbconfig'

module FFI
  #  Specialised error classes - delcare before loading all the other classes
  class NativeError < LoadError; end
  
  class SignatureError < NativeError; end

  class NotFoundError < NativeError
    def initialize(function, *libraries)
      super("Function '#{function}' not found in [#{libraries[0].nil? ? 'current process' : libraries.join(", ")}]")
    end
  end
end

require 'ffi/platform'
require 'ffi/types'
require 'ffi/library'
require 'ffi/pointer'
require 'ffi/memorypointer'
require 'ffi/autopointer'
require 'ffi/struct'
require 'ffi/union'
require 'ffi/io'
require 'ffi/variadic'
require 'ffi/errno'
require 'ffi/managedstruct'

module FFI
  
  def self.map_library_name(lib)
    lib = lib.to_s
    # Mangle the library name to reflect the native library naming conventions
    lib = Platform::LIBC if lib == 'c'
    if lib && File.basename(lib) == lib
      lib = Platform::LIBPREFIX + lib unless lib =~ /^#{Platform::LIBPREFIX}/
      r = Platform::IS_LINUX ? "\\.so($|\\.[1234567890]+)" : "\\.#{Platform::LIBSUFFIX}$"
      lib += ".#{Platform::LIBSUFFIX}" unless lib =~ /#{r}/
    end
    lib
  end
  
  def self.create_invoker(lib, name, args, ret_type, options = { :convention => :default })
    # Current artificial limitation based on JRuby::FFI limit
    raise SignatureError, 'FFI functions may take max 32 arguments!' if args.size > 32

    # Open the library if needed
    library = if lib.kind_of?(DynamicLibrary)
      lib
    elsif lib.kind_of?(String)
      # Allow FFI.create_invoker to be  called with a library name
      DynamicLibrary.open(FFI.map_library_name(lib), DynamicLibrary::RTLD_LAZY)
    elsif lib.nil?
      FFI::Library::DEFAULT
    else
      raise LoadError, "Invalid library '#{lib}'"
    end
    function = library.find_function(name)
    raise NotFoundError.new(name, library.name) unless function

    args = args.map {|e| find_type(e) }
    invoker = if args.length > 0 && args[args.length - 1] == FFI::NativeType::VARARGS
      FFI::VariadicInvoker.new(library, function, args, find_type(ret_type), options)
    else
      FFI::Function.new(find_type(ret_type), args, function, options)
    end
    raise NotFoundError.new(name, library.name) unless invoker
    
    return invoker
  end
  
  # Load all the platform dependent types/consts/struct members
  class Config
    CONFIG = Hash.new
    begin
      File.open(File.join(Platform::CONF_DIR, 'platform.conf'), "r") do |f|
        typedef = "rbx.platform.typedef."
        f.each_line { |line|
          if line.index(typedef) == 0
            new_type, orig_type = line.chomp.slice(typedef.length..-1).split(/\s*=\s*/)
            FFI.add_typedef(orig_type.to_sym, new_type.to_sym)
          else
            key, value = line.chomp.split(/\s*=\s*/)
            CONFIG[String.new << key] = String.new << value unless key.nil? or value.nil?
          end
        }
      end
    rescue Errno::ENOENT
    end
  end
end
