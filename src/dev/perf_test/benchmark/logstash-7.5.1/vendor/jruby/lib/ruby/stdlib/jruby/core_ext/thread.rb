require 'java'

class Thread
  
  # Get true CPU times for the current thread.
  def times
    thread_mx_bean = java.lang.management.ManagementFactory.thread_mx_bean
    cpu = thread_mx_bean.current_thread_cpu_time
    user = thread_mx_bean.curent_thread_user_time
    
    cpu = 0 if cpu < 0
    user = 0 if user < 0
    
    system_f = (cpu - user) / 1000000000.0
    user_f = user / 1000000000.0
    
    Struct::Tms.new user_f, system_f, 0.0, 0.0
  end
end