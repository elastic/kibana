require "fpm/namespace" # local
require "fpm/util" # local
require "pathname" # stdlib
require "find"
require "tmpdir" # stdlib
require "backports" # gem 'backports'
require "socket" # stdlib, for Socket.gethostname
require "shellwords" # stdlib, for Shellwords.escape
require "erb" # stdlib, for template processing
require "cabin" # gem "cabin"

# This class is the parent of all packages.
# If you want to implement an FPM package type, you'll inherit from this.
class FPM::Package
  include FPM::Util
  include Cabin::Inspectable

  # This class is raised if there's something wrong with a setting in the package.
  class InvalidArgument < StandardError; end
 
  # This class is raised when a file already exists when trying to write.
  class FileAlreadyExists < StandardError
    # Get a human-readable error message
    def to_s
      return "File already exists, refusing to continue: #{super}"
    end # def to_s
  end # class FileAlreadyExists

  # This class is raised when you try to output a package to a path
  # whose containing directory does not exist.
  class ParentDirectoryMissing < StandardError
    def to_s
      return "Parent directory does not exist: #{File.dirname(super)} - cannot write to #{super}"
    end # def to_s
  end # class ParentDirectoryMissing

  # The name of this package
  attr_accessor :name

  # The version of this package (the upstream version)
  attr_accessor :version

  # The epoch version of this package
  # This is used most when an upstream package changes it's versioning
  # style so standard comparisions wouldn't work.
  attr_accessor :epoch

  # The iteration of this package.
  #   Debian calls this 'release' and is the last '-NUMBER' in the version
  #   RedHat has this as 'Release' in the .spec file
  #   FreeBSD calls this 'PORTREVISION'
  #
  # Iteration can be nil. If nil, the fpm package implementation is expected
  # to handle any default value that should be instead.
  attr_accessor :iteration

  # Who maintains this package? This could be the upstream author
  # or the package maintainer. You pick.
  attr_accessor :maintainer

  # A identifier representing the vendor. Any string is fine.
  # This is usually who produced the software.
  attr_accessor :vendor

  # URL for this package.
  # Could be the homepage. Could be the download url. You pick.
  attr_accessor :url

  # The category of this package.
  # RedHat calls this 'Group'
  # Debian calls this 'Section'
  # FreeBSD would put this in /usr/ports/<category>/...
  attr_accessor :category

  # A identifier representing the license. Any string is fine.
  attr_accessor :license

  # What architecture is this package for?
  attr_accessor :architecture

  # Array of dependencies.
  attr_accessor :dependencies

  # Array of things this package provides.
  # (Not all packages support this)
  attr_accessor :provides

  # Array of things this package conflicts with.
  # (Not all packages support this)
  attr_accessor :conflicts

  # Array of things this package replaces.
  # (Not all packages support this)
  attr_accessor :replaces

  # a summary or description of the package
  attr_accessor :description

  # hash of scripts for maintainer/package scripts (postinstall, etc)
  #
  # The keys are :before_install, etc
  # The values are the text to use in the script.
  attr_accessor :scripts

  # Array of configuration files
  attr_accessor :config_files

  attr_accessor :directories

  # Any other attributes specific to this package.
  # This is where you'd put rpm, deb, or other specific attributes.
  attr_accessor :attributes

  attr_accessor :attrs

  private

  def initialize
    # Attributes for this specific package 
    @attributes = {}

    # Reference
    # http://www.debian.org/doc/manuals/maint-guide/first.en.html
    # http://wiki.debian.org/DeveloperConfiguration
    # https://github.com/jordansissel/fpm/issues/37
    if ENV.include?("DEBEMAIL") and ENV.include?("DEBFULLNAME")
      # Use DEBEMAIL and DEBFULLNAME as the default maintainer if available.
      @maintainer = "#{ENV["DEBFULLNAME"]} <#{ENV["DEBEMAIL"]}>"
    else
      # TODO(sissel): Maybe support using 'git config' for a default as well?
      # git config --get user.name, etc can be useful.
      #
      # Otherwise default to user@currenthost
      @maintainer = "<#{ENV["USER"]}@#{Socket.gethostname}>"
    end

    # Set attribute defaults based on flags
    # This allows you to define command line options with default values
    # that also are obeyed if fpm is used programmatically.
    self.class.default_attributes do |attribute, value|
      attributes[attribute] = value
    end

    @name = nil
    @architecture = "native"
    @description = "no description given"
    @version = nil
    @epoch = nil
    @iteration = nil
    @url = nil
    @category = "default"
    @license = "unknown"
    @vendor = "none"
   
    # Iterate over all the options and set defaults
    if self.class.respond_to?(:declared_options)
      self.class.declared_options.each do |option|
        with(option.attribute_name) do |attr|
          # clamp makes option attributes available as accessor methods
          # do --foo-bar is available as 'foo_bar'
          # make these available as package attributes.
          attr = "#{attr}?" if !respond_to?(attr)
          input.attributes[attr.to_sym] = send(attr) if respond_to?(attr)
        end
      end
    end

    @provides = []
    @conflicts = []
    @replaces = []
    @dependencies = []
    @scripts = {}
    @config_files = []
    @directories = []
    @attrs = {}

    staging_path
    build_path
  end # def initialize

  # Get the 'type' for this instance.
  #
  # For FPM::Package::ABC, this returns 'abc'
  def type
    self.class.type
  end # def type

  # Convert this package to a new package type
  def convert(klass)
    logger.info("Converting #{self.type} to #{klass.type}")

    exclude

    pkg = klass.new
    pkg.cleanup_staging # purge any directories that may have been created by klass.new

    # copy other bits
    ivars = [
      :@architecture, :@category, :@config_files, :@conflicts,
      :@dependencies, :@description, :@epoch, :@iteration, :@license, :@maintainer,
      :@name, :@provides, :@replaces, :@scripts, :@url, :@vendor, :@version,
      :@directories, :@staging_path, :@attrs
    ]
    ivars.each do |ivar|
      #logger.debug("Copying ivar", :ivar => ivar, :value => instance_variable_get(ivar),
                    #:from => self.type, :to => pkg.type)
      pkg.instance_variable_set(ivar, instance_variable_get(ivar))
    end

    # Attributes are special! We do not want to remove the default values of
    # the destination package type unless their value is specified on the
    # source package object.
    pkg.attributes.merge!(self.attributes)

    pkg.converted_from(self.class)
    return pkg
  end # def convert

  # This method is invoked on a package when it has been covered to a new
  # package format. The purpose of this method is to do any extra conversion
  # steps, like translating dependency conditions, etc.
  def converted_from(origin)
    # nothing to do by default. Subclasses may implement this.
    # See the RPM package class for an example.
  end # def converted

  # Add a new source to this package.
  # The exact behavior depends on the kind of package being managed.
  #
  # For instance: 
  #
  # * for FPM::Package::Dir, << expects a path to a directory or files.
  # * for FPM::Package::RPM, << expects a path to an rpm.
  #
  # The idea is that you can keep pumping in new things to a package
  # for later conversion or output.
  #
  # Implementations are expected to put files relevant to the 'input' in the
  # staging_path
  def input(thing_to_input)
    raise NotImplementedError.new("#{self.class.name} does not yet support " \
                                  "reading #{self.type} packages")
  end # def input

  # Output this package to the given path.
  def output(path)
    raise NotImplementedError.new("#{self.class.name} does not yet support " \
                                  "creating #{self.type} packages")
  end # def output

  def staging_path(path=nil)
    @staging_path ||= ::Dir.mktmpdir("package-#{type}-staging") #, ::Dir.pwd)

    if path.nil?
      return @staging_path
    else
      return File.join(@staging_path, path)
    end
  end # def staging_path

  def build_path(path=nil)
    @build_path ||= ::Dir.mktmpdir("package-#{type}-build") #, ::Dir.pwd)

    if path.nil?
      return @build_path
    else
      return File.join(@build_path, path)
    end
  end # def build_path

  # Clean up any temporary storage used by this class.
  def cleanup
    cleanup_staging unless logger.level == :debug
    cleanup_build unless logger.level == :debug
  end # def cleanup

  def cleanup_staging
    if File.directory?(staging_path)
      logger.debug("Cleaning up staging path", :path => staging_path)
      FileUtils.rm_r(staging_path) 
    end
  end # def cleanup_staging

  def cleanup_build
    if File.directory?(build_path)
      logger.debug("Cleaning up build path", :path => build_path)
      FileUtils.rm_r(build_path) 
    end
  end # def cleanup_build

  # List all files in the staging_path
  #
  # The paths will all be relative to staging_path and will not include that
  # path.
  # 
  # This method will emit 'leaf' paths. Files, symlinks, and other file-like
  # things are emitted. Intermediate directories are ignored, but
  # empty directories are emitted.
  def files
    is_leaf = lambda do |path|
      # True if this is a file/symlink/etc, but not a plain directory
      return true if !(File.directory?(path) and !File.symlink?(path))
      # Empty directories are leafs as well.
      return true if ::Dir.entries(path).sort == [".", ".."]
      # False otherwise (non-empty directory, etc)
      return false
    end # is_leaf

    # Find all leaf-like paths (files, symlink, empty directories, etc)
    # Also trim the leading path such that '#{staging_path}/' is removed from
    # the path before returning.
    #
    # Wrapping Find.find in an Enumerator is required for sane operation in ruby 1.8.7,
    # but requires the 'backports' gem (which is used in other places in fpm)
    return Enumerator.new { |y| Find.find(staging_path) { |path| y << path } } \
      .select { |path| path != staging_path } \
      .select { |path| is_leaf.call(path) } \
      .collect { |path| path[staging_path.length + 1.. -1] }
  end # def files
 
  def template_dir
    File.expand_path(File.join(File.dirname(__FILE__), "..", "..", "templates"))
  end

  def template(path)
    template_path = File.join(template_dir, path)
    template_code = File.read(template_path)
    logger.info("Reading template", :path => template_path)
    erb = ERB.new(template_code, nil, "-")
    erb.filename = template_path
    return erb
  end # def template

  def to_s(fmt="NAME.TYPE")
    fmt = "NAME.TYPE" if fmt.nil?
    fullversion = version.to_s
    fullversion += "-#{iteration}" if iteration
    return fmt.gsub("ARCH", architecture.to_s) \
      .gsub("NAME", name.to_s) \
      .gsub("FULLVERSION", fullversion) \
      .gsub("VERSION", version.to_s) \
      .gsub("ITERATION", iteration.to_s) \
      .gsub("EPOCH", epoch.to_s) \
      .gsub("TYPE", type.to_s)
  end # def to_s

  def edit_file(path)
    editor = ENV['FPM_EDITOR'] || ENV['EDITOR'] || 'vi'
    logger.info("Launching editor", :file => path)
    command = "#{editor} #{Shellwords.escape(path)}"
    system("#{editor} #{Shellwords.escape(path)}")
    if !$?.success?
      raise ProcessFailed.new("'#{editor}' failed (exit code " \
                              "#{$?.exitstatus}) Full command was: "\
                              "#{command}");
    end

    if File.size(path) == 0
      raise "Empty file after editing: #{path.inspect}"
    end
  end # def edit_file

  # This method removes excluded files from the staging_path. Subclasses can
  # remove the files during the input phase rather than deleting them here
  def exclude
    return if attributes[:excludes].nil?

    if @attributes.include?(:prefix)
      installdir = staging_path(@attributes[:prefix])
    else
      installdir = staging_path
    end

    Find.find(installdir) do |path|
      match_path = path.sub("#{installdir.chomp('/')}/", '')

      attributes[:excludes].each do |wildcard|
        logger.debug("Checking path against wildcard", :path => match_path, :wildcard => wildcard)

        if File.fnmatch(wildcard, match_path)
          logger.info("Removing excluded path", :path => match_path, :matches => wildcard)
          FileUtils.remove_entry_secure(path)
          Find.prune
          break
        end
      end
    end
  end # def exclude


  class << self
    # This method is invoked when subclass occurs.
    # 
    # Lets us track all known FPM::Package subclasses
    def inherited(klass)
      @subclasses ||= {}
      @subclasses[klass.name.gsub(/.*:/, "").downcase] = klass
    end # def self.inherited

    # Get a list of all known package subclasses
    def types
      return @subclasses
    end # def self.types

    # This allows packages to define flags for the fpm command line
    def option(flag, param, help, options={}, &block)
      @options ||= []
      if !flag.is_a?(Array)
        flag = [flag]
      end

      if param == :flag
        # Automatically make 'flag' (boolean) options tunable with '--[no-]...'
        flag = flag.collect { |f| "--[no-]#{type}-#{f.gsub(/^--/, "")}" }
      else
        flag = flag.collect { |f| "--#{type}-#{f.gsub(/^--/, "")}" }
      end

      help = "(#{type} only) #{help}"
      @options << [flag, param, help, options, block]
    end # def options

    # Apply the options for this package on the clamp command
    #
    # Package flags become attributes '{type}-flag'
    #
    # So if you have:
    #
    #     class Foo < FPM::Package
    #       option "--bar-baz" ...
    #     end
    #
    # The attribute value for --foo-bar-baz will be :foo_bar_baz"
    def apply_options(clampcommand)
      @options ||= []
      @options.each do |args|
        flag, param, help, options, block = args
        clampcommand.option(flag, param, help, options, &block)
      end
    end # def apply_options

    def default_attributes(&block)
      return if @options.nil?
      @options.each do |flag, param, help, options, block|
        attr = flag.first.gsub(/^-+/, "").gsub(/-/, "_").gsub("[no_]", "")
        attr += "?" if param == :flag
        yield attr.to_sym, options[:default]
      end
    end # def default_attributes

    # Get the type of this package class.
    #
    # For "Foo::Bar::BAZ" this will return "baz"
    def type
      self.name.split(':').last.downcase
    end # def self.type
  end # class << self

  # Get the version of this package
  def version
    if instance_variable_defined?(:@version) && !@version.nil?
      return @version
    elsif attributes[:version_given?]
      # 'version_given?' will be true in cases where the
      # fpm command-line tool has been given '-v' or '--version' settings
      # We do this check because the default version is "1.0"
      # on the fpm command line.
      return attributes.fetch(:version)
    end

    # No version yet, nil.
    return nil
  end # def version

  # Does this package have the given script?
  def script?(name)
    return scripts.include?(name)
  end # def script?

  # Get the contents of the script by a given name.
  #
  # If template_scripts? is set in attributes (often by the --template-scripts
  # flag), then apply it as an ERB template.
  def script(script_name)
    if attributes[:template_scripts?]
      erb = ERB.new(scripts[script_name], nil, "-")
      # TODO(sissel): find the original file name for the file.
      erb.filename = "script(#{script_name})"
      return erb.result(binding)
    else
      return scripts[script_name]
    end
  end # def script

  def output_check(output_path)
    if !File.directory?(File.dirname(output_path))
      raise ParentDirectoryMissing.new(output_path)
    end
    if File.file?(output_path)
      if attributes[:force?]
        logger.warn("Force flag given. Overwriting package at #{output_path}")
        File.delete(output_path)
      else
        raise FileAlreadyExists.new(output_path)
      end
    end
  end # def output_path

  def provides=(value)
    if !value.is_a?(Array)
      @provides = [value]
    else 
      @provides = value
    end
  end

  # General public API
  public(:type, :initialize, :convert, :input, :output, :to_s, :cleanup, :files,
         :version, :script, :provides=)

  # Package internal public api
  public(:cleanup_staging, :cleanup_build, :staging_path, :converted_from,
         :edit_file, :build_path)
end # class FPM::Package
