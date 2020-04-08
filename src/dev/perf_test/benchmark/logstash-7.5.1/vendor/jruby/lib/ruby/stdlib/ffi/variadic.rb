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
  class VariadicInvoker
    def init(arg_types, type_map)
      @fixed = Array.new
      @type_map = type_map
      arg_types.each_with_index do |type, i|
        @fixed << type unless type == FFI::NativeType::VARARGS
      end
    end

    def call(*args, &block)
      param_types = Array.new(@fixed)
      param_values = Array.new
      @fixed.each_with_index do |t, i|
        param_values << args[i]
      end
      i = @fixed.length
      while i < args.length
        param_types << FFI.find_type(args[i], @type_map)
        param_values << args[i + 1]
        i += 2
      end
      invoke(param_types, param_values, &block)
    end

    #
    # Attach the invoker to module +mod+ as +mname+
    #
    def attach(mod, mname)
      invoker = self
      params = "*args"
      call = "call"
      mod.module_eval <<-code
      @@#{mname} = invoker
      def self.#{mname}(#{params})
        @@#{mname}.#{call}(#{params})
      end
      def #{mname}(#{params})
        @@#{mname}.#{call}(#{params})
      end
      code
      invoker
    end
  end
end
