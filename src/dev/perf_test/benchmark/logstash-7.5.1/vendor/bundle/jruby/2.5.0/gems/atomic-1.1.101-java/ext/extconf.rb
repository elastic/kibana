# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

require 'mkmf'
extension_name = 'atomic_reference'
dir_config(extension_name)

have_header "libkern/OSAtomic.h"

def compiler_is_gcc
  if CONFIG["GCC"] && CONFIG["GCC"] != ""
    return true
  elsif ( # This could stand to be more generic...  but I am afraid.
    CONFIG["CC"] =~ /\bgcc\b/
  )
    return true
  end
  return false
end


if compiler_is_gcc
  case CONFIG["arch"]
  when /mswin32|mingw|solaris/
      $CFLAGS += " -march=native"
  when 'i686-linux'
      $CFLAGS += " -march=i686"
  end
end

try_run(<<CODE,$CFLAGS) && ($defs << '-DHAVE_GCC_SYNC')
int main() {
  __sync_synchronize();
  return 0;
}
CODE

create_makefile(extension_name)
