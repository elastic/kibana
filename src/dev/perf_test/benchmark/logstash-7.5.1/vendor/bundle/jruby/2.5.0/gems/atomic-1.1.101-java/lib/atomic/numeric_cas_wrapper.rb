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

class Atomic
  alias _compare_and_set compare_and_set
  def compare_and_set(expected, new)
    if expected.kind_of? Numeric
      while true
        old = get
        
        return false unless old.kind_of? Numeric
        
        return false unless old == expected
        
        result = _compare_and_set(old, new)
        return result if result
      end
    else
      _compare_and_set(expected, new)
    end
  end
  alias compare_and_swap compare_and_set
end