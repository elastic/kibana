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

require 'atomic/concurrent_update_error'

# Define update methods that delegate to @ref field
class Atomic
  # Pass the current value to the given block, replacing it
  # with the block's result. May retry if the value changes
  # during the block's execution.
  def update
    true until @ref.compare_and_set(old_value = @ref.get, new_value = yield(old_value))
    new_value
  end

  def try_update
    old_value = @ref.get
    new_value = yield old_value
    unless @ref.compare_and_set(old_value, new_value)
      if $VERBOSE
        raise ConcurrentUpdateError, "Update failed"
      else
        raise ConcurrentUpdateError, "Update failed", ConcurrentUpdateError::CONC_UP_ERR_BACKTRACE
      end
    end
    new_value
  end
end