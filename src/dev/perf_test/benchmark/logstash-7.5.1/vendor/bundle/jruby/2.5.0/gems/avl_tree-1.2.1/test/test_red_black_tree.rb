# -*- encoding: utf-8 -*-
require File.expand_path('./helper', File.dirname(__FILE__))

module RedBlackTreeTest
  def __test_random
    h = create_test_target
    10000.times do |idx|
      key = rand(100)
      h[key] = key
      key = rand(100)
      h.delete(key)
    end
  end

  def test_tree_rotate_RR
    h = create_test_target
    assert_equal '', h.dump_sexp
    h['a'] = 1
    assert_equal 'a', h.dump_sexp
    h['b'] = 2
    assert_equal '(a - b)', h.dump_sexp
    h['c'] = 3
    assert_equal '(b a c)', h.dump_sexp
    h['d'] = 4
    assert_equal '(b a (c - d))', h.dump_sexp
    h['e'] = 5
    assert_equal '(b a (d c e))', h.dump_sexp
  end

  def test_tree_rotate_LL
    h = create_test_target
    h['e'] = 1
    h['d'] = 2
    assert_equal '(e d)', h.dump_sexp
    h['c'] = 3
    assert_equal '(d c e)', h.dump_sexp
    h['b'] = 4
    assert_equal '(d (c b) e)', h.dump_sexp
    h['a'] = 5
    assert_equal '(d (b a c) e)', h.dump_sexp
  end

  def test_tree_rotate_RL
    h = create_test_target
    h['b'] = 1
    h['a'] = 2
    h['g'] = 3
    h['d'] = 4
    h['h'] = 5
    assert_equal '(b a (g d h))', h.dump_sexp
    h['c'] = 6
    assert_equal '(b a (g (d c) h))', h.dump_sexp
    h['e'] = 6
    assert_equal '(d (b a c) (g e h))', h.dump_sexp
    h['f'] = 6
    assert_equal '(d (b a c) (g (e - f) h))', h.dump_sexp
  end

  def test_tree_rotate_LR
    h = create_test_target
    h['g'] = 1
    h['b'] = 2
    h['h'] = 3
    h['i'] = 4
    h['a'] = 5
    h['d'] = 6
    h['0'] = 7
    h['c'] = 8
    h['e'] = 9
    assert_equal '(d (b (a 0) c) (g e (h - i)))', h.dump_sexp
    h['f'] = 10
    assert_equal '(d (b (a 0) c) (g (e - f) (h - i)))', h.dump_sexp
  end

  def test_aref_nil
    h = create_test_target
    h['abc'] = 1
    assert_equal nil, h['def']
  end

  def test_empty
    h = create_test_target
    h['abc'] = 0
    assert_equal nil, h['']
    h[''] = 1
    assert_equal 1, h['']
    h.delete('')
    assert_equal nil, h['']
  end

  def test_aref_single
    h = create_test_target
    h['abc'] = 1
    assert_equal 1, h['abc']
  end

  def test_aref_double
    h = create_test_target
    h['abc'] = 1
    h['def'] = 2
    assert_equal 1, h['abc']
    assert_equal 2, h['def']
  end

  def test_aset_override
    h = create_test_target
    h['abc'] = 1
    h['abc'] = 2
    assert_equal 2, h['abc']
  end

  def test_split
    h = create_test_target
    h['abcd'] = 1
    assert_equal 1, h['abcd']
    h['abce'] = 2
    assert_equal 1, h['abcd']
    assert_equal 2, h['abce']
    h['abd'] = 3
    assert_equal 1, h['abcd']
    assert_equal 2, h['abce']
    assert_equal 3, h['abd']
    h['ac'] = 4
    assert_equal 1, h['abcd']
    assert_equal 2, h['abce']
    assert_equal 3, h['abd']
    assert_equal 4, h['ac']
  end

  def test_split_and_assign
    h = create_test_target
    h['ab'] = 1
    h['a'] = 2
    assert_equal 1, h['ab']
    assert_equal 2, h['a']
  end

  def test_push
    h = create_test_target
    assert_equal 0, h.size
    h['a'] = 1
    assert_equal 1, h['a']
    h['ab'] = 2
    assert_equal 1, h['a']
    assert_equal 2, h['ab']
    h['abc'] = 3
    assert_equal 1, h['a']
    assert_equal 2, h['ab']
    assert_equal 3, h['abc']
    h['abd'] = 4
    assert_equal 1, h['a']
    assert_equal 2, h['ab']
    assert_equal 3, h['abc']
    assert_equal 4, h['abd']
    h['ac'] = 5
    assert_equal 1, h['a']
    assert_equal 2, h['ab']
    assert_equal 3, h['abc']
    assert_equal 4, h['abd']
    assert_equal 5, h['ac']
    h['b'] = 6
    assert_equal 1, h['a']
    assert_equal 2, h['ab']
    assert_equal 3, h['abc']
    assert_equal 4, h['abd']
    assert_equal 5, h['ac']
    assert_equal 6, h['b']
    assert_equal ['a', 'ab', 'abc', 'abd', 'ac', 'b'].sort, h.keys.sort
    assert_equal 6, h.size
  end

  def test_different_type
    h = create_test_target
    h['a'] = 1
    assert_raise(TypeError) do
      h[3.3] = 2
    end
    assert_nil h[3.3]
  end

  def test_delete_leaf
    h = create_test_target
    h['b'] = 1
    h['a'] = 2
    h['c'] = 3
    assert_equal 2, h['a']
    h.delete('a')
    assert_equal nil, h['a']
  end

  def test_delete_leaf_single_rotation
    h = create_test_target
    h['b'] = 1
    h['a'] = 2
    h['d'] = 3
    h['c'] = 4
    h['e'] = 5
    assert_equal '(b a (d c e))', h.dump_sexp
    h.delete('a')
    assert_equal '(d (b - c) e)', h.dump_sexp
  end

  def test_delete_leaf_single_rotation_right
    h = create_test_target
    h['d'] = 1
    h['e'] = 2
    h['b'] = 3
    h['c'] = 4
    h['a'] = 5
    assert_equal '(d (b a c) e)', h.dump_sexp
    h.delete('e')
    assert_equal '(b a (d c))', h.dump_sexp
  end

  def test_delete_leaf_double_rotation
    h = create_test_target
    h['b'] = 1
    h['a'] = 2
    h['e'] = 3
    h['0'] = 4
    h['c'] = 5
    h['f'] = 6
    h['d'] = 7
    assert_equal '(b (a 0) (e (c - d) f))', h.dump_sexp
    h.delete('0')
    assert_equal '(b a (e (c - d) f))', h.dump_sexp
    h.delete('a')
    assert_equal '(e (c b d) f)', h.dump_sexp
  end

  def test_delete_leaf_double_rotation_right
    h = create_test_target
    h['d'] = 1
    h['e'] = 2
    h['a'] = 3
    h['f'] = 4
    h['c'] = 5
    h['0'] = 6
    h['b'] = 7
    assert_equal '(d (a 0 (c b)) (e - f))', h.dump_sexp
    h.delete('f')
    assert_equal '(d (a 0 (c b)) e)', h.dump_sexp
    h.delete('e')
    assert_equal '(a 0 (c b d))', h.dump_sexp
  end

  def test_delete_node_right
    h = create_test_target
    h['c'] = 1
    h['b'] = 2
    h['g'] = 3
    h['a'] = 4
    h['e'] = 5
    h['i'] = 6
    h['d'] = 7
    h['f'] = 8
    h['h'] = 9
    h['j'] = 10
    assert_equal '(e (c (b a) d) (g f (i h j)))', h.dump_sexp
    h.delete('g')
    assert_equal '(e (c (b a) d) (h f (i - j)))', h.dump_sexp
  end

  def test_delete_node_left
    h = create_test_target
    h['h'] = 1
    h['i'] = 2
    h['d'] = 3
    h['j'] = 4
    h['f'] = 5
    h['b'] = 6
    h['g'] = 7
    h['e'] = 8
    h['c'] = 9
    h['a'] = 10
    assert_equal '(f (d (b a c) e) (h g (i - j)))', h.dump_sexp
    h.delete('d')
    assert_equal '(f (b a (e c)) (h g (i - j)))', h.dump_sexp
  end

  def test_delete_root
    h = create_test_target
    h['b'] = 1
    h['a'] = 2
    h['c'] = 3
    assert_equal 1, h['b']
    assert_equal '(b a c)', h.dump_sexp
    h.delete('b')
    assert_equal '(c a)', h.dump_sexp
    assert_equal nil, h['b']
  end

  def test_delete
    h = create_test_target
    h['a'] = 1
    h['ab'] = 2
    h['abc'] = 3
    h['abd'] = 4
    h['ac'] = 5
    h['b'] = 6
    assert_equal 6, h.size
    assert_equal nil, h.delete('XXX')
    # delete leaf
    assert_equal 4, h.delete('abd')
    assert_equal 5, h.size
    assert_equal 1, h['a']
    assert_equal 2, h['ab']
    assert_equal 3, h['abc']
    assert_equal nil, h['abd']
    assert_equal 5, h['ac']
    assert_equal 6, h['b']
    # delete single leaf node
    assert_equal 2, h.delete('ab')
    assert_equal 4, h.size
    assert_equal 1, h['a']
    assert_equal nil, h['ab']
    assert_equal 3, h['abc']
    assert_equal nil, h['abd']
    assert_equal 5, h['ac']
    assert_equal 6, h['b']
    # delete multiple leaf node
    assert_equal 1, h.delete('a')
    assert_equal 3, h.size
    assert_equal nil, h['a']
    assert_equal nil, h['ab']
    assert_equal 3, h['abc']
    assert_equal nil, h['abd']
    assert_equal 5, h['ac']
    assert_equal 6, h['b']
    assert_equal ['abc', 'ac', 'b'].sort, h.keys.sort
    # delete rest
    assert_equal 3, h.delete('abc')
    assert_equal 5, h.delete('ac')
    assert_equal 6, h.delete('b')
    assert_equal 0, h.size
    assert h.empty?
  end

  def test_delete_right
    h = create_test_target
    h['f'] = 1
    h['e'] = 2
    h['d'] = 3
    h['c'] = 4
    h['b'] = 5
    h['a'] = 6
    assert_equal 6, h.size
    assert_equal nil, h.delete('XXX')
    # delete leaf
    assert_equal 4, h.delete('c')
    assert_equal 5, h.size
    assert_equal 1, h['f']
    assert_equal 2, h['e']
    assert_equal 3, h['d']
    assert_equal nil, h['c']
    assert_equal 5, h['b']
    assert_equal 6, h['a']
    # delete single leaf node
    assert_equal 2, h.delete('e')
    assert_equal 4, h.size
    assert_equal 1, h['f']
    assert_equal nil, h['e']
    assert_equal 3, h['d']
    assert_equal nil, h['c']
    assert_equal 5, h['b']
    assert_equal 6, h['a']
    # delete multiple leaf node
    assert_equal 1, h.delete('f')
    assert_equal 3, h.size
    assert_equal nil, h['f']
    assert_equal nil, h['e']
    assert_equal 3, h['d']
    assert_equal nil, h['c']
    assert_equal 5, h['b']
    assert_equal 6, h['a']
    assert_equal ['a', 'b', 'd'].sort, h.keys.sort
    # delete rest
    assert_equal 3, h.delete('d')
    assert_equal 5, h.delete('b')
    assert_equal 6, h.delete('a')
    assert_equal 0, h.size
    assert h.empty?
  end

  def test_delete_compaction_middle
    h = create_test_target
    h['a'] = 1
    h['abc'] = 2
    h['bb'] = 3
    h['abcdefghi'] = 4
    h['abcdefghijzz'] = 5
    h['abcdefghikzz'] = 6
    assert_equal 6, h.dump_tree.split($/).size
    h.delete('a')
    assert_equal 5, h.dump_tree.split($/).size
    h['a'] = 1
    assert_equal 6, h.dump_tree.split($/).size
  end

  def test_delete_compaction_leaf
    h = create_test_target
    h['a'] = 1
    h['abc'] = 2
    h['bb'] = 3
    h['abcdefghijzz'] = 4
    assert_equal 4, h.dump_tree.split($/).size
    h['abcdefghikzz'] = 5
    assert_equal 5, h.dump_tree.split($/).size
    h.delete('abcdefghijzz')
    assert_equal 4, h.dump_tree.split($/).size
    h['abcdefghijzz'] = 4
    assert_equal 5, h.dump_tree.split($/).size
  end

  def test_delete_balanced_rotate_left
    h = create_test_target
    h['f'] = 1
    h['c'] = 100
    h['l'] = 1
    h['b'] = 100
    h['e'] = 1
    h['i'] = 1
    h['m'] = 1
    h['a'] = 100
    h['d'] = 1
    h['h'] = 1
    h['k'] = 1
    h['n'] = 1
    h['j'] = 1
    h['g'] = 1
    assert_equal '(f (c (b a) (e d)) (l (i (h g) (k j)) (m - n)))', h.dump_sexp
    assert_equal 14, h.size
    # reduce black from the left node
    assert_equal 100, h.delete('b')
    assert_equal 100, h.delete('a')
    # double rotation at 'l' and 'f' node
    assert_equal 100, h.delete('c')
    assert_equal 11, h.size
    assert_equal '(i (f (d - e) (h g)) (l (k j) (m - n)))', h.dump_sexp
  end

  def test_delete_balanced_rotate_right
    h = create_test_target
    h['i'] = 1
    h['l'] = 100
    h['c'] = 1
    h['m'] = 100
    h['j'] = 1
    h['f'] = 1
    h['b'] = 1
    h['n'] = 100
    h['k'] = 1
    h['g'] = 1
    h['d'] = 1
    h['a'] = 1
    h['e'] = 1
    h['h'] = 1
    assert_equal '(i (c (b a) (f (d - e) (g - h))) (l (j - k) (m - n)))', h.dump_sexp
    assert_equal 14, h.size
    # reduce black from the left node
    assert_equal 100, h.delete('m')
    assert_equal 100, h.delete('n')
    # double rotation at 'c' and 'i' node
    assert_equal 100, h.delete('l')
    assert_equal 11, h.size
    assert_equal '(f (c (b a) (d - e)) (i (g - h) (k j)))', h.dump_sexp
  end

  def test_delete_different_type
    h = create_test_target
    h['a'] = 1
    h['abc'] = 2
    h['bb'] = 3

    assert_raise(TypeError) do
      h.delete(3.3)
    end
  end

  def test_each
    h = create_test_target
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s.to_a.sort_by { |k, v| k }, h.each.sort_by { |k, v| k }
    #
    values = []
    h.each do |k, v|
      values << [k, v]
    end
    assert_equal s.to_a.sort_by { |k, v| k }, values.sort_by { |k, v| k }
  end

  def test_each_key
    h = create_test_target
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s.keys.sort, h.each_key.sort
    #
    values = []
    h.each_key do |k|
      values << k
    end
    assert_equal s.keys.sort, values.sort
  end

  def test_each_value
    h = create_test_target
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6, 'azzzzz' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s.values.sort, h.each_value.sort
    #
    values = []
    h.each_value do |v|
      values << v
    end
    assert_equal s.values.sort, values.sort
  end

  def test_keys
    h = create_test_target
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s.keys.sort, h.keys.sort
  end

  def test_values
    h = create_test_target
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s.values.sort, h.values.sort
  end

  def test_to_s
    h = create_test_target
    h[5] = 1
    assert_equal 1, h[5]
    assert_nil h["5"]
  end

  def test_key?
    h = create_test_target
    assert !h.key?('a')
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert h.key?('a')
  end

  def test_default
    assert_raise(ArgumentError) do
      create_test_target('both') { :not_allowed }
    end

    h = create_test_target('abc')
    assert_equal 'abc', h['foo']
    assert_equal 'abc', h['bar']
    assert h['baz'].object_id == h['qux'].object_id

    h = create_test_target { [1, 2] }
    assert_equal [1, 2], h['foo']
    assert_equal [1, 2], h['bar']
    assert h['baz'].object_id != h['qux'].object_id
  end

  def test_to_hash
    h = create_test_target
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s, h.to_hash
  end

  def test_clear
    h = create_test_target
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s, h.to_hash
    h.clear
    assert_equal 0, h.size
    assert h.to_hash.empty?
  end

  def test_non_string_keys
    h = create_test_target
    h[1.3] = 'a'
    h[4.3] = 'b'

    assert_equal [1.3, 'a' ], h.first
  end

  def test_values_for_empty_tree
    h = create_test_target

    assert_equal [], h.values
  end

  def test_check_height_on_empty_tree
    h = create_test_target

    assert_nothing_raised { h.root.check_height }
  end

  if RUBY_VERSION >= '1.9.0'
    # In contrast to RadixTree, RedBlackTree just uses String#<=> as-is
    def test_encoding
      h = create_test_target
      s = { 'ああ' => 1, 'あい' => 2, 'いい' => 3, 'いう' => 4, 'あ' => 5, 'あいう' => 6 }
      s.each do |k, v|
        h[k] = v
      end
      assert_equal 6, h.size
      s.each do |k, v|
        assert_equal v, h[k]
      end
      str = 'ああ'
      str.force_encoding('US-ASCII')
      # it's nil for RadixTree because RadixTree uses char-to-char comparison
      assert_equal 1, h[str]
    end
  end
end

class TestRedBlackTree < Test::Unit::TestCase
  include RedBlackTreeTest

  def create_test_target(*a, &b)
    RedBlackTree.new(*a, &b)
  end
end

class TestConcurrentRedBlackTree < Test::Unit::TestCase
  include RedBlackTreeTest

  def create_test_target(*a, &b)
    ConcurrentRedBlackTree.new(*a, &b)
  end
end
