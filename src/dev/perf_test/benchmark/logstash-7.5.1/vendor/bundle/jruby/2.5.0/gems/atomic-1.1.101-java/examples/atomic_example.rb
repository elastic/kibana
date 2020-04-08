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

require 'atomic'

my_atomic = Atomic.new(0)
my_atomic.update {|v| v + 1}
puts "new value: #{my_atomic.value}"

begin
  my_atomic.try_update {|v| v + 1}
rescue Atomic::ConcurrentUpdateError => cue
  # deal with it (retry, propagate, etc)
end
puts "new value: #{my_atomic.value}"
