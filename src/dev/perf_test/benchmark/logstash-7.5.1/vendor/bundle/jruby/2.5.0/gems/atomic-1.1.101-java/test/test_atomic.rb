# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http:#www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

require 'minitest/autorun'
require 'atomic'

class TestAtomic < Minitest::Test
  def test_construct
    atomic = Atomic.new
    assert_equal nil, atomic.value
    
    atomic = Atomic.new(0)
    assert_equal 0, atomic.value
  end
  
  def test_value
    atomic = Atomic.new(0)
    atomic.value = 1
    
    assert_equal 1, atomic.value
  end
  
  def test_update
    # use a number outside JRuby's fixnum cache range, to ensure identity is preserved
    atomic = Atomic.new(1000)
    res = atomic.update {|v| v + 1}
    
    assert_equal 1001, atomic.value
    assert_equal 1001, res
  end
  
  def test_try_update
    # use a number outside JRuby's fixnum cache range, to ensure identity is preserved
    atomic = Atomic.new(1000)
    res = atomic.try_update {|v| v + 1}
    
    assert_equal 1001, atomic.value
    assert_equal 1001, res
  end

  def test_swap
    atomic = Atomic.new(1000)
    res = atomic.swap(1001)

    assert_equal 1001, atomic.value
    assert_equal 1000, res
  end
  
  def test_try_update_fails
    # use a number outside JRuby's fixnum cache range, to ensure identity is preserved
    atomic = Atomic.new(1000)
    assert_raises Atomic::ConcurrentUpdateError do
      # assigning within block exploits implementation detail for test
      atomic.try_update{|v| atomic.value = 1001 ; v + 1}
    end
  end

  def test_update_retries
    tries = 0
    # use a number outside JRuby's fixnum cache range, to ensure identity is preserved
    atomic = Atomic.new(1000)
    # assigning within block exploits implementation detail for test
    atomic.update{|v| tries += 1 ; atomic.value = 1001 ; v + 1}
    assert_equal 2, tries
  end
  
  def test_numeric_cas
    atomic = Atomic.new(0)
    
    # 9-bit idempotent Fixnum (JRuby)
    max_8 = 2**256 - 1
    min_8 = -(2**256)
    
    atomic.set(max_8)
    max_8.upto(max_8 + 2) do |i|
      assert atomic.compare_and_swap(i, i+1), "CAS failed for numeric #{i} => #{i + 1}"
    end
    
    atomic.set(min_8)
    min_8.downto(min_8 - 2) do |i|
      assert atomic.compare_and_swap(i, i-1), "CAS failed for numeric #{i} => #{i - 1}"
    end
    
    # 64-bit idempotent Fixnum (MRI, Rubinius)
    max_64 = 2**62 - 1
    min_64 = -(2**62)
    
    atomic.set(max_64)
    max_64.upto(max_64 + 2) do |i|
      assert atomic.compare_and_swap(i, i+1), "CAS failed for numeric #{i} => #{i + 1}"
    end
    
    atomic.set(min_64)
    min_64.downto(min_64 - 2) do |i|
      assert atomic.compare_and_swap(i, i-1), "CAS failed for numeric #{i} => #{i - 1}"
    end
    
    # 64-bit overflow into Bignum (JRuby)
    max_64 = 2**63 - 1
    min_64 = (-2**63)
    
    atomic.set(max_64)
    max_64.upto(max_64 + 2) do |i|
      assert atomic.compare_and_swap(i, i+1), "CAS failed for numeric #{i} => #{i + 1}"
    end
    
    atomic.set(min_64)
    min_64.downto(min_64 - 2) do |i|
      assert atomic.compare_and_swap(i, i-1), "CAS failed for numeric #{i} => #{i - 1}"
    end
    
    # non-idempotent Float (JRuby, Rubinius, MRI < 2.0.0 or 32-bit)
    atomic.set(1.0 + 0.1)
    assert atomic.compare_and_set(1.0 + 0.1, 1.2), "CAS failed for #{1.0 + 0.1} => 1.2"
    
    # Bignum
    atomic.set(2**100)
    assert atomic.compare_and_set(2**100, 0), "CAS failed for #{2**100} => 0"
    
    # Rational
    require 'rational' unless ''.respond_to? :to_r
    atomic.set(Rational(1,3))
    assert atomic.compare_and_set(Rational(1,3), 0), "CAS failed for #{Rational(1,3)} => 0"
    
    # Complex
    require 'complex' unless ''.respond_to? :to_c
    atomic.set(Complex(1,2))
    assert atomic.compare_and_set(Complex(1,2), 0), "CAS failed for #{Complex(1,2)} => 0"
  end
end
