require "English" # for $CHILD_STATUS
require "pleaserun/namespace"
require "clamp"
require "cabin"
require "stud/temporary"

require "pleaserun/version"
require "pleaserun/platform/base"
require "pleaserun/installer"
require "pleaserun/errors"

# The CLI interface to pleaserun.
#
# This is invoked by `bin/pleaserun`.
class PleaseRun::CLI < Clamp::Command # rubocop:disable ClassLength
  option ["-p", "--platform"], "PLATFORM", "The name of the platform to target, such as sysv, upstart, etc"
  option ["-v", "--version"], "VERSION", "The version of the platform to target, such as 'lsb-3.1' for sysv or '1.5' for upstart",
         :default => "default", :attribute_name => :target_version

  option "--overwrite", :flag, "Overwrite any files that already exist when installing."
  option "--log", "LOGFILE", "The path to use for writing pleaserun logs."
  option "--json", :flag, "Output a result in JSON. Intended to be consumed by other programs. This will emit the file contents and install actions as a JSON object."

  option "--install", :flag, "Install the program on this system. This will write files to the correct location and execute any actions to make the program available to the system."
  option "--[no-]install-actions", :flag, "Run installation actions after writing files", :default => true
  option "--install-prefix", "DIRECTORY", "The path to prefix file paths with. This flag is generally intended for packagers, not for users installing directly on systems.", :default => "/"

  option "--verbose", :flag, "More verbose logging"
  option "--debug", :flag, "Debug-level logging"
  option "--quiet", :flag, "Only errors or worse will be logged"

  # TODO(sissel): Make options based on other platforms

  # Make program and args attributes into parameters
  base = PleaseRun::Platform::Base

  # Get the Base platform's attributes and make them available as flags
  # through clamp.
  #
  # This has the effect of any 'attribute :foo, ...' becoming 'option "--foo",
  # ...' in the CLI.
  base.attributes.each do |facet|
    # Skip program and args which we don't want to make into flags.
    next if [:program, :args, :target_version].include?(facet.name)

    # Turn the attribute name into a flag.
    option "--#{facet.name.to_s.gsub("_", "-")}", facet.name.to_s.upcase, facet.description,
           :attribute_name => facet.name,
           :multivalued => facet.options.fetch(:multivalued, false)
  end

  # Load the 'program' attribute from the Base class and use it as the first
  # cli parameter.
  program = base.attributes.find { |f| f.name == :program }
  raise "Something is wrong; Base missing 'program' attribute" if program.nil?
  parameter "PROGRAM", program.description, :attribute_name => program.name

  # Load the 'args' attribute from the Base class
  # and use it as the remaining arguments setting
  args = base.attributes.find { |f| f.name == :args }
  raise "Something is wrong; Base missing 'args' attribute" if program.nil?

  parameter "[ARGS] ...", args.description, :attribute_name => args.name

  def help # rubocop:disable MethodLength
    return <<-HELP
Welcome to pleaserun version #{PleaseRun::VERSION}!

This program aims to help you generate 'init' scripts/configs for various
platforms. The simplest example takes only the command you wish to run.
For example, let's run elasticsearch:

    % pleaserun /opt/elasticsearch/bin/elasticsearch

The above will automatically detect what platform you are running on
and try to use the most sensible init system. For Ubuntu, this means
Upstart. For Debian, this means sysv init scripts. For Fedora, this
means systemd.

You can tune the running environment and settings for your runner with various
flags. By way of example, let's make our elasticsearch service run as the
'elasticsearch' user!

    % pleaserun --user elasticsearch /opt/elasticsearch/bin/elasticsearch

If you don't want the platform autodetected, you can always specify the
exact process launcher to target:

    # Generate a sysv (/etc/init.d) script for LSB 3.1 (Debian uses this)
    % pleaserun -p sysv -v lsb-3.1 /opt/elasticsearch/bin/elasticsearch

