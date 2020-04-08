# encoding: utf-8

module FileWatch module Stat
  class WindowsPath

    attr_reader :identifier, :inode, :modified_at, :size, :inode_struct

    def initialize(source)
      @source = source
      @inode = Winhelper.identifier_from_path(@source.to_path)
      @dev_major = 0
      @dev_minor = 0
      # in windows the dev hi and low are in the identifier
      @inode_struct = InodeStruct.new(@inode, @dev_major, @dev_minor)
      restat
    end

    def restat
      @inner_stat = @source.stat
      @modified_at = @inner_stat.mtime.to_f
      @size = @inner_stat.size
    end

    def windows?
      true
    end

    def inspect
      "<WindowsPath size='#{@size}', modified_at='#{@modified_at}', inode='#{@inode}', inode_struct='#{@inode_struct}'>"
    end
  end
end end
