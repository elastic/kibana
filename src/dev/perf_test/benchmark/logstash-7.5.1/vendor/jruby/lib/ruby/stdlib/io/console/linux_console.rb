require 'ffi'

raise LoadError.new("native console only supported on i386, x86_64 and powerpc64") unless FFI::Platform::ARCH =~ /i386|x86_64|powerpc64/

module IO::LibC
  extend FFI::Library
  ffi_lib FFI::Library::LIBC

  typedef :uint, :tcflag_t
  typedef :uint, :speed_t

  VINTR = 0
  VQUIT = 1
  VERASE = 2
  VKILL = 3
  VEOF = 4
  VTIME = 5
  VMIN = 6
  VSWTC = 7
  VSTART = 8
  VSTOP = 9
  VSUSP = 10
  VEOL = 11
  VREPRINT = 12
  VDISCARD = 13
  VWERASE = 14
  VLNEXT = 15
  VEOL2 = 16

  # c_iflag bits
  IGNBRK = 0000001
  BRKINT = 0000002
  IGNPAR = 0000004
  PARMRK = 0000010
  INPCK = 0000020
  ISTRIP = 0000040
  INLCR = 0000100
  IGNCR = 0000200
  ICRNL = 0000400
  IUCLC = 0001000
  IXON = 0002000
  IXANY = 0004000
  IXOFF = 0010000
  IMAXBEL = 0020000
  IUTF8 = 0040000

  # c_oflag bits
  OPOST = 0000001
  OLCUC = 0000002
  ONLCR = 0000004
  OCRNL = 0000010
  ONOCR = 0000020
  ONLRET = 0000040
  OFILL = 0000100
  OFDEL = 0000200
  NLDLY = 0000400
  NL0 = 0000000
  NL1 = 0000400
  CRDLY = 0003000
  CR0 = 0000000
  CR1 = 0001000
  CR2 = 0002000
  CR3 = 0003000
  TABDLY = 0014000
  TAB0 = 0000000
  TAB1 = 0004000
  TAB2 = 0010000
  TAB3 = 0014000
  XTABS = 0014000
  BSDLY = 0020000
  BS0 = 0000000
  BS1 = 0020000
  VTDLY = 0040000
  VT0 = 0000000
  VT1 = 0040000
  FFDLY = 0100000
  FF0 = 0000000
  FF1 = 0100000

  # c_cflag bit meaning
  CBAUD = 0010017
  B0 = 0000000
  B50 = 0000001
  B75 = 0000002
  B110 = 0000003
  B134 = 0000004
  B150 = 0000005
  B200 = 0000006
  B300 = 0000007
  B600 = 0000010
  B1200 = 0000011
  B1800 = 0000012
  B2400 = 0000013
  B4800 = 0000014
  B9600 = 0000015
  B19200 = 0000016
  B38400 = 0000017
  EXTA = B19200
  EXTB = B38400
  CSIZE = 0000060
  CS5 = 0000000
  CS6 = 0000020
  CS7 = 0000040
  CS8 = 0000060
  CSTOPB = 0000100
  CREAD = 0000200
  PARENB = 0000400
  PARODD = 0001000
  HUPCL = 0002000
  CLOCAL = 0004000
  CBAUDEX = 0010000
  BOTHER = 0010000
  B57600 = 0010001
  B115200 = 0010002
  B230400 = 0010003
  B460800 = 0010004
  B500000 = 0010005
  B576000 = 0010006
  B921600 = 0010007
  B1000000 = 0010010
  B1152000 = 0010011
  B1500000 = 0010012
  B2000000 = 0010013
  B2500000 = 0010014
  B3000000 = 0010015
  B3500000 = 0010016
  B4000000 = 0010017
  CIBAUD	  = 002003600000
  CMSPAR	  = 010000000000
  CRTSCTS	  = 020000000000

  IBSHIFT	  = 16

  # c_lflag bits
  ISIG = 0000001
  ICANON = 0000002
  XCASE = 0000004
  ECHO = 0000010
  ECHOE = 0000020
  ECHOK = 0000040
  ECHONL = 0000100
  NOFLSH = 0000200
  TOSTOP = 0000400
  ECHOCTL = 0001000
  ECHOPRT = 0002000
  ECHOKE = 0004000
  FLUSHO = 0010000
  PENDIN = 0040000
  IEXTEN = 0100000

  # tcflow() and TCXONC use these
  TCOOFF	 = 0
  TCOON	 = 1
  TCIOFF	 = 2
  TCION	 = 3

  # tcflush() and TCFLSH use these
  TCIFLUSH = 0
  TCOFLUSH = 1
  TCIOFLUSH = 2

  # tcsetattr uses these
  TCSANOW	 = 0
  TCSADRAIN = 1
  TCSAFLUSH = 2
  NCCS = 19
  class Termios < FFI::Struct
    layout \
      :c_iflag, :tcflag_t,
      :c_oflag, :tcflag_t,
      :c_cflag, :tcflag_t,
      :c_lflag, :tcflag_t,
      :c_line, :uchar,
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


  TIOCGWINSZ = 0x5413
  TIOCSWINSZ = 0x5414

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
