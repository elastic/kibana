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

module SNMP

  ##
  # Helper class for processing options Hash.
  #
  class Options #:nodoc:

    class << self
      attr_reader :alternates

      def option(symbol, alternate, defaulter=nil)
        @alternates ||= {}
        @alternates[symbol] = alternate
        define_method(symbol) do
          alternate_symbol = self.class.alternates[symbol]
          option_value = @config[symbol] || @config[alternate_symbol] ||
            (defaulter.kind_of?(Proc) ? defaulter.call(self) : defaulter)
          @applied_config[symbol] = @applied_config[alternate_symbol] = option_value
        end
      end

      def default_modules
        ["SNMPv2-SMI", "SNMPv2-MIB", "IF-MIB", "IP-MIB", "TCP-MIB", "UDP-MIB"]
      end

      def choose_transport(klass, config)
        address_family = config.use_IPv6 ? Socket::AF_INET6 : Socket::AF_INET
        klass.new(address_family)
      end

      def ipv6_address?(config)
        hostname = config.host.to_s
        hostname.include?("::") || hostname.split(":").size == 8
      end
    end

    attr_reader :applied_config

    def initialize(config)
      @config = validate_keys(config)
      @applied_config = {}
    end

    def validate_keys(config)
      valid_symbols = self.class.alternates.keys + self.class.alternates.values
      config.each_key { |k| raise "Invalid option: #{k}" unless valid_symbols.include? k }
      config
    end

    def socket_address_family
      use_IPv6 ? Socket::AF_INET6 : Socket::AF_INET
    end
  end

end
