# frozen_string_literal: false
=begin
= Win32 DNS and DHCP I/F

=end

require 'win32/registry'

module Win32
  module Resolv
    API = Registry::API
    Error = Registry::Error

    def self.get_hosts_path
      path = get_hosts_dir
      path = File.expand_path('hosts', path)
      File.exist?(path) ? path : nil
    end

    def self.get_resolv_info
      search, nameserver = get_info
      if search.empty?
        search = nil
      else
        search.delete("")
        search.uniq!
      end
      if nameserver.empty?
        nameserver = nil
      else
        nameserver.delete("")
        nameserver.delete("0.0.0.0")
        nameserver.uniq!
      end
      [ search, nameserver ]
    end
  end
end


# JRuby specific use FFI instead of loading native .so
module Win32
  module Internal
    NO_ERROR, ERROR_BUFFER_OVERFLOW = 0, 111

    require 'ffi'

    class IP_ADDRESS_STRING < FFI::Struct
      layout :string, [:uint8, 16]
    end

    class IP_ADDR_STRING < FFI::Struct
      layout :next, IP_ADDR_STRING.ptr,
             :ip_address, IP_ADDRESS_STRING,
             :ip_mask_string, IP_ADDRESS_STRING,
             :context, :int
    end

    class FIXED_INFO < FFI::Struct
      layout :host_name, [:uint8, 128 + 4],
             :domain_name, [:uint8, 128 + 4],
             :current_dns_server, IP_ADDR_STRING.ptr,
             :dns_server_list, IP_ADDR_STRING,
             :node_type, :uint,
             :scope_id, [:uint8, 256 + 4],
             :enable_routine, :uint,
             :enable_proxy, :uint,
             :enable_dns, :uint
    end

    class IntPtr < FFI::Struct
      layout :value, :int
    end

    module Iphlpapi
      extend FFI::Library
      ffi_lib 'Iphlpapi'
      ffi_convention :stdcall

      attach_function :get_network_params, :GetNetworkParams, [:pointer, IntPtr], :int
    end
  end
end

module Win32
  module Resolv
    def self.get_dns_server_list
      size = Win32::Internal::IntPtr.new
      ret = Win32::Internal::Iphlpapi.get_network_params nil, size

      # We get buffer overflow because first arg to get_network_params is nil.
      if ret != Win32::Internal::NO_ERROR && ret != Win32::Internal::ERROR_BUFFER_OVERFLOW
        raise Win32::Resolv::Error
      end

      fixed_info = FFI::MemoryPointer.new size[:value] 
      ret = Win32::Internal::Iphlpapi.get_network_params fixed_info, size

      raise Win32::Resolv::Error if ret != Win32::Internal::NO_ERROR 

      fixed_info = Win32::Internal::FIXED_INFO.new fixed_info 

      addr = fixed_info[:dns_server_list]
      addresses = []

      while !addr.null? do # test condition on machines with no DNS entries at all.
        addresses << addr[:ip_address][:string].to_s
        break if addr[:next].null?
        addr = addr[:next]
      end

      addresses
    end
  end
end

nt = Module.new do
  break true if [nil].pack("p").size > 4
  extend Importer
  dlload "kernel32.dll"
  getv = extern "int GetVersionExA(void *)", :stdcall
  info = [ 148, 0, 0, 0, 0 ].pack('V5') + "\0" * 128
  getv.call(info)
  break info.unpack('V5')[4] == 2  # VER_PLATFORM_WIN32_NT
end
if not nt
  require_relative 'resolv9x'
  # return # does not work yet
else
module Win32
#====================================================================
# Windows NT
#====================================================================
  module Resolv
    module SZ
      refine Registry do
        # ad hoc workaround for broken registry
        def read_s(key)
          type, str = read(key)
          unless type == Registry::REG_SZ
            warn "Broken registry, #{name}\\#{key} was #{Registry.type2name(type)}, ignored"
            return String.new
          end
          str
        end
      end
    end
    using SZ

    TCPIP_NT = 'SYSTEM\CurrentControlSet\Services\Tcpip\Parameters'

    class << self
      private
      def get_hosts_dir
        Registry::HKEY_LOCAL_MACHINE.open(TCPIP_NT) do |reg|
          reg.read_s_expand('DataBasePath')
        end
      end

      def get_info
        search = nil
        nameserver = get_dns_server_list
        Registry::HKEY_LOCAL_MACHINE.open(TCPIP_NT) do |reg|
          begin
            slist = reg.read_s('SearchList')
            search = slist.split(/,\s*/) unless slist.empty?
          rescue Registry::Error
          end

          if add_search = search.nil?
            search = []
            begin
              nvdom = reg.read_s('NV Domain')
              unless nvdom.empty?
                @search = [ nvdom ]
                if reg.read_i('UseDomainNameDevolution') != 0
                  if /^\w+\./ =~ nvdom
                    devo = $'
                  end
                end
              end
            rescue Registry::Error
            end
          end

          reg.open('Interfaces') do |h|
            h.each_key do |iface, |
              h.open(iface) do |regif|
                next unless ns = %w[NameServer DhcpNameServer].find do |key|
                  begin
                    ns = regif.read_s(key)
                  rescue Registry::Error
                  else
                    break ns.split(/[,\s]\s*/) unless ns.empty?
                  end
                end
                next if (nameserver & ns).empty?

                if add_search
                  begin
                    [ 'Domain', 'DhcpDomain' ].each do |key|
                      dom = regif.read_s(key)
                      unless dom.empty?
                        search.concat(dom.split(/,\s*/))
                        break
                      end
                    end
                  rescue Registry::Error
                  end
                end
              end
            end
          end
          search << devo if add_search and devo
        end
        [ search.uniq, nameserver.uniq ]
      end
    end
  end
end
end
