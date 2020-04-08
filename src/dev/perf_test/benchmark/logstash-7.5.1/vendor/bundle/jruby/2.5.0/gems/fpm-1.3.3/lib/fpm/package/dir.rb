require "fpm/package"
require "fpm/util"
require "backports"
require "fileutils"
require "find"
require "socket"

# A directory package.
#
# This class supports both input and output. As a note, 'output' will
# only emit the files, not any metadata. This is an effective way
# to extract another package type.
class FPM::Package::Dir < FPM::Package
  private

  # Add a new path to this package.
  #
  # A special handling of the path occurs if it includes a '=' symbol.
  # You can say "source=destination" and it will copy files from that source
  # to the given destination in the package.
  #
  # This lets you take a local directory and map it to the desired location at
  # packaging time. Such as: "./src/redis-server=/usr/local/bin" will make
  # the local file ./src/redis-server appear as /usr/local/bin/redis-server in
  # your package.
  #
  # If the path is a directory, it is copied recursively. The behavior
  # of the copying is modified by the :chdir and :prefix attributes.
  #
  # If :prefix is set, the destination path is prefixed with that value.
  # If :chdir is set, the current directory is changed to that value
  # during the copy.
  #
  # Example: Copy /etc/X11 into this package as /opt/xorg/X11:
  #
  #     package.attributes[:prefix] = "/opt/xorg"
  #     package.attributes[:chdir] = "/etc"
  #     package.input("X11")
  def input(path)
    chdir = attributes[:chdir] || "."

    # Support mapping source=dest
    # This mapping should work the same way 'rsync -a' does
    #   Meaning 'rsync -a source dest'
    #   and 'source=dest' in fpm work the same as the above rsync
    if path =~ /.=./ && !File.exists?(chdir == '.' ? path : File.join(chdir, path))
      origin, destination = path.split("=", 2)

      if File.directory?(origin) && origin[-1,1] == "/"
        chdir = chdir == '.' ? origin : File.join(chdir, origin)
        source = "."
      else
        origin_dir = File.dirname(origin)
        chdir = chdir == '.' ? origin_dir : File.join(chdir, origin_dir)
        source = File.basename(origin)
      end
    else
      source, destination = path, "/"
    end

    if attributes[:prefix]
      destination = File.join(attributes[:prefix], destination)
    end

    destination = File.join(staging_path, destination)

    logger["method"] = "input"
    begin
      ::Dir.chdir(chdir) do
        begin
          clone(source, destination)
        rescue Errno::ENOENT => e
          raise FPM::InvalidPackageConfiguration,
            "Cannot package the path '#{File.join(chdir, source)}', does it exist?"
        end
      end
    rescue Errno::ENOENT => e
      raise FPM::InvalidPackageConfiguration, 
        "Cannot chdir to '#{chdir}'. Does it exist?"
    end

    # Set some defaults. This is useful because other package types
    # can include license data from themselves (rpms, gems, etc),
    # but to make sure a simple dir -> rpm works without having
    # to specify a license.
    self.license = "unknown"
    self.vendor = [ENV["USER"], Socket.gethostname].join("@")
  ensure
    # Clean up any logger context we added.
    logger.remove("method")
  end # def input

  # Output this package to the given directory.
  def output(output_path)
    output_check(output_path)

    output_path = File.expand_path(output_path)
    ::Dir.chdir(staging_path) do
      logger["method"] = "output"
      clone(".", output_path)
    end
  ensure
    logger.remove("method")
  end # def output

  private
  # Copy a file or directory to a destination
  #
  # This is special because it respects the full path of the source.
  # Aditionally, hardlinks will be used instead of copies.
  #
  # Example:
  #
  #     clone("/tmp/hello/world", "/tmp/example")
  #
  # The above will copy, recursively, /tmp/hello/world into
  # /tmp/example/hello/world
  def clone(source, destination)
    logger.debug("Cloning path", :source => source, :destination => destination)
    # Edge case check; abort if the temporary directory is the source.
    # If the temporary dir is the same path as the source, it causes
    # fpm to recursively (and forever) copy the staging directory by
    # accident (#542).
    if File.expand_path(source) == File.expand_path(::Dir.tmpdir)
      raise FPM::InvalidPackageConfiguration,
        "A source directory cannot be the root of your temporary " \
        "directory (#{::Dir.tmpdir}). fpm uses the temporary directory " \
        "to stage files during packaging, so this setting would have " \
        "caused fpm to loop creating staging directories and copying " \
        "them into your package! Oops! If you are confused, maybe you could " \
        "check your TMPDIR or TEMPDIR environment variables?"
    end

    # For single file copies, permit file destinations
    fileinfo = File.lstat(source)
    if fileinfo.file? && !File.directory?(destination) 
      if destination[-1,1] == "/"
        copy(source, File.join(destination, source))
      else
        copy(source, destination)
      end
    elsif fileinfo.symlink?
      copy(source, destination)
    else
      # Copy all files from 'path' into staging_path
      Find.find(source) do |path|
        target = File.join(destination, path)
        copy(path, target)
      end
    end
  end # def clone

  # Copy a path.
  #
  # Files will be hardlinked if possible, but copied otherwise.
  # Symlinks should be copied as symlinks.
  def copy(source, destination)
    logger.debug("Copying path", :source => source, :destination => destination)
    directory = File.dirname(destination)
    if !File.directory?(directory)
      FileUtils.mkdir_p(directory)
    end

    if File.directory?(source)
      if !File.symlink?(source)
        # Create a directory if this path is a directory
        logger.debug("Creating", :directory => destination)
        if !File.directory?(destination)
          FileUtils.mkdir(destination)
        end
      else
        # Linking symlinked directories causes a hardlink to be created, which
        # results in the source directory being wiped out during cleanup,
        # so copy the symlink.
        logger.debug("Copying symlinked directory", :source => source,
                      :destination => destination)
        FileUtils.copy_entry(source, destination)
      end
    else
      # Otherwise try copying the file.
      begin
        logger.debug("Linking", :source => source, :destination => destination)
        File.link(source, destination)
      rescue Errno::ENOENT, Errno::EXDEV, Errno::EPERM
        # Hardlink attempt failed, copy it instead
        logger.debug("Copying", :source => source, :destination => destination)
        copy_entry(source, destination)
      rescue Errno::EEXIST
        sane_path = destination.gsub(staging_path, "")
        logger.error("Cannot copy file, the destination path is probably a directory and I attempted to write a file.", :path => sane_path, :staging => staging_path)
      end
    end

    copy_metadata(source, destination)
  end # def copy

  def copy_metadata(source, destination)
    source_stat = File::lstat(source)
    dest_stat = File::lstat(destination)

    # If this is a hard-link, there's no metadata to copy.
    # If this is a symlink, what it points to hasn't been copied yet.
    return if source_stat.ino == dest_stat.ino || dest_stat.symlink?

    File.utime(source_stat.atime, source_stat.mtime, destination)
    mode = source_stat.mode
    begin
      File.lchown(source_stat.uid, source_stat.gid, destination)
    rescue Errno::EPERM
      # clear setuid/setgid
      mode &= 01777
    end

    unless source_stat.symlink?
      File.chmod(mode, destination)
    end
  end # def copy_metadata

  public(:input, :output)
end # class FPM::Package::Dir
