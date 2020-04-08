# attempt to call stty; if failure, raise error
`stty 2> /dev/null`
if $?.exitstatus != 0
  raise "stty command returned nonzero exit status"
end

warn "io/console on JRuby shells out to stty for most operations"

# Non-Windows assumes stty command is available
class IO
  if RbConfig::CONFIG['host_os'].downcase =~ /linux/ && File.exists?("/proc/#{Process.pid}/fd")
    def stty(*args)
      `stty #{args.join(' ')} < /proc/#{Process.pid}/fd/#{fileno}`
    end
  else
    def stty(*args)
      `stty #{args.join(' ')}`
    end
  end

  def raw(*)
    saved = stty('-g')
    stty('raw')
    yield self
  ensure
    stty(saved)
  end

  def raw!(*)
    stty('raw')
  end

  def cooked(*)
    saved = stty('-g')
    stty('-raw')
    yield self
  ensure
    stty(saved)
  end

  def cooked!(*)
    stty('-raw')
  end

  def echo=(echo)
    stty(echo ? 'echo' : '-echo')
  end

  def echo?
    (stty('-a') =~ / -echo /) ? false : true
  end

  def noecho
    saved = stty('-g')
    stty('-echo')
    yield self
  ensure
    stty(saved)
  end

  # Not all systems return same format of stty -a output
  IEEE_STD_1003_2 = '(?<rows>\d+) rows; (?<columns>\d+) columns'
  UBUNTU = 'rows (?<rows>\d+); columns (?<columns>\d+)'

  def winsize
    match = stty('-a').match(/#{IEEE_STD_1003_2}|#{UBUNTU}/)
    [match[:rows].to_i, match[:columns].to_i]
  end

  def winsize=(size)
    stty("rows #{size[0]} cols #{size[1]}")
  end

  def iflush
  end

  def oflush
  end

  def ioflush
  end
end