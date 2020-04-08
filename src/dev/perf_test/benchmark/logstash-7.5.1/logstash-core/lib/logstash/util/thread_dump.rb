# encoding: utf-8
java_import 'org.logstash.instrument.reports.ThreadsReport'

module LogStash
  module Util
    class ThreadDump
      SKIPPED_THREADS             = [ "Finalizer", "Reference Handler", "Signal Dispatcher" ].freeze
      THREADS_COUNT_DEFAULT       = 10.freeze
      IGNORE_IDLE_THREADS_DEFAULT = true.freeze

      attr_reader :top_count, :ignore, :dump

      def initialize(options={})
        @options   = options
        @dump = options.fetch(:dump, ThreadsReport.generate({}))
        @top_count = options.fetch(:threads, THREADS_COUNT_DEFAULT)
        @ignore    = options.fetch(:ignore_idle_threads, IGNORE_IDLE_THREADS_DEFAULT)
      end

      def each(&block)
        i=0
        dump.each do |hash|
          thread_name = hash["thread.name"]
          break if i >= top_count
          if ignore
            next if idle_thread?(thread_name, hash)
          end
          block.call(hash)
          i += 1
        end
      end

      def idle_thread?(thread_name, data)
        idle = false
        if SKIPPED_THREADS.include?(thread_name)
          # these are likely JVM dependent
          idle = true
        elsif thread_name.match(/Ruby-\d+-JIT-\d+/)
          # This are internal JRuby JIT threads, 
          # see java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor for details.
          idle = true
        elsif thread_name.match(/pool-\d+-thread-\d+/)
          # This are threads used by the internal JRuby implementation to dispatch
          # calls and tasks, see prg.jruby.internal.runtime.methods.DynamicMethod.call
          idle = true
        else
          data["thread.stacktrace"].each do |trace|
            if trace.start_with?("java.util.concurrent.ThreadPoolExecutor.getTask")
              idle = true
              break
            end
          end
        end
        idle
      end
    end
  end
end
