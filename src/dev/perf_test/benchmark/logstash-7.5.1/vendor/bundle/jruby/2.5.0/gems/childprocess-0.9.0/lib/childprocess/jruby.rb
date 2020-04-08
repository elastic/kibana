require 'java'
require 'jruby'

class Java::SunNioCh::FileChannelImpl
  field_reader :fd
end

class Java::JavaIo::FileDescriptor
  if ChildProcess.os == :windows
    field_reader :handle
  end

  field_reader :fd
end

module ChildProcess
  module JRuby
    def self.posix_fileno_for(obj)
      channel = ::JRuby.reference(obj).channel
      begin
        channel.getFDVal
      rescue NoMethodError
        fileno = channel.fd
        if fileno.kind_of?(Java::JavaIo::FileDescriptor)
          fileno = fileno.fd
        end

        fileno == -1 ? obj.fileno : fileno
      end
    rescue
      # fall back
      obj.fileno
    end

    def self.windows_handle_for(obj)
      channel = ::JRuby.reference(obj).channel
      fileno = obj.fileno

      begin
        fileno = channel.getFDVal
      rescue NoMethodError
        fileno = channel.fd if channel.respond_to?(:fd)
      end

      if fileno.kind_of? Java::JavaIo::FileDescriptor
        fileno.handle
      else
        Windows::Lib.handle_for fileno
      end
    end
  end
end

require "childprocess/jruby/pump"
require "childprocess/jruby/io"
require "childprocess/jruby/process"
