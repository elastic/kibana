class AVLTree
  include Enumerable

  class Node
    UNDEFINED = Object.new

    attr_reader :key, :value, :height
    attr_reader :left, :right

    def initialize(key, value)
      @key, @value = key, value
      @left = @right = EMPTY
      @height = 1
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
      case key <=> @key
      when -1
        @left = @left.insert(key, value)
      when 0
        @value = value
      when 1
        @right = @right.insert(key, value)
      else
        raise TypeError, "cannot compare #{key} and #{@key} with <=>"
      end
      rotate
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

    # returns [deleted_node, new_root]
    def delete(key)
      case key <=> @key
      when -1
        deleted, @left = @left.delete(key)
        [deleted, self.rotate]
      when 0
        [self, delete_self.rotate]
      when 1
        deleted, @right = @right.delete(key)
        [deleted, self.rotate]
      else
        raise TypeError, "cannot compare #{key} and #{@key} with <=>"
      end
    end

    def delete_min
      if @left.empty?
        [self, delete_self]
      else
        deleted, @left = @left.delete_min
        [deleted, rotate]
      end
    end

    def delete_max
      if @right.empty?
        [self, delete_self]
      else
        deleted, @right = @right.delete_max
        [deleted, rotate]
      end
    end

    def dump_tree(io, indent = '')
      @right.dump_tree(io, indent + '  ')
      io << indent << sprintf("#<%s:0x%010x %d %s> => %s", self.class.name, __id__, height, @key.inspect, @value.inspect) << $/
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
      @left.check_height
      @right.check_height
      lh = @left.height
      rh = @right.height
      if (lh - rh).abs > 1
        puts dump_tree(STDERR)
        raise "height unbalanced: #{lh} #{height} #{rh}"
      end
      if (lh > rh ? lh : rh) + 1 != height
        puts dump_tree(STDERR)
        raise "height calc failure: #{lh} #{height} #{rh}"
      end
    end

  protected

    def left=(left)
      @left = left
    end

    def right=(right)
      @right = right
    end

    def update_height
      @height = (@left.height > @right.height ? @left.height : @right.height) + 1
    end

    def rotate
      case @left.height - @right.height
      when +2
        if @left.left.height < @left.right.height
          @left = @left.rotate_left
        end
        root = rotate_right
      when -2
        if @right.left.height > @right.right.height
          @right = @right.rotate_right
        end
        root = rotate_left
      else
        root = self
      end
      root.update_height
      root
    end

    # Right single rotation
    # (B a (D c E)) where D-a > 1 && E > c --> (D (B a c) E)
    #
    #   B              D
    #  / \            / \
    # a   D    ->    B   E
    #    / \        / \
    #   c   E      a   c
    #
    def rotate_left
      root = @right
      @right = root.left
      root.left = self
      root.left.update_height
      root
    end

    # Left single rotation
    # (D (B A c) e) where B-e > 1 && A > c --> (B A (D c e))
    #
    #     D          B
    #    / \        / \
    #   B   e  ->  A   D
    #  / \            / \
    # A   c          c   e
    #
    def rotate_right
      root = @left
      @left = root.right
      root.right = self
      root.right.update_height
      root
    end

  private

    def delete_self
      if @left.empty? and @right.empty?
        deleted = EMPTY
      elsif @right.height < @left.height
        deleted, new_left = @left.delete_max
        deleted.left, deleted.right = new_left, @right
      else
        deleted, new_right = @right.delete_min
        deleted.left, deleted.right = @left, new_right
      end
      deleted
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
        @height = 0
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
        Node.new(key, value)
      end

      # returns value
      def retrieve(key)
        UNDEFINED
      end

      # returns [deleted_node, new_root]
      def delete(key)
        [self, self]
      end

      def dump_tree(io, indent = '')
        # intentionally blank
      end

      def dump_sexp
        # intentionally blank
      end

      def rotate
        self
      end

      def update_height
        # intentionally blank
      end

      # for debugging
      def check_height
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

  def empty?
    @root == Node::EMPTY
  end

  def size
    @root.size
  end
  alias length size

  def height
    @root.height
  end

  def each(&block)
    if block_given?
      @root.each(&block)
      self
    else
      Enumerator.new(@root)
    end
  end
  alias each_pair each

  def each_key
    if block_given?
      @root.each do |k, v|
        yield k
      end
      self
    else
      Enumerator.new(@root, :each_key)
    end
  end

  def each_value
    if block_given?
      @root.each do |k, v|
        yield v
      end
      self
    else
      Enumerator.new(@root, :each_value)
    end
  end

  def keys
    @root.keys
  end

  def values
    @root.values
  end

  def clear
    @root = Node::EMPTY
  end

  def []=(key, value)
    @root = @root.insert(key, value)
  end
  alias insert []=

  def key?(key)
    @root.retrieve(key) != Node::UNDEFINED
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
    deleted, @root = @root.delete(key)
    deleted.value
  end

  def dump_tree(io = '')
    @root.dump_tree(io)
    io << $/
    io
  end

  def dump_sexp
    @root.dump_sexp || ''
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
