# Methods common to all backend impls
class IO
  def getch(*)
    raw do
      getc
    end
  end

  def getpass(prompt = nil)
    wio = self == $stdin ? $stderr : self
    wio.write(prompt) if prompt
    begin
      str = nil
      noecho do
        str = gets
      end
    ensure
      puts($/)
    end
    str.chomp
  end

  module GenericReadable
    def getch(*)
      getc
    end

    def getpass(prompt = nil)
      write(prompt) if prompt
      str = gets.chomp
      puts($/)
      str
    end
  end
end