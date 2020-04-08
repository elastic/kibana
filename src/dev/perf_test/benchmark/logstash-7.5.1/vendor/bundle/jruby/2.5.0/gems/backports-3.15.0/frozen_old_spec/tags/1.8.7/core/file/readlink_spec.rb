fails:File.readlink File.readlink with absolute paths return the name of the file referenced by the given link
fails:File.readlink File.readlink with absolute paths returns the name of the file referenced by the given link when the file does not exist
fails:File.readlink File.readlink with absolute paths raises an Errno::ENOENT if there is no such file
fails:File.readlink File.readlink with absolute paths raises an Errno::EINVAL if called with a normal file
fails:File.readlink File.readlink when changing the working directory returns the name of the file referenced by the given link
fails:File.readlink File.readlink when changing the working directory returns the name of the file referenced by the given link when the file does not exist
