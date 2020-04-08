require "dotenv/parser"
require "pleaserun/namespace"
require "pleaserun/configurable"
require "pleaserun/mustache_methods"

require "insist" # gem 'insist'

# Base class for all platforms.
#
# This class provides all the general attributes common
# among all process runners.
#
# For example, pretty much every runner (upstart, runit, sysv, etc) has
# concepts for the 'name' of a thing, what program it runs, what user
# to run as, etc.
class PleaseRun::Platform::Base
  include PleaseRun::Configurable
  include PleaseRun::MustacheMethods

  class InvalidTemplate < ::StandardError; end

  attribute :name, "The name of this program." do
    validate do |name|
      insist { name.is_a?(String) }
    end
  end

  attribute :program, "The program to execute. This can be a full path, like " \
    "/usr/bin/cat, or a shorter name like 'cat' if you wish to search $PATH." do
    validate do |program|
      insist { program.is_a?(String) }
    end
  end

  attribute :args, "The arguments to pass to the program." do
    validate do |args|
      insist { args }.is_a?(Array)
      args.each { |a| insist { a }.is_a?(String) }
    end
  end

  attribute :user, "The user to use for executing this program.",
            :default => "root" do
    validate do |user|
      insist { user }.is_a?(String)
    end
  end

  attribute :group, "The group to use for executing this program.",
            :default => "root" do
    validate do |group|
      insist { group }.is_a?(String)
    end
  end

  attribute :target_version, "The version of this runner platform to target." do
    validate do |version|
      insist { version.is_a?(String) }
    end
  end

  attribute :description, "The human-readable description of your program",
            :default => "no description given" do
    validate do |description|
      insist { description }.is_a?(String)
    end
  end

  # TODO(sissel): Should this be a numeric, not a string?
  attribute :umask, "The umask to apply to this program",
            :default => "022" do
    validate do |umask|
      insist { umask }.is_a?(String)
    end
  end

  attribute :chroot, "The directory to chroot to", :default => "/" do
    validate do |chroot|
      insist { chroot }.is_a?(String)
    end
  end

  attribute :chdir, "The directory to chdir to before running", :default => "/" do
    validate do |chdir|
      insist { chdir }.is_a?(String)
    end
  end

  attribute :environment_file, "A file containing environment variables to export for your application" do
    validate do |env|
      insist { env }.is_a?(File)
    end
  end

  attribute :environment_variables, "Env key/value pairs to insert into your sourced_env_file", :multivalued => true do
    munge do |environment_variables|
      if environment_variables.is_a?(String)
        environment_variables = [environment_variables]
      end
      if environment_variables.is_a?(Array)
        environment_variables = Hash[environment_variables.map { |e| e.split('=', 2) }]
      end
      environment_variables
    end
    validate do |environment_variables|
      insist { environment_variables }.is_a?(Hash)
    end
  end

  attribute :nice, "The nice level to add to this program before running" do
    validate do |nice|
      insist { nice }.is_a?(Fixnum)
    end
    munge do |nice|
      next nice.to_i
    end
  end

  attribute :limit_coredump, "Largest size (in blocks) of a core file that can be created. (setrlimit RLIMIT_CORE)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_cputime, "Maximum amount of cpu time (in seconds) a program may use. (setrlimit RLIMIT_CPU)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_data, "Maximum data segment size (setrlimit RLIMIT_DATA)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_file_size, "Maximum size (in blocks) of a file receiving writes (setrlimit RLIMIT_FSIZE)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_locked_memory, "Maximum amount of memory (in bytes) lockable with mlock(2) (setrlimit RLIMIT_MEMLOCK)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_open_files, "Maximum number of open files, sockets, etc. (setrlimit RLIMIT_NOFILE)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_user_processes, "Maximum number of running processes (or threads!) for this user id. Not recommended because this setting applies to the user, not the process group. (setrlimit RLIMIT_NPROC)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_physical_memory, "Maximum resident set size (in bytes); the amount of physical memory used by a process. (setrlimit RLIMIT_RSS)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :limit_stack_size, "Maximum size (in bytes) of a stack segment (setrlimit RLIMIT_STACK)" do
    validate { |v| v == "ulimited" || v.to_i > 0 }
  end

  attribute :log_directory, "The destination for log output",
    :default => "/var/log"

  attribute :log_file_stderr, "Name of log file for stderr. Will default to NAME-stderr.log",
    :default => nil

  attribute :log_file_stdout, "Name of log file for stdout. Will default to NAME-stderr.log",
    :default => nil

  attribute :prestart, "A command to execute before starting and restarting. A failure of this command will cause the start/restart to abort. This is useful for health checks, config tests, or similar operations."

  def initialize(target_version)
    configurable_setup
    self.target_version = target_version
  end # def initialize

  # Get the platform name for this class.
  # The platform name is simply the lowercased class name, but this can be overridden by subclasses (but don't, because that makes things confusing!)
  def platform
    self.class.name.split("::").last.gsub(/(?<=[^A-Z])[A-Z]+/, "-\\0").downcase
  end # def platform

  # Get the template path for this platform.
  def template_path
    return File.join(File.dirname(__FILE__), "../../../templates", platform)
  end # def template_path

  def render_template(name)
    possibilities = [
      File.join(template_path, target_version, name),
      File.join(template_path, "default", name),
      File.join(template_path, name)
    ]

    possibilities.each do |path|
      next unless File.readable?(path) && File.file?(path)
      return render(File.read(path))
    end

    raise InvalidTemplate, "Could not find template file for '#{name}'. Tried all of these: #{possibilities.inspect}"
  end # def render_template

  # Render a text input through Mustache based on this object.
  def render(text)
    return Mustache.render(text, self)
  end # def render

  # Get a safe-ish filename.
  #
  # This renders `str` through Mustache and replaces spaces with underscores.
  def safe_filename(str)
    return render(str).gsub(" ", "_")
  end # def safe_filename

  # The default install_actions is none.
  #
  # Subclasses which need installation actions should implement this method.
  # This method will return an Array of String commands to execute in order
  # to install this given runner.
  #
  # For examples, see launchd and systemd platforms.
  def install_actions
    return []
  end # def install_actions

  def log_path
    File.join(log_directory.chomp("/"), name)
  end

  def log_path_stderr
    filename = "#{name}-stderr.log"
    filename = log_file_stderr unless log_file_stderr.nil?
    File.join(log_directory.chomp("/"), filename)
  end

  def log_path_stdout
    filename = "#{name}-stdout.log"
    filename = log_file_stdout unless log_file_stdout.nil?
    File.join(log_directory.chomp("/"), filename)
  end

  def parsed_environment_variables
    return {} if environment_file.nil?
    return {} unless File.exist?(environment_file)
    Dotenv::Parser.call(File.open(environment_file, "rb:bom|utf-8", &:read))
  end

  def all_environment_variables
    parsed_env_vars = {}
    parsed_env_vars = parsed_environment_variables unless parsed_environment_variables.nil?
    flag_env_vars = {}
    flag_env_vars = environment_variables unless environment_variables.nil?

    variables = parsed_env_vars.merge(flag_env_vars)
    return nil if variables.empty?
    result = []
    variables.each {|k, v| result << {'key' => k, 'value' => v} }
    result
  end

  def default_file
    "/etc/default/#{name}"
  end

  def sysconfig_file
    "/etc/sysconfig/#{name}"
  end
end # class PleaseRun::Base
