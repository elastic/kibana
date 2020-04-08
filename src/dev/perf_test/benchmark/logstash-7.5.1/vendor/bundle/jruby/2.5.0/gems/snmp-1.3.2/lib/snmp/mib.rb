# frozen_string_literal: true
#
# Copyright (c) 2004-2014 David R. Halliday
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#

require 'snmp/varbind'
require 'fileutils'
require 'yaml'

module SNMP

  class MIB

    #:stopdoc:
    data_path = File.expand_path(File.dirname(__FILE__) + "/../../data/ruby/snmp/mibs")
    DEFAULT_MIB_PATH = if (File.exist?(data_path))
      data_path
    else
      warn "Could not find default MIB directory, tried:\n  #{data_path}"
      nil
    end
    #:startdoc:

    MODULE_EXT = 'yaml'

    class ModuleNotLoadedError < RuntimeError; end

    class << self
      ##
      # Import an SMIv2 MIB file for later loading.  A module only needs to
      # be installed once.
      #
      #   module_file - the filename of the module to be imported
      #   mib_dir - the output directory for the serialized MIB data
      #
      # NOTE: This implementation requires that the 'smidump' tool is available
      # in the PATH.  This tool can be obtained from the libsmi website at
      # http://http://www.ibr.cs.tu-bs.de/projects/libsmi/ .
      #
      # ALSO NOTE: The file format in future releases is subject to
      # change.  For now, it is a simple YAML hash with the MIB symbol
      # as the key and the OID as the value.  These files could be
      # generated manually if 'smidump' is not available.
      #
      # Here is an example of the contents of an output file:
      #
      #   ---
      #   ipDefaultTTL: 1.3.6.1.2.1.4.2
      #   ipForwDatagrams: 1.3.6.1.2.1.4.6
      #   ipOutRequests: 1.3.6.1.2.1.4.10
      #   ipOutNoRoutes: 1.3.6.1.2.1.4.12
      #   ipReasmTimeout: 1.3.6.1.2.1.4.13
      #   icmpInDestUnreachs: 1.3.6.1.2.1.5.3
      #
      def import_module(module_file, mib_dir=DEFAULT_MIB_PATH)
        raise "smidump tool must be installed" unless import_supported?
        FileUtils.makedirs mib_dir
        mib_hash = `smidump -k -f python #{module_file}`
        mib = eval_mib_data(mib_hash)
        if mib
          module_name = mib["moduleName"]
          raise "#{module_file}: invalid file format; no module name" unless module_name
          if mib["nodes"]
            oid_hash = {}
            mib["nodes"].each { |key, value| oid_hash[key] = value["oid"] }
            if mib["notifications"]
              mib["notifications"].each { |key, value| oid_hash[key] = value["oid"] }
            end
            File.open(module_file_name(module_name, mib_dir), 'w') do |file|
              YAML.dump(oid_hash, file)
              file.puts
            end
            module_name
          else
            warn "*** No nodes defined in: #{module_file} ***"
            nil
          end
        else
          warn "*** Import failed for: #{module_file} ***"
          nil
        end
      end

      ##
      # Returns the full filename of the imported MIB file for the given
      # module name.
      #
      def module_file_name(module_name, mib_dir=DEFAULT_MIB_PATH)
        File.join(mib_dir, module_name + "." + MODULE_EXT)
      end

      ##
      # The MIB.import_module method is only supported if the external
      # 'smidump' tool is available.  This method returns true if a
      # known version of the tool is available.
      #
      def import_supported?
        `smidump --version` =~ /^smidump 0.[45]/  && $? == 0
      end

      ##
      # Returns a list of MIB modules that have been imported.  All of
      # the current IETF MIBs should be available from the default
      # MIB directory.
      #
      # If a regex is provided, then the module names are matched
      # against that pattern.
      #
      def list_imported(regex=//, mib_dir=DEFAULT_MIB_PATH)
        list = []
        Dir["#{mib_dir}/*.#{MODULE_EXT}"].each do |name|
          module_name = File.basename(name, ".*")
          list << module_name if module_name =~ regex
        end
        list
      end

      private

        def eval_mib_data(mib_hash)
          ruby_hash = mib_hash.
            gsub(':', '=>').                  # fix hash syntax
            gsub('(', '[').gsub(')', ']').    # fix tuple syntax
            sub('FILENAME =', 'filename =').  # get rid of constants
            sub('MIB =', 'mib =')
          mib = nil
          eval(ruby_hash)
          mib
        end
    end # class methods

    def initialize
      @by_name = {}
      @by_module_by_name = {}
      @by_oid = {}
    end

    ##
    # Loads a module into this MIB.  The module must be imported before it
    # can be loaded.  See MIB.import_module .
    #
    def load_module(module_name, mib_dir=DEFAULT_MIB_PATH)
      oid_hash = nil
      File.open(MIB.module_file_name(module_name, mib_dir)) do |file|
        oid_hash = YAML.load(file.read)
      end
      @by_name.merge!(oid_hash) do |key, old, value|
        warn "warning: overwriting old MIB name '#{key}'"
      end
      @by_module_by_name[module_name] = {}
      @by_module_by_name[module_name].merge!(oid_hash)

      name_hash = Hash[ oid_hash.invert.to_a.collect { |oid, name| [oid, "#{module_name}::#{name}"] } ]
      @by_oid.merge!(name_hash)
    end

    ##
    # Returns a VarBindList for the provided list of objects.  If a
    # string is provided it is interpretted as a symbolic OID.
    #
    # This method accepts many different kinds of objects:
    # - single string object IDs e.g. "1.3.6.1" or "IF-MIB::ifTable.1.1"
    # - single ObjectId
    # - list of string object IDs
    # - list of ObjectIds
    # - list of VarBinds
    #
    def varbind_list(object_list, option=:KeepValue)
      raise ArgumentError, "A list of ObjectId or VarBind objects is NilClass" if object_list.nil?
      vb_list = VarBindList.new
      if object_list.respond_to? :to_str
        vb_list << oid(object_list).to_varbind
      elsif object_list.respond_to? :to_varbind
        vb_list << apply_option(object_list.to_varbind, option)
      else
        object_list.each do |item|
          if item.respond_to? :to_str
            varbind = oid(item).to_varbind
          else
            varbind = item.to_varbind
          end
          vb_list << apply_option(varbind, option)
        end
      end
      vb_list
    end

    def apply_option(varbind, option)
      if option == :NullValue
        varbind.value = Null
      elsif option != :KeepValue
        raise ArgumentError, "invalid option: #{option.to_s}", caller
      end
      varbind
    end
    private :apply_option

    ##
    # Returns a VarBind object for the given name and value.  The name
    # can be a String, ObjectId, or anything that responds to :to_varbind.
    #
    # String names are in the format <ModuleName>::<NodeName>.<Index> with
    # ModuleName and Index being optional.
    #
    def varbind(name, value=Null)
      if name.respond_to? :to_str
        vb = VarBind.new(oid(name), value)
      else
        vb = name.to_varbind
        vb.value = value
      end
      vb
    end

    ##
    # Returns an ObjectId for the given name.  Names are in the format
    # <ModuleName>::<NodeName>.<Index> with ModuleName and Index being
    # optional.
    #
    def oid(name)
      module_parts = name.to_str.split("::")
      if module_parts.length == 1
        parse_oid(@by_name, name.to_str)
      elsif module_parts.length == 2
        module_name = module_parts[0]
        oid = module_parts[1]
        module_hash = @by_module_by_name[module_name]
        if module_hash
          parse_oid(module_hash, oid)
        else
          raise ModuleNotLoadedError, "module '#{module_name}' not loaded"
        end
      else
        raise ArgumentError, "invalid format: #{name.to_str}"
      end
    end

    ##
    # Returns the symbolic name of the given OID.
    #
    # e.g. OID "1.3.6.1.2.1.1.0" returns symbol "SNMPv2-MIB::system.0"
    #
    def name(oid)
      current_oid = ObjectId.new(oid)
      index = []
      while current_oid.size > 1
        name = @by_oid[current_oid.to_s]
        if name
          return index.empty? ? name : "#{name}.#{index.join('.')}"
        end
        index.unshift current_oid.slice!(-1)
      end
      ObjectId.new(oid).to_s
    end

    def parse_oid(node_hash, name)
      oid_parts = name.split(".")
      first_part = oid_parts.shift
      oid_string = node_hash[first_part]
      if oid_string
        oid_array = oid_string.split(".")
      else
        oid_array = [first_part]
      end
      oid_array.concat(oid_parts)
      ObjectId.new(oid_array)
    end
    private :parse_oid

  end

end # module SNMP
