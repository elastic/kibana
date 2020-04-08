# encoding: utf-8

require "logstash/util/loggable"

module LogStash
  class SnmpMibError < StandardError
  end

  class SnmpMib
    include LogStash::Util::Loggable

    attr_reader :tree

    class Oid
      def self.parse(oid)
        oid.split(".").map(&:to_i)
      end
    end

    class BaseNode
      attr_accessor :name, :childs

      def initialize(name)
        @name = name
        @childs = []
      end
    end

    class Node < BaseNode
      attr_reader :node_type, :module_name, :oid, :oid_path

      def initialize(node_type, name, module_name, oid)
        super(name)
        @node_type = node_type
        @module_name = module_name
        @oid = oid
        @oid_path = Oid.parse(oid)
      end
    end

    class Tree
      include LogStash::Util::Loggable

      def initialize
        @root = BaseNode.new("root")
      end

      def add_node(node)
        current = @root
        path = node.oid_path.dup

        # follow the OID path up until but not including the last node
        # and add intermediate missing nodes if needed
        last_node = path.pop
        path.each do |i|
          if current.childs[i].nil?
            current.childs[i] = BaseNode.new(i.to_s)
          end
          current = current.childs[i]
        end

        if current.childs[last_node] && current.childs[last_node].name != node.name
          logger.debug("warning: overwriting MIB OID '#{node.oid}' and name '#{current.childs[last_node].name}' with new name '#{node.name}' from module '#{node.module_name}'")
         end

        # preserve previous childs if replacing a node
        node.childs = current.childs[last_node].childs.dup if current.childs[last_node]

        current.childs[last_node] = node
      end

      def map_oid(oid, strip_root = 0, path_length = 0)
        path = Oid.parse(oid)

        result = []
        node = @root

        loop do
          break if path.empty?
          i = path.shift

          node = node.childs[i]

          if node.nil?
            result += path.unshift(i)
            break
          end
          result << node.name
        end

	if strip_root > 0
	  result.drop(strip_root).join(".")
	elsif path_length > 0
	  result.pop(path_length).join(".")
	else
	  result.join(".")
	end
      end
    end

    def initialize
      @tree = Tree.new
    end

    # add a specific mib dic file or all mib dic files of the given directory to the current mib database
    # @param path [String] a file or directory path to mib dic file(s)
    # @return [Array] array of warning strings if any OID or name has been overwritten or the empty array when no warning
    def add_mib_path(path)
      dic_files = if ::File.directory?(path)
        Dir[::File.join(path, "*.dic")]
      elsif ::File.file?(path)
        [path]
      else
        raise(SnmpMibError, "file or directory path expected: #{path.to_s}")
      end

      dic_files.each do |f|
        module_name, nodes = read_mib_dic(f)
        nodes.each do |k, v|
          @tree.add_node(Node.new(v["nodetype"], k, v["moduleName"], v["oid"]))
        end
      end
    end

    # read and parse a mib dic file
    #
    # @param filename [String] file path of a mib dic file
    # @return [[String, Hash, Hash, Hash]] the 2-tuple of the mib module name and the complete nodes
    def read_mib_dic(filename)
      mib = eval_mib_dic(filename)

      raise(SnmpMibError, "invalid mib dic format for file #{filename}") unless mib
      module_name = mib["moduleName"]

      raise(SnmpMibError, "invalid mib dic format for file #{filename}") unless module_name
      nodes = mib["nodes"] || []

      if nodes.empty?
        logger.warn("no nodes defined in mib dic file #{filename}")
      end

      [module_name, nodes]
    end

    def map_oid(oid, strip_root = 0, path_length = 0)
      @tree.map_oid(oid, strip_root, path_length)
    end

    private

    def eval_mib_dic(filename)
      mib_dic = IO.read(filename)
      mib_hash = mib_dic.
        gsub(':', '=>').                  # fix hash syntax
        gsub('(', '[').gsub(')', ']').    # fix tuple syntax
        sub('FILENAME =', 'filename =').  # get rid of constants
        sub('MIB =', 'mib =')

      mib = nil
      eval(mib_hash)
      mib
    rescue Exception => e
      # rescuing Exception class is important here to rescue SyntaxError from eval
      raise(SnmpMibError, "error parsing mib dic file: #{filename}, error: #{e.message}")
    end
  end
end
