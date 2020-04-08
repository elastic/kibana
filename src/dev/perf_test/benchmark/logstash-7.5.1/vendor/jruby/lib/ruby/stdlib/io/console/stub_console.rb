warn "io/console not supported; tty will not be manipulated" if $VERBOSE

# Windows version is always stubbed for now
class IO
  def raw(*)
    yield self
  end

  def raw!(*)
  end

  def cooked(*)
    yield self
  end

  def cooked!(*)
  end

  def echo=(echo)
  end

  def echo?
    true
  end

  def noecho
    yield self
  end

  def winsize
    [25, 80]
  end

  def winsize=(size)
  end

  def iflush
  end

  def oflush
  end

  def ioflush
  end
end