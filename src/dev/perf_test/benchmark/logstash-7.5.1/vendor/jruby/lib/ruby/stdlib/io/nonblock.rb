class IO
  public
  def nonblock?
    !JRuby.reference(self).blocking?
  end

  def nonblock=(nonblocking)
    JRuby.reference(self).blocking = !nonblocking
  end

  def nonblock(nonblocking = true)
    old_blocking = JRuby.reference(self).blocking?
    JRuby.reference(self).blocking = !nonblocking;
    if block_given?
      begin
        yield self
      ensure
        JRuby.reference(self).blocking = old_blocking;
      end
    end
  end
end