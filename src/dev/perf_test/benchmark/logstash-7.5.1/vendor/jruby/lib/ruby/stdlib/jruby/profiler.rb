
require 'java'

module JRuby
  module Profiler
    java_import org.jruby.runtime.profile.builtin.ProfilePrinter
    java_import org.jruby.runtime.profile.builtin.FlatProfilePrinter
    java_import org.jruby.runtime.profile.builtin.GraphProfilePrinter
    java_import org.jruby.runtime.profile.builtin.HtmlProfilePrinter
    java_import org.jruby.runtime.profile.builtin.JsonProfilePrinter
    
    def self.profile(&block)
      unless runtime.instance_config.is_profiling
        raise RuntimeError.new "Profiling not enabled in runtime"
      end

      start
      profiled_code(&block)
      stop
    end
    
    def self.profiled_code
      yield
    end
    
    def self.clear
      profile_data.clear
    end
    
    protected

      def self.start
        current_thread_context.start_profiling
        clear
      end

      def self.stop
        current_thread_context.stop_profiling
        profile_data
      end

      def self.profile_data
        current_thread_context.profile_collection
      end
    
    private
    
      def self.runtime
        JRuby.runtime
      end

      def self.current_thread_context
        runtime.get_thread_service.get_current_context
      end
      
  end
end
