# encoding: utf-8
module LogStash module Inputs class Beats
  class TLS
    class TLSOption
      include Comparable

      attr_reader :name, :version
      def initialize(name, version)
        @name = name
        @version = version
      end

      def <=>(other)
        version <=> other.version
      end
    end

    TLS_PROTOCOL_OPTIONS = [
      TLSOption.new("TLSv1", 1),
      TLSOption.new("TLSv1.1", 1.1),
      TLSOption.new("TLSv1.2", 1.2)
    ]

    def self.min
      TLS_PROTOCOL_OPTIONS.min
    end

    def self.max
      TLS_PROTOCOL_OPTIONS.max
    end

    def self.get_supported(versions)
      if versions.is_a?(Range)
        TLS_PROTOCOL_OPTIONS.select { |tls| versions.cover?(tls.version) }
      else 
        TLS_PROTOCOL_OPTIONS.select { |tls| versions == tls.version }
      end
    end
  end
end; end; end
