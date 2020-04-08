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

begin
  # force fallback impl with FORCE_ATOMIC_FALLBACK=1
  if /[^0fF]/ =~ ENV['FORCE_ATOMIC_FALLBACK']
    ruby_engine = 'fallback'
  else
    ruby_engine = defined?(RUBY_ENGINE)? RUBY_ENGINE : 'ruby'
  end
  
  require "atomic/#{ruby_engine}"
rescue LoadError
  warn "#{__FILE__}:#{__LINE__}: unsupported Ruby engine `#{RUBY_ENGINE}', using less-efficient Atomic impl"
  require 'atomic/fallback'
end