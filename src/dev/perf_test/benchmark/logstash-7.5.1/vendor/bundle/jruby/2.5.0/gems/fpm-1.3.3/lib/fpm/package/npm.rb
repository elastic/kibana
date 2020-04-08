require "fpm/namespace"
require "fpm/package"
require "fpm/util"
require "fileutils"

class FPM::Package::NPM < FPM::Package
  class << self
    include FPM::Util
  end
  # Flags '--foo' will be accessable  as attributes[:npm_foo]
  option "--bin", "NPM_EXECUTABLE",
    "The path to the npm executable you wish to run.", :default => "npm"

  option "--package-name-prefix", "PREFIX", "Name to prefix the package " \
    "name with.", :default => "node"

  option "--registry", "NPM_REGISTRY",
    "The npm registry to use instead of the default."

  private
  def input(package)
    # Notes:
    # * npm respects PREFIX
    settings = {
      "cache" => build_path("npm_cache"),
      "loglevel" => "warn",
      "global" => "true"
    }

    settings["registry"] = attributes[:npm_registry] if attributes[:npm_registry_given?]
    set_default_prefix unless attributes[:prefix_given?]

    settings["prefix"] = staging_path(attributes[:prefix])
    FileUtils.mkdir_p(settings["prefix"])

    npm_flags = []
    settings.each do |key, value|
      # npm lets you specify settings in a .npmrc but the same key=value settings
      # are valid as '--key value' command arguments to npm. Woo!
      logger.debug("Configuring npm", key => value)
      npm_flags += [ "--#{key}", value ]
    end

    install_args = [
      attributes[:npm_bin],
      "install",
      # use 'package' or 'package@version'
     (version ? "#{package}@#{version}" : package)
    ]

    # The only way to get npm to respect the 'prefix' setting appears to
    # be to set the --global flag.
    #install_args << "--global"
    install_args += npm_flags

    safesystem(*install_args)

    # Query details about our now-installed package.
    # We do this by using 'npm ls' with json + long enabled to query details
    # about the installed package.
    npm_ls_out = safesystemout(attributes[:npm_bin], "ls", "--json", "--long", *npm_flags)
    npm_ls = JSON.parse(npm_ls_out)
    name, info = npm_ls["dependencies"].first

    self.name = [attributes[:npm_package_name_prefix], name].join("-")
    self.version = info.fetch("version", "0.0.0")

    if info.include?("repository")
      self.url = info["repository"]["url"]
    else
      self.url = "https://npmjs.org/package/#{self.name}"
    end

    self.description = info["description"]
    # Supposedly you can upload a package for npm with no author/author email 
    # so I'm being safer with this. Author can also be a hash or a string
    self.vendor = "Unknown <unknown@unknown.unknown>"
    if info.include?("author")
      author_info = info["author"]
      # If a hash, assemble into a string
      if author_info.respond_to? :fetch
        self.vendor = sprintf("%s <%s>", author_info.fetch("name", "unknown"),
                              author_info.fetch("email", "unknown@unknown.unknown"))
      else
        # Probably will need a better check for validity here
        self.vendor = author_info unless author_info == ""
      end
    end

    # npm installs dependencies in the module itself, so if you do
    # 'npm install express' it installs dependencies (like 'connect')
    # to: node_modules/express/node_modules/connect/...
    #
    # To that end, I don't think we necessarily need to include 
    # any automatic dependency information since every 'npm install'
    # is fully self-contained. That's why you don't see any bother, yet,
    # to include the package's dependencies in here.
    #
    # It's possible someone will want to decouple that in the future,
    # but I will wait for that feature request.
  end

  def set_default_prefix
    attributes[:prefix] = self.class.default_prefix
    attributes[:prefix_given?] = true
  end

  def self.default_prefix
    npm_prefix = safesystemout("npm", "prefix", "-g").chomp
    if npm_prefix.count("\n") > 0
      raise FPM::InvalidPackageConfiguration, "`npm prefix -g` returned unexpected output."
    elsif !File.directory?(npm_prefix)
      raise FPM::InvalidPackageConfiguration, "`npm prefix -g` returned a non-existent directory"
    end
    logger.info("Setting default npm install prefix", :prefix => npm_prefix)
    npm_prefix
  end

  public(:input)
end # class FPM::Package::NPM
