# encoding: utf-8
# code downloaded from Ruby on Rails 4.2.1
# https://raw.githubusercontent.com/rails/rails/v4.2.1/activesupport/lib/active_support/core_ext/file/atomic.rb
# change method name to avoid borking active_support and vice versa
require 'fileutils'

module FileHelper
  extend self
  # Write to a file atomically. Useful for situations where you don't
  # want other processes or threads to see half-written files.
  #
  #   File.write_atomically('important.file') do |file|
  #     file.write('hello')
  #   end
  def write_atomically(file_name)

    if File.exist?(file_name)
      # Get original file permissions
      old_stat = File.stat(file_name)
    else
      # If not possible, probe which are the default permissions in the
      # destination directory.
      old_stat = probe_stat_in(File.dirname(file_name))
    end

    mode = old_stat ? old_stat.mode : nil

    # Create temporary file with identical permissions
    temp_file = File.new(rand_filename(file_name), "w", mode)
    temp_file.binmode
    return_val = yield temp_file
    temp_file.close

    # Overwrite original file with temp file
    File.rename(temp_file.path, file_name)

    # Unable to get permissions of the original file => return
    return return_val if old_stat.nil?

    # Set correct uid/gid on new file
    File.chown(old_stat.uid, old_stat.gid, file_name) if old_stat

    return_val
  end

  def device?(file_name)
    File.chardev?(file_name) || File.blockdev?(file_name)
  end

  # Private utility method.
  def probe_stat_in(dir) #:nodoc:
    basename = rand_filename(".permissions_check")
    file_name = File.join(dir, basename)
    FileUtils.touch(file_name)
    File.stat(file_name)
  rescue
    # ...
  ensure
    FileUtils.rm_f(file_name) if File.exist?(file_name)
  end

  def rand_filename(prefix)
    [ prefix, Thread.current.object_id, Process.pid, rand(1000000) ].join('.')
  end
end
