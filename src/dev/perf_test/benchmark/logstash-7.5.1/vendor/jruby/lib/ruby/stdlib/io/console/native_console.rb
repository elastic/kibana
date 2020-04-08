# Load appropriate native bits for BSD or Linux
case RbConfig::CONFIG['host_os'].downcase
when /darwin|openbsd|freebsd|netbsd/
  require 'io/console/bsd_console'
when /linux/
  require 'io/console/linux_console'
else
  raise LoadError.new("no native io/console support")
end

# Common logic that uses native calls for console
class IO
  def ttymode
    termios = LibC::Termios.new
    if LibC.tcgetattr(self.fileno, termios) != 0
      raise SystemCallError.new("tcgetattr", FFI.errno)
    end

    if block_given?
      yield tmp = termios.dup
      if LibC.tcsetattr(self.fileno, LibC::TCSADRAIN, tmp) != 0
        raise SystemCallError.new("tcsetattr", FFI.errno)
      end
    end
    termios
  end
  private :ttymode

  def ttymode_yield(block, &setup)
    begin
      orig_termios = ttymode { |t| setup.call(t) }
      block.call(self)
    ensure
      if orig_termios && LibC.tcsetattr(self.fileno, LibC::TCSADRAIN, orig_termios) != 0
        raise SystemCallError.new("tcsetattr", FFI.errno)
      end
    end
  end
  private :ttymode_yield

  TTY_RAW = Proc.new do |t|
    LibC.cfmakeraw(t)
    t[:c_lflag] &= ~(LibC::ECHOE|LibC::ECHOK)
  end

  def raw(*, &block)
    ttymode_yield(block, &TTY_RAW)
  end

  def raw!(*)
    ttymode(&TTY_RAW)
  end

  TTY_COOKED = Proc.new do |t|
    t[:c_iflag] |= (LibC::BRKINT|LibC::ISTRIP|LibC::ICRNL|LibC::IXON)
    t[:c_oflag] |= LibC::OPOST
    t[:c_lflag] |= (LibC::ECHO|LibC::ECHOE|LibC::ECHOK|LibC::ECHONL|LibC::ICANON|LibC::ISIG|LibC::IEXTEN)
  end

  def cooked(*, &block)
    ttymode_yield(block, &TTY_COOKED)
  end

  def cooked!(*)
    ttymode(&TTY_COOKED)
  end

  TTY_ECHO = LibC::ECHO | LibC::ECHOE | LibC::ECHOK | LibC::ECHONL
  def echo=(echo)
    ttymode do |t|
      if echo
        t[:c_lflag] |= TTY_ECHO
      else
        t[:c_lflag] &= ~TTY_ECHO
      end
    end
  end

  def echo?
    (ttymode[:c_lflag] & (LibC::ECHO | LibC::ECHONL)) != 0
  end

  def noecho(&block)
    ttymode_yield(block) { |t| t[:c_lflag] &= ~(TTY_ECHO) }
  end

  def winsize
    ws = LibC::Winsize.new
    if LibC.ioctl(self.fileno, LibC::TIOCGWINSZ, :pointer, ws.pointer) != 0
      raise SystemCallError.new("ioctl(TIOCGWINSZ)", FFI.errno)
    end
    [ ws[:ws_row], ws[:ws_col] ]
  end

  def winsize=(size)
    ws = LibC::Winsize.new
    if LibC.ioctl(self.fileno, LibC::TIOCGWINSZ, :pointer, ws.pointer) != 0
      raise SystemCallError.new("ioctl(TIOCGWINSZ)", FFI.errno)
    end

    ws[:ws_row] = size[0]
    ws[:ws_col] = size[1]
    if LibC.ioctl(self.fileno, LibC::TIOCSWINSZ, :pointer, ws.pointer) != 0
      raise SystemCallError.new("ioctl(TIOCSWINSZ)", FFI.errno)
    end
  end

  def iflush
    raise SystemCallError.new("tcflush(TCIFLUSH)", FFI.errno) unless LibC.tcflush(self.fileno, LibC::TCIFLUSH) == 0
  end

  def oflush
    raise SystemCallError.new("tcflush(TCOFLUSH)", FFI.errno) unless LibC.tcflush(self.fileno, LibC::TCOFLUSH) == 0
  end

  def ioflush
    raise SystemCallError.new("tcflush(TCIOFLUSH)", FFI.errno) unless LibC.tcflush(self.fileno, LibC::TCIOFLUSH) == 0
  end

  # TODO: Windows version uses "conin$" and "conout$" instead of /dev/tty
  def self.console(sym = nil, *args)
    raise TypeError, "expected Symbol, got #{sym.class}" unless sym.nil? || sym.kind_of?(Symbol)

    # klass = self == IO ? File : self
    if defined?(@console) # using ivar instead of hidden const as in MRI
      con = @console
      # MRI checks IO internals : (!RB_TYPE_P(con, T_FILE) || (!(fptr = RFILE(con)->fptr) || GetReadFD(fptr) == -1))
      if !con.kind_of?(File) || (con.kind_of?(IO) && (con.closed? || !FileTest.readable?(con)))
        remove_instance_variable :@console
        con = nil
      end
    end

    if sym
      if sym == :close
        if con
          con.close
          remove_instance_variable :@console if defined?(@console)
        end
        return nil
      end
    end

    if !con && $stdin.tty?
      con = File.open('/dev/tty', 'r+')
      con.sync = true
      @console = con
    end

    return con.send(sym, *args) if sym
    return con
  end
end
