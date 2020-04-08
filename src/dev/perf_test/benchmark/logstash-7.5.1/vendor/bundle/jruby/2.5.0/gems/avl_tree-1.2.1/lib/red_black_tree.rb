require 'atomic'

class RedBlackTree
  include Enumerable

  class Node
    UNDEFINED = Object.new

    attr_reader :key, :value, :color
    attr_reader :left, :right

    def initialize(key, value, left, right, color = :RED)
      @key = key
      @value = value
      @left = left
      @right = right
      # new node is added as RED
      @color = color
    end

    def set_root
      @color = :BLACK
    end

    def red?
      @color == :RED
    end

    def black?
      @color == :BLACK
    end

    def empty?
      false
    end

    def size
      @left.size + 1 + @right.size
    end

    # inorder
    def each(&block)
      @left.each(&block)
      yield [@key, @value]
      @right.each(&block)
    end

    def each_key
      each do |k, v|
        yield k
      end
    end

    def each_value
      each do |k, v|
        yield v
      end
    end

    def keys
      collect { |k, v| k }
    end

    def values
      collect { |k, v| v }
    end

    # returns new_root
    def insert(key, value)
      ret = self
      case key <=> @key
      when -1
        @left = @left.insert(key, value)
        if black? and @right.black? and @left.red? and !@left.children_color?(:BLACK)
          ret = rebalance_for_left_insert
        end
      when 0
        @value = value
      when 1
        @right = @right.insert(key, value)
        if black? and @left.black? and @right.red? and !@right.children_color?(:BLACK)
          ret = rebalance_for_right_insert
        end
      else
        raise TypeError, "cannot compare #{key} and #{@key} with <=>"
      end
      ret.pullup_red
    end

    # returns value
    def retrieve(key)
      case key <=> @key
      when -1
        @left.retrieve(key)
      when 0
        @value
      when 1
        @right.retrieve(key)
      else
        nil
      end
    end

    # returns [deleted_node, new_root, is_rebalance_needed]
    def delete(key)
      ret = self
      case key <=> @key
      when -1
        deleted, @left, rebalance = @left.delete(key)
        if rebalance
          ret, rebalance = rebalance_for_left_delete
        end
      when 0
        deleted = self
        ret, rebalance = delete_node
      when 1
        deleted, @right, rebalance = @right.delete(key)
        if rebalance
          ret, rebalance = rebalance_for_right_delete
        end
      else
        raise TypeError, "cannot compare #{key} and #{@key} with <=>"
      end
      [deleted, ret, rebalance]
    end

    def dump_tree(io, indent = '')
      @right.dump_tree(io, indent + '  ')
      io << indent << sprintf("#<%s:0x%010x %s %s> => %s", self.class.name, __id__, @color, @key.inspect, @value.inspect) << $/
      @left.dump_tree(io, indent + '  ')
    end

    def dump_sexp
      left = @left.dump_sexp
      right = @right.dump_sexp
      if left or right
        '(' + [@key, left || '-', right].compact.join(' ') + ')'
      else
        @key
      end
    end

    # for debugging
    def check_height
      lh = @left.nil?  || @left.empty? ? 0 : @left.check_height
      rh = @right.nil? || @right.empty? ? 0 : @right.check_height
      if red?
        if @left.red? or @right.red?
          puts dump_tree(STDERR)
          raise 'red/red assertion failed'
        end
      else
        if lh != rh
          puts dump_tree(STDERR)
          raise "black height unbalanced: #{lh} #{rh}"
        end
      end
      (lh > rh ? lh : rh) + (black? ? 1 : 0)
    end

  protected

    def children_color?(color)
      @right.color == @left.color && @right.color == color
    end

    def color=(color)
      @color = color
    end

    def left=(left)
      @left = left
    end

    def right=(right)
      @right = right
    end

    def color_flip(other)
      @color, other.color = other.color, @color
    end

    def delete_min
      if @left.empty?
        [self, *delete_node]
      else
        ret = self
        deleted, @left, rebalance = @left.delete_min
        if rebalance
          ret, rebalance = rebalance_for_left_delete
        end
        [deleted, ret, rebalance]
      end
    end

    # trying to rebalance when the left sub-tree is 1 level lower than the right
    def rebalance_for_left_delete
      ret = self
      rebalance = false
      if black?
        if @right.black?
          if @right.children_color?(:BLACK)
            # make whole sub-tree 1 level lower and ask rebalance
            @right.color = :RED
            rebalance = true
          else
            # move 1 black from the right to the left by single/double rotation
            ret = balanced_rotate_left
          end
        else
          # flip this sub-tree into another type of 3-children node
          ret = rotate_left
          # try to rebalance in sub-tree
          ret.left, rebalance = ret.left.rebalance_for_left_delete
          raise 'should not happen' if rebalance
        end
      else # red
        if @right.children_color?(:BLACK)
          # make right sub-tree 1 level lower
          color_flip(@right)
        else
          # move 1 black from the right to the left by single/double rotation
          ret = balanced_rotate_left
        end
      end
      [ret, rebalance]
    end

    # trying to rebalance when the right sub-tree is 1 level lower than the left
    # See rebalance_for_left_delete.
    def rebalance_for_right_delete
      ret = self
      rebalance = false
      if black?
        if @left.black?
          if @left.children_color?(:BLACK)
            @left.color = :RED
            rebalance = true
          else
            ret = balanced_rotate_right
          end
        else
          ret = rotate_right
          ret.right, rebalance = ret.right.rebalance_for_right_delete
          raise 'should not happen' if rebalance
        end
      else # red
        if @left.children_color?(:BLACK)
          color_flip(@left)
        else
          ret = balanced_rotate_right
        end
      end
      [ret, rebalance]
    end

    # move 1 black from the right to the left by single/double rotation
    def balanced_rotate_left
      if @right.left.red? and @right.right.black?
        @right = @right.rotate_right
      end
      ret = rotate_left
      ret.right.color = ret.left.color = :BLACK
      ret
    end

    # move 1 black from the left to the right by single/double rotation
    def balanced_rotate_right
      if @left.right.red? and @left.left.black?
        @left = @left.rotate_left
      end
      ret = rotate_right
      ret.right.color = ret.left.color = :BLACK
      ret
    end

    # Right single rotation
    # (b a (D c E)) where D and E are RED --> (d (B a c) E)
    #
    #   b              d
    #  / \            / \
    # a   D    ->    B   E
    #    / \        / \
    #   c   E      a   c
    #
    def rotate_left
      root = @right
      @right = root.left
      root.left = self
      root.color_flip(root.left)
      root
    end

    # Left single rotation
    # (d (B A c) e) where A and B are RED --> (b A (D c e))
    #
    #     d          b
    #    / \        / \
    #   B   e  ->  A   D
    #  / \            / \
    # A   c          c   e
    #
    def rotate_right
      root = @left
      @left = root.right
      root.right = self
      root.color_flip(root.right)
      root
    end

    # Pull up red nodes
    # (b (A C)) where A and C are RED --> (B (a c))
    #
    #   b          B
    #  / \   ->   / \
    # A   C      a   c
    #
    def pullup_red
      if black? and children_color?(:RED)
        @left.color = @right.color = :BLACK
        self.color = :RED
      end
      self
    end

  private

    # trying to rebalance when the left sub-tree is 1 level higher than the right
    # precondition: self is black and @left is red
    def rebalance_for_left_insert
      # move 1 black from the left to the right by single/double rotation
      if @left.right.red?
        @left = @left.rotate_left
      end
      rotate_right
    end

    # trying to rebalance when the right sub-tree is 1 level higher than the left
    # See rebalance_for_left_insert.
    def rebalance_for_right_insert
      if @right.left.red?
        @right = @right.rotate_right
      end
      rotate_left
    end

    def delete_node
      rebalance = false
      if @left.empty? and @right.empty?
        # just remove this node and ask rebalance to the parent
        new_root = EMPTY
        if black?
          rebalance = true
        end
      elsif @left.empty? or @right.empty?
        # pick the single children
        new_root = @left.empty? ? @right : @left
        if black?
          # keep the color black
          raise 'should not happen' unless new_root.red?
          color_flip(new_root)
        else
          # just remove the red node
        end
      else
        # pick the minimum node from the right sub-tree and replace self with it
        deleted, @right, rebalance = @right.delete_min
        new_root = Node.new(deleted.key, deleted.value, @left, @right, @color)
        if rebalance
          new_root, rebalance = new_root.rebalance_for_right_delete
        end
      end
      [new_root, rebalance]
    end

    def collect
      pool = []
      each do |key, value|
        pool << yield(key, value)
      end
      pool
    end

    class EmptyNode < Node
      def initialize
        @value = nil
        @color = :BLACK
      end

      def empty?
        true
      end

      def size
        0
      end

      def each(&block)
        # intentionally blank
      end

      # returns new_root
      def insert(key, value)
        Node.new(key, value, self, self)
      end

      # returns value
      def retrieve(key)
        UNDEFINED
      end

      # returns [deleted_node, new_root, is_rebalance_needed]
      def delete(key)
        [self, self, false]
      end

      def dump_tree(io, indent = '')
        # intentionally blank
      end

      def dump_sexp
        # intentionally blank
      end
    end
    EMPTY = Node::EmptyNode.new.freeze
  end

  DEFAULT = Object.new

  attr_accessor :default
  attr_reader :default_proc

  def initialize(default = DEFAULT, &block)
    if block && default != DEFAULT
      raise ArgumentError, 'wrong number of arguments'
    end
    @root = Node::EMPTY
    @default = default
    @default_proc = block
  end

  def root
    @root
  end

  def empty?
    root == Node::EMPTY
  end

  def size
    root.size
  end
  alias length size

  def each(&block)
    if block_given?
      root.each(&block)
      self
    else
      Enumerator.new(root)
    end
  end
  alias each_pair each

  def each_key
    if block_given?
      root.each do |k, v|
        yield k
      end
      self
    else
      Enumerator.new(root, :each_key)
    end
  end

  def each_value
    if block_given?
      root.each do |k, v|
        yield v
      end
      self
    else
      Enumerator.new(root, :each_value)
    end
  end

  def keys
    root.keys
  end

  def values
    root.values
  end

  def clear
    @root = Node::EMPTY
  end

  def []=(key, value)
    @root = @root.insert(key, value)
    @root.set_root
    @root.check_height if $DEBUG
  end
  alias insert []=

  def key?(key)
    root.retrieve(key) != Node::UNDEFINED
  end
  alias has_key? key?

  def [](key)
    value = @root.retrieve(key)
    if value == Node::UNDEFINED
      default_value
    else
      value
    end
  end

  def delete(key)
    deleted, @root, rebalance = @root.delete(key)
    unless empty?
      @root.set_root
      @root.check_height if $DEBUG
    end
    deleted.value
  end

  def dump_tree(io = '')
    root.dump_tree(io)
    io << $/
    io
  end

  def dump_sexp
    root.dump_sexp || ''
  end

  def to_hash
    inject({}) { |r, (k, v)| r[k] = v; r }
  end

