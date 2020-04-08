module PowerAssert
  class << self
    def configuration
      @configuration ||= Configuration[false, false, true, false, false]
    end

    def configure
      yield configuration
    end
  end

  SUPPORT_ALIAS_METHOD = TracePoint.public_method_defined?(:callee_id)
  private_constant :SUPPORT_ALIAS_METHOD

  class Configuration < Struct.new(:lazy_inspection, :_trace_alias_method, :_redefinition, :_colorize_message, :_use_pp)
    def _trace_alias_method=(bool)
      super
      if SUPPORT_ALIAS_METHOD
        warn 'power_assert: _trace_alias_method option is obsolete. You no longer have to set it.'
      end
    end

    def _colorize_message=(bool)
      if bool
        require 'pry'
      end
      super
    end

    def lazy_inspection=(bool)
      unless bool
        raise 'lazy_inspection option must be enabled when using pp' if _use_pp
      end
      super
    end

    def _use_pp=(bool)
      if bool
        raise 'lazy_inspection option must be enabled when using pp' unless lazy_inspection
        require 'pp'
      end
      super
    end
  end
  private_constant :Configuration
end
