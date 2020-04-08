require 'pleaserun/namespace'
require "pleaserun/platform/base"

# The platform implementation for systemd user services.
class PleaseRun::Platform::SystemdUser < PleaseRun::Platform::Base
  def home
    @home ||= ENV["HOME"]
    if @home.nil? || @home.empty?
      raise PleaseRun::Configurable::ValidationError, "As a normal user (not root), I need to know where your home directory is, but the HOME environment variable seems to be not set."
    end
    @home
  end

  def files
    begin
      # TODO(sissel): Make it easy for subclasses to extend validation on attributes.
      insist { program } =~ /^\//
    rescue Insist::Failure
      raise PleaseRun::Configurable::ValidationError, "In systemd, the program must be a full path. You gave '#{program}'."
    end

    if !File.directory?(home)
      raise PleaseRun::Configurable::ValidationError, "HOME (#{home}) is not a directory. Cannot continue."
    end

    return Enumerator::Generator.new do |enum|
      enum.yield(safe_filename("{{{home}}}/.config/systemd/user/{{{ name }}}.environment"), environment_data)
      enum.yield(safe_filename("{{{home}}}/.config/systemd/user/{{{ name }}}.service"), render_template("program.service"))
      enum.yield(safe_filename("{{{home}}}/.config/systemd/user/{{{ name }}}-prestart.sh"), render_template("prestart.sh"), 0755) if prestart
    end
  end # def files

  def environment_data
    ENV.collect { |k,v| "#{k}=#{v}" }.join("\n")
  end

  def install_actions
    return ["systemctl --user daemon-reload"]
  end
end # class PleaseRun::Platform::SystemdUser
