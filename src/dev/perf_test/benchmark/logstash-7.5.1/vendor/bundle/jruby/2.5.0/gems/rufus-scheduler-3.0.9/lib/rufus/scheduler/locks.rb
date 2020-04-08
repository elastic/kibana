#--
# Copyright (c) 2006-2014, John Mettraux, jmettraux@gmail.com
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.
#
# Made in Japan.
#++

require 'fileutils'


class Rufus::Scheduler

  #
  # A lock that can always be acquired
  #
  class NullLock

    # Locking is always successful.
    #
    def lock; true; end

    def locked?; true; end
    def unlock; true; end
  end

  #
  # The standard flock mecha, with its own class thanks to @ecin
  #
  class FileLock

    attr_reader :path

    def initialize(path)

      @path = path.to_s
    end

    # Locking is successful if this Ruby process can create and lock
    # its lockfile (at the given path).
    #
    def lock

      return true if locked?

      @lockfile = nil

      FileUtils.mkdir_p(::File.dirname(@path))

      file = File.new(@path, File::RDWR | File::CREAT)
      locked = file.flock(File::LOCK_NB | File::LOCK_EX)

      return false unless locked

      now = Time.now

      file.print("pid: #{$$}, ")
      file.print("scheduler.object_id: #{self.object_id}, ")
      file.print("time: #{now}, ")
      file.print("timestamp: #{now.to_f}")
      file.flush

      @lockfile = file

      true
    end

    def unlock

      !! (@lockfile && @lockfile.flock(File::LOCK_UN))
    end

    def locked?

      !! (@lockfile && @lockfile.flock(File::LOCK_NB | File::LOCK_EX))
    end
  end
end

