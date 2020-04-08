# encoding: utf-8

module FileWatch module Stat
  class Generic

    attr_reader :identifier, :inode, :modified_at, :size, :inode_struct

    def initialize(source)
      @source = source
      @identifier = nil
      restat
    end

    def add_identifier(identifier) self; end

    def restat
      @inner_stat = @source.stat
      @inode = @inner_stat.ino.to_s
      @modified_at = @inner_stat.mtime.to_f
      @size = @inner_stat.size
      @dev_major = @inner_stat.dev_major
      @dev_minor = @inner_stat.dev_minor
      @inode_struct = InodeStruct.new(@inode, @dev_major, @dev_minor)
    end

    def windows?
      false
    end

    def inspect
      "<Generic size='#{@size}', modified_at='#{@modified_at}', inode='#{@inode}', inode_struct='#{@inode_struct}'>"
    end
  end
end end
