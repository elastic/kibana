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

require 'thread'
require 'atomic/direct_update'

# Portable/generic (but not very memory or scheduling-efficient) fallback
class Atomic #:nodoc: all
  def initialize(value = nil)
    @mutex = Mutex.new
    @value = value
  end

  def get
    @mutex.synchronize { @value }
  end
  alias value get

  def set(new_value)
    @mutex.synchronize { @value = new_value }
  end
  alias value= set

  def get_and_set(new_value)
    @mutex.synchronize do
      old_value = @value
      @value = new_value
      old_value
    end
  end
  alias swap get_and_set

  def compare_and_set(old_value, new_value)
    return false unless @mutex.try_lock
    begin
      return false unless @value.equal? old_value
      @value = new_value
    ensure
      @mutex.unlock
    end
    true
  end
  
  require 'atomic/numeric_cas_wrapper'
end