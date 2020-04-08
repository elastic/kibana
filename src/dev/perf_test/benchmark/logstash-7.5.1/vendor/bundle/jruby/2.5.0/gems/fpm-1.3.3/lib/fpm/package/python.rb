require "fpm/namespace"
require "fpm/package"
require "fpm/util"
require "rubygems/package"
require "rubygems"
require "fileutils"
require "tmpdir"
require "json"

# Support for python packages. 
#
# This supports input, but not output.
#
# Example:
#
#     # Download the django python package:
#     pkg = FPM::Package::Python.new
#     pkg.input("Django")
#
class FPM::Package::Python < FPM::Package
  # Flags '--foo' will be accessable  as attributes[:python_foo]
  option "--bin", "PYTHON_EXECUTABLE",
    "The path to the python executable you wish to run.", :default => "python"
  option "--easyinstall", "EASYINSTALL_EXECUTABLE",
    "The path to the easy_install executable tool", :default => "easy_install"
  option "--pip", "PIP_EXECUTABLE",
    "The path to the pip executable tool. If not specified, easy_install " \
    "is used instead", :default => nil
  option "--pypi", "PYPI_URL",
    "PyPi Server uri for retrieving packages.",
    :default => "http://pypi.python.org/simple"
  option "--package-prefix", "NAMEPREFIX",
    "(DEPRECATED, use --package-name-prefix) Name to prefix the package " \
    "name with." do |value|
    logger.warn("Using deprecated flag: --package-prefix. Please use " \
                 "--package-name-prefix")
    value
  end
  option "--package-name-prefix", "PREFIX", "Name to prefix the package " \
    "name with.", :default => "python"
  option "--fix-name", :flag, "Should the target package name be prefixed?",
    :default => true
  option "--fix-dependencies", :flag, "Should the package dependencies be " \
    "prefixed?", :default => true

  option "--downcase-name", :flag, "Should the target package name be in " \
    "lowercase?", :default => true
  option "--downcase-dependencies", :flag, "Should the package dependencies " \
    "be in lowercase?", :default => true

  option "--install-bin", "BIN_PATH", "The path to where python scripts " \
    "should be installed to."
  option "--install-lib", "LIB_PATH", "The path to where python libs " \
    "should be installed to (default depends on your python installation). " \
    "Want to find out what your target platform is using? Run this: " \
    "python -c 'from distutils.sysconfig import get_python_lib; " \
    "print get_python_lib()'"
  option "--install-data", "DATA_PATH", "The path to where data should be " \
    "installed to. This is equivalent to 'python setup.py --install-data " \
    "DATA_PATH"
  option "--dependencies", :flag, "Include requirements defined in setup.py" \
    " as dependencies.", :default => true
  option "--obey-requirements-txt", :flag, "Use a requirements.txt file " \
    "in the top-level directory of the python package for dependency " \
    "detection.", :default => false
  option "--scripts-executable", "PYTHON_EXECUTABLE", "Set custom python " \
    "interpreter in installing scripts. By default distutils will replace " \
    "python interpreter in installing scripts (specified by shebang) with " \
    "current python interpreter (sys.executable). This option is equivalent " \
    "to appending 'build_scripts --executable PYTHON_EXECUTABLE' arguments " \
    "to 'setup.py install' command."

  private

  # Input a package.
  #
  # The 'package' can be any of:
  #
  # * A name of a package on pypi (ie; easy_install some-package)
  # * The path to a directory containing setup.py
  # * The path to a setup.py
  def input(package)
    path_to_package = download_if_necessary(package, version)

    if File.directory?(path_to_package)
      setup_py = File.join(path_to_package, "setup.py")
    else
      setup_py = path_to_package
    end

    if !File.exists?(setup_py)
      logger.error("Could not find 'setup.py'", :path => setup_py)
      raise "Unable to find python package; tried #{setup_py}"
    end

    load_package_info(setup_py)
    install_to_staging(setup_py)
  end # def input

  # Download the given package if necessary. If version is given, that version
  # will be downloaded, otherwise the latest is fetched.
  def download_if_necessary(package, version=nil)
    # TODO(sissel): this should just be a 'download' method, the 'if_necessary'
    # part should go elsewhere.
    path = package
    # If it's a path, assume local build.
    if File.directory?(path) or (File.exists?(path) and File.basename(path) == "setup.py")
      return path
    end

    logger.info("Trying to download", :package => package)

    if version.nil?
      want_pkg = "#{package}"
    else
      want_pkg = "#{package}==#{version}"
    end

    target = build_path(package)
    FileUtils.mkdir(target) unless File.directory?(target)

    if attributes[:python_pip].nil?
      # no pip, use easy_install
      logger.debug("no pip, defaulting to easy_install", :easy_install => attributes[:python_easyinstall])
      safesystem(attributes[:python_easyinstall], "-i",
                 attributes[:python_pypi], "--editable", "-U",
                 "--build-directory", target, want_pkg)
    else
      logger.debug("using pip", :pip => attributes[:python_pip])
      safesystem(attributes[:python_pip], "install", "--no-deps", "--no-install", "-i", attributes[:python_pypi], "-U", "--build", target, want_pkg)
    end

    # easy_install will put stuff in @tmpdir/packagename/, so find that:
    #  @tmpdir/somepackage/setup.py
    dirs = ::Dir.glob(File.join(target, "*"))
    if dirs.length != 1
      raise "Unexpected directory layout after easy_install. Maybe file a bug? The directory is #{build_path}"
    end
    return dirs.first
  end # def download

  # Load the package information like name, version, dependencies.
  def load_package_info(setup_py)
    if !attributes[:python_package_prefix].nil?
      attributes[:python_package_name_prefix] = attributes[:python_package_prefix]
    end

    begin 
      json_test_code = [
        "try:",
        "  import json",
        "except ImportError:",
        "  import simplejson as json"
      ].join("\n")
      safesystem("#{attributes[:python_bin]} -c '#{json_test_code}'")
    rescue FPM::Util::ProcessFailed => e
      logger.error("Your python environment is missing json support (either json or simplejson python module). I cannot continue without this.", :python => attributes[:python_bin], :error => e)
      raise FPM::Util::ProcessFailed, "Python (#{attributes[:python_bin]}) is missing simplejson or json modules."
    end

    begin
      safesystem("#{attributes[:python_bin]} -c 'import pkg_resources'")
    rescue FPM::Util::ProcessFailed => e
      logger.error("Your python environment is missing a working setuptools module. I tried to find the 'pkg_resources' module but failed.", :python => attributes[:python_bin], :error => e)
      raise FPM::Util::ProcessFailed, "Python (#{attributes[:python_bin]}) is missing pkg_resources module."
    end

    # Add ./pyfpm/ to the python library path
    pylib = File.expand_path(File.dirname(__FILE__))

    # chdir to the directory holding setup.py because some python setup.py's assume that you are
    # in the same directory.
    setup_dir = File.dirname(setup_py)

    output = ::Dir.chdir(setup_dir) do
      tmp = build_path("metadata.json")
      setup_cmd = "env PYTHONPATH=#{pylib} #{attributes[:python_bin]} " \
        "setup.py --command-packages=pyfpm get_metadata --output=#{tmp}"

      if attributes[:python_obey_requirements_txt?]
        setup_cmd += " --load-requirements-txt"
      end

      # Capture the output, which will be JSON metadata describing this python
      # package. See fpm/lib/fpm/package/pyfpm/get_metadata.py for more
      # details.
      logger.info("fetching package metadata", :setup_cmd => setup_cmd)

      success = safesystem(setup_cmd)
      #%x{#{setup_cmd}}
      if !success
        logger.error("setup.py get_metadata failed", :command => setup_cmd,
                      :exitcode => $?.exitstatus)
        raise "An unexpected error occurred while processing the setup.py file"
      end
      File.read(tmp)
    end
    logger.debug("result from `setup.py get_metadata`", :data => output)
    metadata = JSON.parse(output)
    logger.info("object output of get_metadata", :json => metadata)

    self.architecture = metadata["architecture"]
    self.description = metadata["description"]
    # Sometimes the license field is multiple lines; do best-effort and just
    # use the first line.
    self.license = metadata["license"].split(/[\r\n]+/).first
    self.version = metadata["version"]
    self.url = metadata["url"]

    # name prefixing is optional, if enabled, a name 'foo' will become
    # 'python-foo' (depending on what the python_package_name_prefix is)
    if attributes[:python_fix_name?]
      self.name = fix_name(metadata["name"])
    else
      self.name = metadata["name"]
    end

    # convert python-Foo to python-foo if flag is set
    self.name = self.name.downcase if attributes[:python_downcase_name?]

    if !attributes[:no_auto_depends?] and attributes[:python_dependencies?]
      self.dependencies = metadata["dependencies"].collect do |dep|
        dep_re = /^([^<>!= ]+)\s*(?:([<>!=]{1,2})\s*(.*))?$/
        match = dep_re.match(dep)
        if match.nil?
          logger.error("Unable to parse dependency", :dependency => dep)
          raise FPM::InvalidPackageConfiguration, "Invalid dependency '#{dep}'"
        end
        name, cmp, version = match.captures

        # convert == to =
        if cmp == "=="
          logger.info("Converting == dependency requirement to =", :dependency => dep )
          cmp = "="
        end

        # dependency name prefixing is optional, if enabled, a name 'foo' will
        # become 'python-foo' (depending on what the python_package_name_prefix
        # is)
        name = fix_name(name) if attributes[:python_fix_dependencies?]

        # convert dependencies from python-Foo to python-foo
        name = name.downcase if attributes[:python_downcase_dependencies?]
        "#{name} #{cmp} #{version}"
      end
    end # if attributes[:python_dependencies?]
  end # def load_package_info

  # Sanitize package name.
  # Some PyPI packages can be named 'python-foo', so we don't want to end up
  # with a package named 'python-python-foo'.
  # But we want packages named like 'pythonweb' to be suffixed
  # 'python-pythonweb'.
  def fix_name(name)
    if name.start_with?("python")
      # If the python package is called "python-foo" strip the "python-" part while
      # prepending the package name prefix.
      return [attributes[:python_package_name_prefix], name.gsub(/^python-/, "")].join("-")
    else
      return [attributes[:python_package_name_prefix], name].join("-")
    end
  end # def fix_name

  # Install this package to the staging directory
  def install_to_staging(setup_py)
    project_dir = File.dirname(setup_py)

    prefix = "/"
    prefix = attributes[:prefix] unless attributes[:prefix].nil?
    
    # Some setup.py's assume $PWD == current directory of setup.py, so let's
    # chdir first.
    ::Dir.chdir(project_dir) do
      flags = [ "--root", staging_path ]
      if !attributes[:python_install_lib].nil?
        flags += [ "--install-lib", File.join(prefix, attributes[:python_install_lib]) ]
      elsif !attributes[:prefix].nil?
        # setup.py install --prefix PREFIX still installs libs to
        # PREFIX/lib64/python2.7/site-packages/
        # but we really want something saner.
        #
        # since prefix is given, but not python_install_lib, assume PREFIX/lib
        flags += [ "--install-lib", File.join(prefix, "lib") ]
      end

      if !attributes[:python_install_data].nil?
        flags += [ "--install-data", File.join(prefix, attributes[:python_install_data]) ]
      elsif !attributes[:prefix].nil?
        # prefix given, but not python_install_data, assume PREFIX/data
        flags += [ "--install-data", File.join(prefix, "data") ]
      end

      if !attributes[:python_install_bin].nil?
        flags += [ "--install-scripts", File.join(prefix, attributes[:python_install_bin]) ]
      elsif !attributes[:prefix].nil?
        # prefix given, but not python_install_bin, assume PREFIX/bin
        flags += [ "--install-scripts", File.join(prefix, "bin") ]
      end

      if !attributes[:python_scripts_executable].nil?
        # Overwrite installed python scripts shebang binary with provided executable
        flags += [ "build_scripts", "--executable", attributes[:python_scripts_executable] ]
      end

      safesystem(attributes[:python_bin], "setup.py", "install", *flags)
    end
  end # def install_to_staging

  public(:input)
end # class FPM::Package::Python
