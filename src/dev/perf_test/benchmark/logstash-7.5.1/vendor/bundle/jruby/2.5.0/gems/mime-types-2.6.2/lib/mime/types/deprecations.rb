# -*- ruby encoding: utf-8 -*-

require 'mime/types/logger'

# The namespace for MIME applications, tools, and libraries.
module MIME
  class Types
    # Used to mark a method as deprecated in the mime-types interface.
    def self.deprecated(klass, sym, message = nil, &block) # :nodoc:
      level = case klass
              when Class, Module
                '.'
              else
                klass = klass.class
                '#'
              end
      message = case message
                when :private, :protected
                  "and will be #{message}"
                when nil
                  'and will be removed'
                else
                  message
                end
      MIME::Types.logger.warn <<-warning.chomp
#{caller[1]}: #{klass}#{level}#{sym} is deprecated #{message}.
      warning
      block.call if block
    end
  end

  class << self
    # MIME::InvalidContentType was moved to MIME::Type::InvalidContentType.
    # Provide a single warning about this fact in the interim.
    def const_missing(name) # :nodoc:
      case name.to_s
      when 'InvalidContentType'
        warn_about_moved_constants(name)
        MIME::Type.const_get(name.to_sym)
      else
        super
      end
    end

    private

    def warn_about_moved_constants(name)
      MIME::Types.logger.warn <<-warning.chomp
#{caller[1]}: MIME::#{name} is deprecated. Use MIME::Type::#{name} instead.
      warning
    end
  end
end