Let's do another example. How about running nagios in systemd, but we
want to abort if the nagios config is invalid?

    % pleaserun -p systemd \
      --prestart "/usr/sbin/nagios -v /etc/nagios/nagios.cfg" \
      /usr/sbin/nagios /etc/nagios/nagios.cfg

The above makes 'nagios -v ...' run before any start/restart attempts
are made. If it fails, nagios will not start. Yay!

#{super}
    HELP
    # rubocop:enable MethodLength
  end

  def run(args)
    # Short circuit for a `fpm --version` or `fpm -v` short invocation that 
    # is the user asking us for the version of fpm.
    if args == [ "-v" ] || args == [ "--version" ]
      puts PleaseRun::VERSION
      return 0
    end
    super
  end

  def execute
    setup_logger
    setup_defaults

    # Load the platform implementation
    platform_klass = load_platform(platform)
    runner = platform_klass.new(target_version)

    platform_klass.all_attributes.each do |facet|
      next unless respond_to?(facet.name)
      # Get the value of this attribute
      # The idea here is to translate CLI options to runner settings
      value = send(facet.name)
      next if value.nil?
      @logger.debug("Setting runner attribute", :name => facet.name, :value => value)

      # Set the value in the runner we've selected
      # This is akin to `obj.someattribute = value`
      runner.send("#{facet.name}=", value)
    end

    if json?
      return run_json(runner)
    else
      return run_human(runner)
    end
    return 0
  rescue PleaseRun::Error => e
    @logger.error("An error occurred: #{e}")
    return 1
  end # def execute

  def setup_defaults
    # Provide any dynamic defaults if necessary
    if platform.nil?
      require "pleaserun/detector"
      self.platform, self.target_version = PleaseRun::Detector.detect
      @logger.warn("No platform selected. Autodetecting...", :platform => platform, :version => target_version)
    end

    if name.nil?
      self.name = File.basename(program)
      @logger.warn("No name given, setting reasonable default based on the executable", :name => name)
    end

    nil
  end # def setup_defaults

  def run_json(runner)
    require "json"

    result = {}
    result["files"] = []
    runner.files.each do |path, content, perms|
      result["files"] << {
        "path" => path,
        "content" => content,
        "perms" => perms
      }
    end

    result["install_actions"] = runner.install_actions

    puts JSON.dump(result)
  end # def run_json

  def run_human(runner)
    if install?
      PleaseRun::Installer.install_files(runner, install_prefix, overwrite?)
      PleaseRun::Installer.install_actions(runner) if install_actions?
    else
      target = install_prefix || Stud::Temporary.directory
      actions_script = File.join(target, "install_actions.sh")
      PleaseRun::Installer.install_files(runner, target, overwrite?)
      PleaseRun::Installer.write_actions(runner, actions_script)
    end
    return 0
  end # def run_human

  def setup_logger
    @logger = Cabin::Channel.get
    if quiet?
      @logger.level = :error
    elsif verbose?
      @logger.level = :info
    elsif debug?
      @logger.level = :debug
    else
      @logger.level = :warn
    end

    if log
      logfile = File.new(log, "a")
      @logger.subscribe(logfile)
      #STDERR.puts "Sending all logs to #{log}" if STDERR.tty?
    else
      @logger.subscribe(STDERR)
    end
  end # def setup_logger

  def load_platform(v)
    @logger.debug("Loading platform", :platform => v)
    platform_lib = "pleaserun/platform/#{v}"
    require(platform_lib)

    const_name = v.downcase.gsub(/-([a-z])/) { |s| s[1] }
    const = PleaseRun::Platform.constants.find { |c| c.to_s.downcase == const_name.downcase }
    raise PleaseRun::PlatformLoadError, "Could not find platform named '#{v}' after loading library '#{platform_lib}' (#{const_name}). This is probably a bug." if const.nil?

    return PleaseRun::Platform.const_get(const)
  rescue LoadError => e
    raise PleaseRun::PlatformLoadError, "Failed to find or load platform '#{v}'. This could be a typo or a bug. If it helps, the error is: #{e}"
  end # def load_platform
end # class PleaseRun::CLI
