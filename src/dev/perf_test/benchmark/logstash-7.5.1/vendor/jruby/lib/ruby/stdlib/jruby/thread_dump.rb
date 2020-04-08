require 'jruby'

begin
  handler = proc do
    cur_thread = Thread.current

    $stderr.puts "\nRuby Thread Dump\n================\n"

    thread_service = JRuby.runtime.thread_service
    trace_type = org.jruby.runtime.backtrace.TraceType

    for thread in thread_service.active_ruby_threads
      next if thread == cur_thread
      
      thread_r = JRuby.reference(thread)

      $stderr.puts "* Thread: #{thread_r.native_thread.name}"
      $stderr.puts "* Stack:"

      thread_r = JRuby.reference(thread)
      thread_context = thread_r.context

      unless thread_context
        $stderr.puts "  [dead]\n"
        next
      end

      ex = RuntimeError.new('thread dump')
      ex_r = JRuby.reference(ex)  

      gather = trace_type::Gather::NORMAL
      format = trace_type::Format::JRUBY

      ex_r.backtrace_data = gather.get_backtrace_data(thread_context, thread_r.native_thread.stack_trace, true)
      $stderr.puts format.print_backtrace(ex, false)

      $stderr.puts
    end
  end
  
  Signal.__jtrap_kernel(handler, 'USR2')
rescue ArgumentError
  $stderr.puts "failed handling USR2; 'jruby -J-XX:+UseAltSigs ...' to disable JVM's handler"
rescue Exception
  warn $!.message
  warning $!.backtrace
end