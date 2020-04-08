require "English" # for $CHILD_STATUS
require "pleaserun/namespace"
require "insist"
require "shared_examples"
require "flores/rspec"

def superuser?
  return Process::UID.eid == 0
end

def platform?(name)
  return RbConfig::CONFIG["host_os"] =~ /^#{name}/
end

def system_quiet(command)
  system("#{command} > /dev/null 2>&1")
end

def sh(command)
  system_quiet(command)
  return $CHILD_STATUS
end

def program?(name)
  ENV["PATH"].split(":").each do |path|
    file = File.join(path, name)
    return true if File.executable?(file)
  end
  return false
end

def activate(pleaserun)
  pleaserun.files.each do |path, content, mode = nil|
    File.write(path, content)
    File.chmod(mode, path) if mode
  end
  pleaserun.install_actions.each do |command|
    system(command)
    raise "Command failed: #{command}" unless $CHILD_STATUS.success?
  end
end

# Helper methods to provide during rspec tests.
module Helpers
  def starts
    system_quiet(start)
    insist { $CHILD_STATUS }.success?
    status_running
  end

  def stops
    system_quiet(stop)
    insist { $CHILD_STATUS }.success?
    status_stopped
  end

  def status_running
    system_quiet(status)
    insist { $CHILD_STATUS }.success?
  end

  def status_stopped
    system_quiet(status)
    reject { $CHILD_STATUS }.success?
  end

  def restarts
    starts
    system_quiet(restart)
    insist { $CHILD_STATUS }.success?
    status_running
  end
end

RSpec.configure do |config|
  config.include Helpers
  Flores::RSpec.configure(config)

  config.filter_run_excluding(
    :systemd => !(superuser? && platform?("linux") && program?("systemctl") && File.directory?("/lib/systemd")),
    :upstart => !(superuser? && platform?("linux") && program?("initctl") && File.directory?("/etc/init")),
    :launchd => !(superuser? && platform?("darwin"))
  )

  if !config.exclusion_filter[:launchd]
    # Skip prestart tests because launchd doesn't have such a feature.
    config.filter_run_excluding(:prestart => true)
    # Skip flapper tests because launchd's minimum restart-throttle is 5 seconds.
    # I'm not waiting for that crap.
    config.filter_run_excluding(:flapper => true)
  end
end
