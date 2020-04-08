# -*- encoding: utf-8 -*-
require File.expand_path('./helper', File.dirname(__FILE__))

class TestAVLTree < Test::Unit::TestCase
  def test_tree_rotate_RR
    h = AVLTree.new
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
    h = AVLTree.new
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
    h = AVLTree.new
    h['b'] = 1
    h['a'] = 2
    h['e'] = 3
    h['d'] = 4
    h['f'] = 5
    assert_equal '(b a (e d f))', h.dump_sexp
    h['c'] = 6
    assert_equal '(d (b a c) (e - f))', h.dump_sexp
  end

  def test_tree_rotate_LR
    h = AVLTree.new
    h['g'] = 1
    h['b'] = 2
    h['h'] = 3
    h['i'] = 4
    h['a'] = 5
    h['d'] = 6
    h['0'] = 7
    h['c'] = 8
    h['e'] = 9
    assert_equal '(g (b (a 0) (d c e)) (h - i))', h.dump_sexp
    h['f'] = 10
    assert_equal '(d (b (a 0) c) (g (e - f) (h - i)))', h.dump_sexp
  end

  def test_aref_nil
    h = AVLTree.new
    h['abc'] = 1
    assert_equal nil, h['def']
  end

  def test_empty
    h = AVLTree.new
    h['abc'] = 0
    assert_equal nil, h['']
    h[''] = 1
    assert_equal 1, h['']
    h.delete('')
    assert_equal nil, h['']
  end

  def test_aref_single
    h = AVLTree.new
    h['abc'] = 1
    assert_equal 1, h['abc']
  end

  def test_aref_double
    h = AVLTree.new
    h['abc'] = 1
    h['def'] = 2
    assert_equal 1, h['abc']
    assert_equal 2, h['def']
  end

  def test_aset_override
    h = AVLTree.new
    h['abc'] = 1
    h['abc'] = 2
    assert_equal 2, h['abc']
  end

  def test_split
    h = AVLTree.new
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
    h = AVLTree.new
    h['ab'] = 1
    h['a'] = 2
    assert_equal 1, h['ab']
    assert_equal 2, h['a']
  end

  def test_push
    h = AVLTree.new
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
    h = AVLTree.new
    h['a'] = 1
    assert_raise(TypeError) do
      h[3.3] = 2
    end
    assert_nil h[3.3]
  end

  def test_delete_leaf
    h = AVLTree.new
    h['b'] = 1
    h['a'] = 2
    h['c'] = 3
    assert_equal 2, h['a']
    h.delete('a')
    assert_equal nil, h['a']
  end

  def test_delete_leaf_single_rotation
    h = AVLTree.new
    h['b'] = 1
    h['a'] = 2
    h['d'] = 3
    h['c'] = 4
    h['e'] = 5
    assert_equal '(b a (d c e))', h.dump_sexp
    h.delete('a')
    assert_equal '(d (b - c) e)', h.dump_sexp
  end

  def test_delete_leaf_double_rotation
    h = AVLTree.new
    h['b'] = 1
    h['a'] = 2
    h['e'] = 3
    h['0'] = 4
    h['c'] = 5
    h['f'] = 6
    h['d'] = 7
    assert_equal '(b (a 0) (e (c - d) f))', h.dump_sexp
    h.delete('0')
    assert_equal '(c (b a) (e d f))', h.dump_sexp
  end

  def test_delete_node_right
    h = AVLTree.new
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
    assert_equal '(c (b a) (g (e d f) (i h j)))', h.dump_sexp
    h.delete('g')
    assert_equal '(c (b a) (h (e d f) (i - j)))', h.dump_sexp
  end

  def test_delete_node_left
    h = AVLTree.new
    h['c'] = 1
    h['b'] = 2
    h['d'] = 3
    h['a'] = 4
    assert_equal '(c (b a) d)', h.dump_sexp
    h.delete('b')
    assert_equal '(c a d)', h.dump_sexp
  end

  def test_delete_root
    h = AVLTree.new
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
    h = AVLTree.new
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

  def test_delete_compaction_middle
    h = AVLTree.new
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
    h = AVLTree.new
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

  def test_delete_different_type
    h = AVLTree.new
    h['a'] = 1
    h['abc'] = 2
    h['bb'] = 3

    assert_raise(TypeError) do
      h.delete(3.3)
    end
  end

  def test_each
    h = AVLTree.new
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
    h = AVLTree.new
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
    h = AVLTree.new
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
    h = AVLTree.new
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s.keys.sort, h.keys.sort
  end

  def test_values
    h = AVLTree.new
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s.values.sort, h.values.sort
  end

  def test_to_s
    h = AVLTree.new
    h[5] = 1
    assert_equal 1, h[5]
    assert_nil h["5"]
  end

  def test_key?
    h = AVLTree.new
    assert !h.key?('a')
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert h.key?('a')
  end

  def test_default
    assert_raise(ArgumentError) do
      AVLTree.new('both') { :not_allowed }
    end

    h = AVLTree.new('abc')
    assert_equal 'abc', h['foo']
    assert_equal 'abc', h['bar']
    assert h['baz'].object_id == h['qux'].object_id

    h = AVLTree.new { [1, 2] }
    assert_equal [1, 2], h['foo']
    assert_equal [1, 2], h['bar']
    assert h['baz'].object_id != h['qux'].object_id
  end

  def test_to_hash
    h = AVLTree.new
    s = { 'aa' => 1, 'ab' => 2, 'bb' => 3, 'bc' => 4, 'a' => 5, 'abc' => 6 }
    s.each do |k, v|
      h[k] = v
    end
    assert_equal s, h.to_hash
  end

  def test_clear
    h = AVLTree.new
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
    h = AVLTree.new
    h[1.3] = 'a'
    h[4.3] = 'b'

    assert_equal [1.3, 'a' ], h.first
  end

  def test_values_for_empty_tree
    h = AVLTree.new

    assert_equal [], h.values
  end

  def test_height
    h = AVLTree.new
    assert_equal 0, h.height
    h[1] = true
    assert_equal 1, h.height
    h[2] = true
    assert_equal 2, h.height
    h[3] = true
    assert_equal 2, h.height
    h[4] = true
    assert_equal 3, h.height
    h[5] = true
    assert_equal 3, h.height
    h[6] = true
    assert_equal 3, h.height
    h[7] = true
    assert_equal 3, h.height
    h[8] = true
    assert_equal 4, h.height
    h.delete(8)
    assert_equal 3, h.height
    h.delete(7)
    assert_equal 3, h.height
    h.delete(6)
    assert_equal 3, h.height
    h.delete(5)
    assert_equal 3, h.height
    h.delete(4)
    assert_equal 2, h.height
    h.delete(3)
    assert_equal 2, h.height
    h.delete(2)
    assert_equal 1, h.height
    h.delete(1)
    assert_equal 0, h.height
  end

  if RUBY_VERSION >= '1.9.0'
    # In contrast to RadixTree, AVLTree just uses String#<=> as-is
    def test_encoding
      h = AVLTree.new
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
