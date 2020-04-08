require "pleaserun/platform/base"

# The Upstart platform implementation.
#
# If you use Ubuntu (8.10 to present) or CentOS 6 this is for you.
class PleaseRun::Platform::Upstart < PleaseRun::Platform::Base
  def files
    return Enumerator::Generator.new do |out|
      out.yield(safe_filename("/etc/init/{{ name }}.conf"), render_template("init.conf"))
      out.yield(safe_filename("/etc/default/{{ name }}"), render_template("default"))
    end
  end
end
