require "erb"
require "fpm/namespace"
require "fpm/package"
require "fpm/errors"
require "fpm/util"
require "backports"
require "fileutils"
require "digest"

# Support for self extracting sh files (.sh files)
#
# This class only supports output of packages.
#
# The sh package is a single sh file with a bzipped tar payload concatenated to the end.
# The script can unpack the tarball to install it and call optional post install scripts.
class FPM::Package::Sh < FPM::Package

  def output(output_path)
    create_scripts

    # Make one file. The installscript can unpack itself.
    `cat #{install_script} #{payload} > #{output_path}`
    FileUtils.chmod("+x", output_path)
  end

  def create_scripts
    if script?(:before_install)
      # the scripts are kept in the payload so what would before install be if we've already
      # unpacked the payload?
      raise "sh package does not support before install scripts."
    end

    if script?(:after_install)
      File.write(File.join(fpm_meta_path, "after_install"), script(:after_install))
    end
  end

  def install_script
    path = build_path("installer.sh")
    File.open(path, "w") do |file|
      file.write template("sh.erb").result(binding)
    end
    path
  end

  # Returns the path to the tar file containing the packed up staging directory
  def payload
    payload_tar = build_path("payload.tar")
    logger.info("Creating payload tar ", :path => payload_tar)

    args = [ tar_cmd,
             "-C",
             staging_path,
             "-cf",
             payload_tar,
             "--owner=0",
             "--group=0",
             "--numeric-owner",
             "." ]

    unless safesystem(*args)
      raise "Command failed while creating payload tar: #{args}"
    end
    payload_tar
  end

  # Where we keep metadata and post install scripts and such
  def fpm_meta_path
    @fpm_meta_path ||= begin
                         path = File.join(staging_path, ".fpm")
                         FileUtils.mkdir_p(path)
                         path
                       end
  end
end
