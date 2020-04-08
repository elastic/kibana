require "pleaserun/platform/base"
require "pleaserun/namespace"

# The System V-style init system implementation.
#
# This will generate the familiar /etc/init.d/ scripts.
class PleaseRun::Platform::SYSV < PleaseRun::Platform::Base
  def files
    Enumerator::Generator.new do |out|
      out.yield(safe_filename("/etc/init.d/{{ name }}"), render_template("init.sh"), 0755)
      out.yield(safe_filename("/etc/default/{{ name }}"), render_template("default"))
    end
  end

  def ulimit_setup
    ulimits = []
    ulimits << "-c ${limit_coredump}" if limit_coredump
    ulimits << "-t ${limit_cputime}" if limit_cputime
    ulimits << "-d ${limit_data}" if limit_data
    ulimits << "-f ${limit_file_size}" if limit_file_size
    ulimits << "-l ${limit_locked_memory}" if limit_locked_memory
    ulimits << "-n ${limit_open_files}" if limit_open_files
    ulimits << "-u ${limit_user_processes}" if limit_user_processes
    ulimits << "-m ${limit_physical_memory}" if limit_physical_memory
    ulimits << "-s ${limit_stack_size}" if limit_stack_size
    ulimits
  end

  def ulimit_shell
    ulimit_setup.collect { |args| "ulimit #{args}" }.join("\n")
  end
end
