require "backports" # gem backports
require "fpm/package"
require "fpm/util"
require "fileutils"
require "fpm/package/dir"

# Use a zip as a package.
#
# This provides no metadata. Both input and output are supported.
class FPM::Package::Zip < FPM::Package

  # Input a zipfile.
  def input(input_path)
    # use part of the filename as the package name
    self.name = File.extname(input_path)[1..-1]

    realpath = Pathname.new(input_path).realpath.to_s
    ::Dir.chdir(build_path) do
      safesystem("unzip", realpath)
    end

    # use dir to set stuff up properly, mainly so I don't have to reimplement
    # the chdir/prefix stuff special for zip.
    dir = convert(FPM::Package::Dir)
    if attributes[:chdir]
      dir.attributes[:chdir] = File.join(build_path, attributes[:chdir])
    else
      dir.attributes[:chdir] = build_path
    end

    cleanup_staging
    # Tell 'dir' to input "." and chdir/prefix will help it figure out the
    # rest.
    dir.input(".")
    @staging_path = dir.staging_path
    dir.cleanup_build
  end # def input

  # Output a tarball.
  #
  # If the output path ends predictably (like in .tar.gz) it will try to obey
  # the compression type.
  def output(output_path)
    output_check(output_path)
    
    files = Find.find(staging_path).to_a
    safesystem("zip", output_path, *files)
  end # def output

  # Generate the proper tar flags based on the path name.
  def tar_compression_flag(path)
    case path
      when /\.tar\.bz2$/
        return "-j"
      when /\.tar\.gz$|\.tgz$/
        return "-z"
      when /\.tar\.xz$/
        return "-J"
      else
        return nil
    end
  end # def tar_compression_flag
end # class FPM::Package::Tar