private

  def default_value
    if @default != DEFAULT
      @default
    elsif @default_proc
      @default_proc.call
    else
      nil
    end
  end
end

class ConcurrentRedBlackTree < RedBlackTree
  class ConcurrentNode < Node
    # direction: ~LEFT == RIGHT, ~RIGHT == LEFT
    LEFT = -1
    RIGHT = 0

    # @Overrides
    def insert(key, value)
      case key <=> @key
      when -1
        dir = LEFT
      when 0
        node = new_value(value)
      when 1
        dir = RIGHT
      else
        raise TypeError, "cannot compare #{key} and #{@key} with <=>"
      end
      if dir
        target = child(dir).insert(key, value)
        node = new_child(dir, target)
        if black? and child(~dir).black? and target.red? and !target.children_color?(:BLACK)
          node = node.rebalance_for_insert(dir)
        end
      end
      node.pullup_red
    end

    # @Overrides
    def retrieve(key)
      case key <=> @key
      when -1
        @left.retrieve(key)
      when 0
        @value
      when 1
        @right.retrieve(key)
      else
        nil
      end
    end

    # @Overrides
    def delete(key)
      case key <=> @key
      when -1
        dir = LEFT
      when 0
        deleted = self
        node, rebalance = delete_node
      when 1
        dir = RIGHT
      else
        raise TypeError, "cannot compare #{key} and #{@key} with <=>"
      end
      if dir
        deleted, target, rebalance = child(dir).delete(key)
        node = new_child(dir, target)
        if rebalance
          node, rebalance = node.rebalance_for_delete(dir)
        end
      end
      [deleted, node, rebalance]
    end

  protected

    def new_children(dir, node, other, color = @color)
      dir == LEFT ? 
        ConcurrentNode.new(@key, @value, node, other, color) :
        ConcurrentNode.new(@key, @value, other, node, color)
    end

    def new_child(dir, node, color = @color)
      dir == LEFT ? 
        ConcurrentNode.new(@key, @value, node, @right, color) :
        ConcurrentNode.new(@key, @value, @left, node, color)
    end

    def new_color(color)
      ConcurrentNode.new(@key, @value, @left, @right, color)
    end

    def new_value(value)
      ConcurrentNode.new(@key, value, @left, @right, @color)
    end

    def child(dir)
      dir == LEFT ? @left : @right
    end

    # @Overrides
    def delete_min
      if @left.empty?
        [self, *delete_node]
      else
        deleted, left, rebalance = @left.delete_min
        node = new_child(LEFT, left)
        if rebalance
          node, rebalance = node.rebalance_for_delete(LEFT)
        end
        [deleted, node, rebalance]
      end
    end

    # rebalance when the left/right sub-tree is 1 level lower than the right/left
    def rebalance_for_delete(dir)
      target = child(~dir)
      rebalance = false
      if black?
        if target.black?
          if target.children_color?(:BLACK)
            # make whole sub-tree 1 level lower and ask rebalance
            node = new_child(~dir, target.new_color(:RED))
            rebalance = true
          else
            # move 1 black from the right to the left by single/double rotation
            node = balanced_rotate(dir)
          end
        else
          # flip this sub-tree into another type of 3-children node
          node = rotate(dir)
          # try to rebalance in sub-tree
          target, rebalance = node.child(dir).rebalance_for_delete(dir)
          raise 'should not happen' if rebalance
          node = node.new_children(dir, target, node.child(~dir))
        end
      else # red
        if target.children_color?(:BLACK)
          # make right sub-tree 1 level lower
          node = new_child(~dir, target.new_color(@color), target.color)
        else
          # move 1 black from the right to the left by single/double rotation
          node = balanced_rotate(dir)
        end
      end
      [node, rebalance]
    end

    # move 1 black from the right/left to the left/right by single/double rotation
    def balanced_rotate(dir)
      target = child(~dir)
      if target.child(dir).red? and target.child(~dir).black?
        node = new_child(~dir, target.rotate(~dir))
      else
        node = self
      end
      node = node.rotate(dir)
      node.new_children(dir, node.child(dir).new_color(:BLACK), node.child(~dir).new_color(:BLACK))
    end

    # Right single rotation
    # (b a (D c E)) where D and E are RED --> (d (B a c) E)
    #
    #   b              d
    #  / \            / \
    # a   D    ->    B   E
    #    / \        / \
    #   c   E      a   c
    #
    # Left single rotation
    # (d (B A c) e) where A and B are RED --> (b A (D c e))
    #
    #     d          b
    #    / \        / \
    #   B   e  ->  A   D
    #  / \            / \
    # A   c          c   e
    #
    def rotate(dir)
      new_root = child(~dir)
      node = new_child(~dir, new_root.child(dir), new_root.color)
      new_root.new_children(dir, node, new_root.child(~dir), @color)
    end

    # Pull up red nodes
    # (b (A C)) where A and C are RED --> (B (a c))
    #
    #   b          B
    #  / \   ->   / \
    # A   C      a   c
    #
    # @Overrides
    def pullup_red
      if black? and @left.red? and @right.red?
        new_children(LEFT, @left.new_color(:BLACK), @right.new_color(:BLACK), :RED)
      else
        self
      end
    end

    # rebalance when the left/right sub-tree is 1 level higher than the right/left
    # move 1 black from the left to the right by single/double rotation
    #
    # precondition: self is black and @left/@right is red
    def rebalance_for_insert(dir)
      node = self
      if child(dir).child(~dir).red?
        node = new_child(dir, child(dir).rotate(dir))
      end
      node.rotate(~dir)
    end

  private

    # @Overrides
    def delete_node
      rebalance = false
      if @left.empty? and @right.empty?
        # just remove this node and ask rebalance to the parent
        new_node = EMPTY_CONCURRENT
        if black?
          rebalance = true
        end
      elsif @left.empty? or @right.empty?
        # pick the single children
        new_node = @left.empty? ? @right : @left
        if black?
          # keep the color black
          raise 'should not happen' unless new_node.red?
          new_node = new_node.new_color(@color)
        else
          # just remove the red node
        end
      else
        # pick the minimum node from the right sub-tree and replace self with it
        deleted, right, rebalance = @right.delete_min
        new_node = deleted.new_children(LEFT, @left, right, @color)
        if rebalance
          new_node, rebalance = new_node.rebalance_for_delete(RIGHT)
        end
      end
      [new_node, rebalance]
    end

    class EmptyConcurrentNode < EmptyNode
      # @Overrides
      def insert(key, value)
        ConcurrentNode.new(key, value, self, self)
      end
    end
    EMPTY_CONCURRENT = ConcurrentNode::EmptyConcurrentNode.new.freeze
  end

  def initialize(default = DEFAULT, &block)
    super
    @root = Atomic.new(ConcurrentNode::EMPTY_CONCURRENT)
  end

  def root
    @root.get
  end

  def empty?
    root == ConcurrentNode::EMPTY_CONCURRENT
  end

  def clear
    @root.set(ConcurrentNode::EMPTY_CONCURRENT)
  end

  def []=(key, value)
    @root.update { |root|
      root = root.insert(key, value)
      root.set_root
      root.check_height if $DEBUG
      root
    }
  end
  alias insert []=

  def [](key)
    value = @root.get.retrieve(key)
    if value == Node::UNDEFINED
      default_value
    else
      value
    end
  end

  def delete(key)
    deleted = nil
    @root.update { |root|
      deleted, root, rebalance = root.delete(key)
      unless root == ConcurrentNode::EMPTY_CONCURRENT
        root.set_root
        root.check_height if $DEBUG
      end
      root
    }
    deleted.value
  end
end
