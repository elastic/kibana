require 'ffi'

module IO::LibC
  extend FFI::Library
  ffi_lib FFI::Library::LIBC

  if RbConfig::CONFIG['host_os'].downcase =~ /darwin/
    typedef :ulong, :tcflag_t
    typedef :ulong, :speed_t
  else
    typedef :uint, :tcflag_t
    typedef :uint, :speed_t
  end

  # Special Control Characters
  VEOF     = 0 #  ICANON
  VEOL     = 1 #  ICANON
  VEOL2    = 2 #  ICANON together with IEXTEN
  VERASE   = 3 #  ICANON
  VWERASE  = 4 #  ICANON together with IEXTEN
  VKILL    = 5 #  ICANON
  VREPRINT = 6 #  ICANON together with IEXTEN
  VINTR    = 8 #  ISIG
  VQUIT    = 9 #  ISIG
  VSUSP    = 10 #  ISIG
  VDSUSP   = 11 #  ISIG together with IEXTEN
  VSTART   = 12 #  IXON, IXOFF
  VSTOP    = 13 #  IXON, IXOFF
  VLNEXT   = 14 #  IEXTEN
  VDISCARD = 15 #  IEXTEN
  VMIN     = 16 #  !ICANON
  VTIME    = 17 #  !ICANON
  VSTATUS  = 18 #  ICANON together with IEXTEN
  NCCS     = 20

  # Input flags - software input processing
  IGNBRK          = 0x00000001 #  ignore BREAK condition
  BRKINT          = 0x00000002 #  map BREAK to SIGINTR
  IGNPAR          = 0x00000004 #  ignore (discard) parity errors
  PARMRK          = 0x00000008 #  mark parity and framing errors
  INPCK           = 0x00000010 #  enable checking of parity errors
  ISTRIP          = 0x00000020 #  strip 8th bit off chars
  INLCR           = 0x00000040 #  map NL into CR
  IGNCR           = 0x00000080 #  ignore CR
  ICRNL           = 0x00000100 #  map CR to NL (ala CRMOD)
  IXON            = 0x00000200 #  enable output flow control
  IXOFF           = 0x00000400 #  enable input flow control
  IXANY           = 0x00000800 #  any char will restart after stop
  IMAXBEL         = 0x00002000 #  ring bell on input queue full
  IUTF8           = 0x00004000 #  maintain state for UTF-8 VERASE

  # Output flags - software output processing
  OPOST           = 0x00000001 #  enable following output processing
  ONLCR           = 0x00000002 #  map NL to CR-NL (ala CRMOD)
  OXTABS          = 0x00000004 #  expand tabs to spaces
  ONOEOT          = 0x00000008 #  discard EOT's (^D) on output)
  OCRNL           = 0x00000010 #  map CR to NL on output
  ONOCR           = 0x00000020 #  no CR output at column 0
  ONLRET          = 0x00000040 #  NL performs CR function

  # Control flags - hardware control of terminal
  CIGNORE         = 0x00000001 #  ignore control flags
  CSIZE           = 0x00000300 #  character size mask
  CS5             = 0x00000000 #  5 bits (pseudo)
  CS6             = 0x00000100 #  6 bits
  CS7             = 0x00000200 #  7 bits
  CS8             = 0x00000300 #  8 bits
  CSTOPB          = 0x00000400 #  send 2 stop bits
  CREAD           = 0x00000800 #  enable receiver
  PARENB          = 0x00001000 #  parity enable
  PARODD          = 0x00002000 #  odd parity, else even
  HUPCL           = 0x00004000 #  hang up on last close
  CLOCAL          = 0x00008000 #  ignore modem status lines
  CCTS_OFLOW      = 0x00010000 #  CTS flow control of output
  CRTS_IFLOW      = 0x00020000 #  RTS flow control of input
  CDTR_IFLOW      = 0x00040000 #  DTR flow control of input
  CDSR_OFLOW      = 0x00080000 #  DSR flow control of output
  CCAR_OFLOW      = 0x00100000 #  DCD flow control of output
  CRTSCTS         = CCTS_OFLOW | CRTS_IFLOW
  MDMBUF          = 0x00100000 #  old name for CCAR_OFLOW


  # "Local" flags - dumping ground for other state
  ECHOKE          = 0x00000001 #  visual erase for line kill
  ECHOE           = 0x00000002 #  visually erase chars
  ECHOK           = 0x00000004 #  echo NL after line kill
  ECHO            = 0x00000008 #  enable echoing
  ECHONL          = 0x00000010 #  echo NL even if ECHO is off
  ECHOPRT         = 0x00000020 #  visual erase mode for hardcopy
  ECHOCTL         = 0x00000040 #  echo control chars as ^(Char)
  ISIG            = 0x00000080 #  enable signals INTR, QUIT, [D]SUSP
  ICANON          = 0x00000100 #  canonicalize input lines
  ALTWERASE       = 0x00000200 #  use alternate WERASE algorithm
  IEXTEN          = 0x00000400 #  enable DISCARD and LNEXT
  EXTPROC         = 0x00000800 #  external processing
  TOSTOP          = 0x00400000 #  stop background jobs from output
  FLUSHO          = 0x00800000 #  output being flushed (state)
  NOKERNINFO      = 0x02000000 #  no kernel output from VSTATUS
  PENDIN          = 0x20000000 #  XXX retype pending input (state)
  NOFLSH          = 0x80000000 #  don't flush after interrupt


  # Commands passed to tcsetattr() for setting the termios structure.
  TCSANOW         = 0 #  make change immediate
  TCSADRAIN       = 1 #  drain output, then change
  TCSAFLUSH       = 2 #  drain output, flush input
  TCSASOFT        = 0x10 #  flag - don't alter h.w. state


  TCIFLUSH        = 1
  TCOFLUSH        = 2
  TCIOFLUSH       = 3
  TCOOFF          = 1
  TCOON           = 2
  TCIOFF          = 3
  TCION           = 4

  IOCPARM_MASK = 0x1fff
  IOC_OUT = 0x40000000
  IOC_IN  = 0x80000000

  def self._IOC(inout,group,num,len)
    inout | ((len & IOCPARM_MASK) << 16) | ((group.ord << 8) | num)
  end

  def self._IOR(g,n,t)
    self._IOC(IOC_OUT, g, n, find_type(t).size)
  end

  def self._IOW(g,n,t)
    self._IOC(IOC_IN, g, n, find_type(t).size)
  end


  class Termios < FFI::Struct
    layout \
      :c_iflag, :tcflag_t,
      :c_oflag, :tcflag_t,
      :c_cflag, :tcflag_t,
      :c_lflag, :tcflag_t,
      :cc_c, [ :uchar, NCCS ],
      :c_ispeed, :speed_t,
      :c_ospeed, :speed_t
  end

  class Winsize < FFI::Struct
    layout \
      :ws_row, :ushort,
      :ws_col, :ushort,
      :ws_xpixel, :ushort,
      :ws_ypixel, :ushort
  end

  TIOCGWINSZ = _IOR('t', 104, Winsize)  # get window size
  TIOCSWINSZ = _IOW('t', 103, Winsize)  # set window size

  attach_function :tcsetattr, [ :int, :int, Termios ], :int
  attach_function :tcgetattr, [ :int, Termios ], :int
  attach_function :cfgetispeed, [ Termios ], :speed_t
  attach_function :cfgetospeed, [ Termios ], :speed_t
  attach_function :cfsetispeed, [ Termios, :speed_t ], :int
  attach_function :cfsetospeed, [ Termios, :speed_t ], :int
  attach_function :cfmakeraw, [ Termios ], :int
  attach_function :tcflush, [ :int, :int ], :int
  attach_function :ioctl, [ :int, :ulong, :varargs ], :int
end
