require "fpm/namespace"
require "fpm/package"
require "fileutils"
require "fpm/util"

# This provides PHP PEAR package support.
#
# This provides input support, but not output support.
class FPM::Package::PEAR < FPM::Package
  option "--package-name-prefix", "PREFIX",
    "Name prefix for pear package", :default => "php-pear"

  option "--channel", "CHANNEL_URL",
    "The pear channel url to use instead of the default."

  option "--channel-update", :flag,
    "call 'pear channel-update' prior to installation"

  option "--bin-dir", "BIN_DIR",
    "Directory to put binaries in"

  option "--php-bin", "PHP_BIN",
    "Specify php executable path if differs from the os used for packaging"

  option "--php-dir", "PHP_DIR",
    "Specify php dir relative to prefix if differs from pear default (pear/php)"

  option "--data-dir", "DATA_DIR",
    "Specify php dir relative to prefix if differs from pear default (pear/data)"

  # Input a PEAR package.
  #
  # The parameter is a PHP PEAR package name.
  #
  # Attributes that affect behavior here:
  # * :prefix - changes the install root, default is /usr/share
  # * :pear_package_name_prefix - changes the
  def input(input_package)
    if !program_in_path?("pear")
      raise ExecutableNotFound.new("pear")
    end

    # Create a temporary config file
    logger.debug("Creating pear config file")
    config = File.expand_path(build_path("pear.config"))
    installroot = attributes[:prefix] || "/usr/share"
    safesystem("pear", "config-create", staging_path(installroot), config)

    if attributes[:pear_php_dir]
      logger.info("Setting php_dir", :php_dir => attributes[:pear_php_dir])
      safesystem("pear", "-c", config, "config-set", "php_dir", "#{staging_path(installroot)}/#{attributes[:pear_php_dir]}")
    end

    if attributes[:pear_data_dir]
      logger.info("Setting data_dir", :data_dir => attributes[:pear_data_dir])
      safesystem("pear", "-c", config, "config-set", "data_dir", "#{staging_path(installroot)}/#{attributes[:pear_data_dir]}")
    end

    bin_dir = attributes[:pear_bin_dir] || "usr/bin"
    logger.info("Setting bin_dir", :bin_dir => bin_dir)
    safesystem("pear", "-c", config, "config-set", "bin_dir", bin_dir)

    php_bin = attributes[:pear_php_bin] || "/usr/bin/php"
    logger.info("Setting php_bin", :php_bin => php_bin)
    safesystem("pear", "-c", config, "config-set", "php_bin", php_bin)

    # do channel-discover if required
    if !attributes[:pear_channel].nil?
      logger.info("Custom channel specified", :channel => attributes[:pear_channel])
      channel_list = safesystemout("pear", "-c", config, "list-channels")
      if channel_list !~ /#{Regexp.quote(attributes[:pear_channel])}/
        logger.info("Discovering new channel", :channel => attributes[:pear_channel])
        safesystem("pear", "-c", config, "channel-discover", attributes[:pear_channel])
      end
      input_package = "#{attributes[:pear_channel]}/#{input_package}"
      logger.info("Prefixing package name with channel", :package => input_package)
    end

    # do channel-update if requested
    if attributes[:pear_channel_update?]
      channel = attributes[:pear_channel] || "pear"
      logger.info("Updating the channel", :channel => channel)
      safesystem("pear", "-c", config, "channel-update", channel)
    end

    logger.info("Installing pear package", :package => input_package,
                  :directory => staging_path)
    ::Dir.chdir(staging_path) do
      safesystem("pear", "-c", config, "install", "-n", "-f", input_package)
    end

    pear_cmd = "pear -c #{config} remote-info #{input_package}"
    logger.info("Fetching package information", :package => input_package, :command => pear_cmd)
    name = %x{#{pear_cmd} | sed -ne '/^Package\s*/s/^Package\s*//p'}.chomp
    self.name = "#{attributes[:pear_package_name_prefix]}-#{name}"
    self.version = %x{#{pear_cmd} | sed -ne '/^Installed\s*/s/^Installed\s*//p'}.chomp
    self.description  = %x{#{pear_cmd} | sed -ne '/^Summary\s*/s/^Summary\s*//p'}.chomp
    logger.debug("Package info", :name => self.name, :version => self.version,
                  :description => self.description)

    # Remove the stuff we don't want
    delete_these = [".depdb", ".depdblock", ".filemap", ".lock", ".channel", "cache", "temp", "download", ".channels", ".registry"]
    Find.find(staging_path) do |path|
      if File.file?(path)
        logger.info("replacing staging_path in file", :replace_in => path, :staging_path => staging_path)
        begin
          content = File.read(path).gsub(/#{Regexp.escape(staging_path)}/, "")
          File.write(path, content)
        rescue ArgumentError => e
          logger.warn("error replacing staging_path in file", :replace_in => path, :error => e)
        end
      end
      FileUtils.rm_r(path) if delete_these.include?(File.basename(path))
    end

  end # def input
end # class FPM::Package::PEAR
