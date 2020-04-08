require "cabin"
require "open3"
require "pleaserun/namespace"

# Detect the service platform that's most likely to be successful on the
# running machine.
#
# See the `detect` method.
module PleaseRun::Detector
  class UnknownSystem < StandardError; end

  module_function

  def detect
    return @system unless @system.nil?

    @logger ||= Cabin::Channel.get
    @system = detect_platform
    raise UnknownSystem, "Unable to detect which service platform to use" if @system.nil?
    return @system
  end # def self.detect

  def detect_platform
    detect_systemd || detect_upstart || detect_launchd || detect_runit || detect_sysv
  end

  def detect_systemd
    # Check the version. If `systemctl` fails, systemd isn't available.
    out, success = execute([ "systemctl", "--version" ])
    return false unless success

    # version is the last word on the first line of the --version output
    version = out.split("\n").first.split(/\s+/).last
    ["systemd", version]
  end

  def detect_upstart
    # Expect a certain directory
    return false unless File.directory?("/etc/init")

    # Check the version. If `initctl` fails, upstart isn't available.
    out, success = execute(["initctl", "--version"])
    return false unless success

    version = out.split("\n").first.tr("()", "").split(/\s+/).last
    ["upstart", version]
  end

  def detect_sysv
    return false unless File.directory?("/etc/init.d")

    # TODO(sissel): Do more specific testing.
    ["sysv", "lsb-3.1"]
  end

  def detect_launchd
    return false unless File.directory?("/Library/LaunchDaemons")

    out, success = execute(["launchctl", "version"])
    return false unless success

    # TODO(sissel): Version?
    version = out.split("\n").first.split(":").first.split(/\s+/).last
    ["launchd", version]
  end

  def detect_runit
    return false unless File.directory?("/service")

    # TODO(sissel): Do more tests for runit
  end

  def execute(command)
    Open3.popen3(*command) do |stdin, stdout, stderr, wait_thr|
      stdin.close
      out = stdout.read
      stderr.close
      exit_status = wait_thr.value
      return out, exit_status.success?
    end
  rescue Errno::ENOENT, Errno::EACCES, IOError => e
    # If the path doesn't exist or we cannot execute it, return the exception
    # message as the output and indicate a failure to run.
    return e.message, false
  end
end
