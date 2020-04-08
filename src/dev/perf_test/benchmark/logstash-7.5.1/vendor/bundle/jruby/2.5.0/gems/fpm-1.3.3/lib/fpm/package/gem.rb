require "fpm/namespace"
require "fpm/package"
require "rubygems"
require "fileutils"
require "fpm/util"
require "yaml"

# A rubygems package.
#
# This does not currently support 'output'
#
# The following attributes are supported:
#
# * :gem_bin_path
# * :gem_package_name_prefix
# * :gem_gem
class FPM::Package::Gem < FPM::Package
  # Flags '--foo' will be accessable  as attributes[:gem_foo]
  option "--bin-path", "DIRECTORY", "The directory to install gem executables"
  option "--package-prefix", "NAMEPREFIX",
    "(DEPRECATED, use --package-name-prefix) Name to prefix the package " \
    "name with." do |value|
    logger = Cabin::Channel.get
    logger.warn("Using deprecated flag: --package-prefix. Please use " \
                 "--package-name-prefix")
    value
  end
  option "--package-name-prefix", "PREFIX", "Name to prefix the package " \
    "name with.", :default => "rubygem"
  option "--gem", "PATH_TO_GEM",
          "The path to the 'gem' tool (defaults to 'gem' and searches " \
          "your $PATH)", :default => "gem"
  option "--fix-name", :flag, "Should the target package name be prefixed?",
    :default => true
  option "--fix-dependencies", :flag, "Should the package dependencies be " \
    "prefixed?", :default => true
  option "--env-shebang", :flag, "Should the target package have the " \
    "shebang rewritten to use env?", :default => true

  option "--prerelease", :flag, "Allow prerelease versions of a gem", :default => false
  option "--disable-dependency", "gem_name",
    "The gem name to remove from dependency list",
    :multivalued => true, :attribute_name => :gem_disable_dependencies

  option "--version-bins", :flag, "Append the version to the bins", :default => false

  def input(gem)
    # 'arg'  is the name of the rubygem we should unpack.
    path_to_gem = download_if_necessary(gem, version)

    # Got a good gem now (downloaded or otherwise)
    #
    # 1. unpack it into staging_path
    # 2. take the metadata from it and update our wonderful package with it.
    load_package_info(path_to_gem)
    install_to_staging(path_to_gem)
  end # def input

  def download_if_necessary(gem, gem_version)
    path = gem
    if !File.exists?(path)
      path = download(gem, gem_version)
    end

    logger.info("Using gem file", :path => path)
    return path
  end # def download_if_necessary

  def download(gem_name, gem_version=nil)

    logger.info("Trying to download", :gem => gem_name, :version => gem_version)

    gem_fetch = [ "#{attributes[:gem_gem]}", "fetch", gem_name]

    gem_fetch += ["--prerelease"] if attributes[:gem_prerelease?]
    gem_fetch += ["--version", gem_version] if gem_version

    download_dir = build_path(gem_name)
    FileUtils.mkdir(download_dir) unless File.directory?(download_dir)

    ::Dir.chdir(download_dir) do |dir|
      logger.debug("Downloading in directory #{dir}")
      safesystem(*gem_fetch)
    end

    gem_files = ::Dir.glob(File.join(download_dir, "*.gem"))

    if gem_files.length != 1
      raise "Unexpected number of gem files in #{download_dir},  #{gem_files.length} should be 1"
    end

    return gem_files.first
  end # def download

  def load_package_info(gem_path)

    spec = YAML.load(%x{#{attributes[:gem_gem]} specification #{gem_path} --yaml})

    if !attributes[:gem_package_prefix].nil?
      attributes[:gem_package_name_prefix] = attributes[:gem_package_prefix]
    end

    # name prefixing is optional, if enabled, a name 'foo' will become
    # 'rubygem-foo' (depending on what the gem_package_name_prefix is)
    self.name = spec.name
    if attributes[:gem_fix_name?]
      self.name = fix_name(spec.name)
    end

    #self.name = [attributes[:gem_package_name_prefix], spec.name].join("-")
    self.license = (spec.license or "no license listed in #{File.basename(gem_path)}")

    # expand spec's version to match RationalVersioningPolicy to prevent cases
    # where missing 'build' number prevents correct dependency resolution by target
    # package manager. Ie. for dpkg 1.1 != 1.1.0
    m = spec.version.to_s.scan(/(\d+)\.?/)
    self.version = m.flatten.fill('0', m.length..2).join('.') 

    self.vendor = spec.author
    self.url = spec.homepage
    self.category = "Languages/Development/Ruby"

    # if the gemspec has C extensions defined, then this should be a 'native' arch.
    if !spec.extensions.empty?
      self.architecture = "native"
    else
      self.architecture = "all"
    end

    # make sure we have a description
    description_options = [ spec.description, spec.summary, "#{spec.name} - no description given" ]
    self.description = description_options.find { |d| !(d.nil? or d.strip.empty?) }

    # Upstream rpms seem to do this, might as well share.
    # TODO(sissel): Figure out how to hint this only to rpm? 
    # maybe something like attributes[:rpm_provides] for rpm specific stuff?
    # Or just ignore it all together.
    #self.provides << "rubygem(#{self.name})"

    # By default, we'll usually automatically provide this, but in the case that we are
    # composing multiple packages, it's best to explicitly include it in the provides list.
    self.provides << "#{self.name} = #{self.version}"

    if !attributes[:no_auto_depends?]
      spec.runtime_dependencies.map do |dep|
        # rubygems 1.3.5 doesn't have 'Gem::Dependency#requirement'
        if dep.respond_to?(:requirement)
          reqs = dep.requirement.to_s
        else
          reqs = dep.version_requirements
        end

        # Some reqs can be ">= a, < b" versions, let's handle that.
        reqs.to_s.split(/, */).each do |req|
          if attributes[:gem_disable_dependencies]
            next if attributes[:gem_disable_dependencies].include?(dep.name)
          end

          if attributes[:gem_fix_dependencies?]
            name = fix_name(dep.name)
          else
            name = dep.name
          end
          self.dependencies << "#{name} #{req}"
        end
      end # runtime_dependencies
    end #no_auto_depends
  end # def load_package_info

  def install_to_staging(gem_path)
    if attributes.include?(:prefix) && ! attributes[:prefix].nil?
      installdir = "#{staging_path}/#{attributes[:prefix]}"
    else
      gemdir = safesystemout(*[attributes[:gem_gem], 'env', 'gemdir']).chomp
      installdir = File.join(staging_path, gemdir)
    end

    ::FileUtils.mkdir_p(installdir)
    # TODO(sissel): Allow setting gem tool path
    args = [attributes[:gem_gem], "install", "--quiet", "--no-ri", "--no-rdoc",
       "--install-dir", installdir, "--ignore-dependencies"]
    if attributes[:gem_env_shebang?]
      args += ["-E"]
    end

    if attributes.include?(:gem_bin_path) && ! attributes[:gem_bin_path].nil?
      bin_path = File.join(staging_path, attributes[:gem_bin_path])
    else
      gem_env  = safesystemout(*[attributes[:gem_gem], 'env']).split("\n")
      gem_bin  = gem_env.select{ |line| line =~ /EXECUTABLE DIRECTORY/ }.first.split(': ').last
      bin_path = File.join(staging_path, gem_bin)
    end

    args += ["--bindir", bin_path]
    ::FileUtils.mkdir_p(bin_path)
    args << gem_path
    safesystem(*args)

    # Delete bin_path if it's empty, and any empty parents (#612)
    # Above, we mkdir_p bin_path because rubygems aborts if the parent
    # directory doesn't exist, for example:
    #   ERROR:  While executing gem ... (Errno::ENOENT)
    #       No such file or directory - /tmp/something/weird/bin
    tmp = bin_path
    while ::Dir.entries(tmp).size == 2 || tmp == "/"  # just [ "..", "." ] is an empty directory
      logger.info("Deleting empty bin_path", :path => tmp)
      ::Dir.rmdir(tmp)
      tmp = File.dirname(tmp)
    end
    if attributes[:gem_version_bins?] and File.directory?(bin_path)
      (::Dir.entries(bin_path) - ['.','..']).each do |bin|
        FileUtils.mv("#{bin_path}/#{bin}", "#{bin_path}/#{bin}-#{self.version}")
      end
    end
  end # def install_to_staging
  
  # Sanitize package name.
  # This prefixes the package name with 'rubygem' (but depends on the attribute
  # :gem_package_name_prefix
  def fix_name(name)
    return [attributes[:gem_package_name_prefix], name].join("-")
  end # def fix_name
  public(:input, :output)
end # class FPM::Package::Gem
