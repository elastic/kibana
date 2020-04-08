# Interface javax.jms.BytesMessage
module JMS::BytesMessage
  def data
    # Puts the message body in read-only mode and repositions the stream of
    # bytes to the beginning
    self.reset

    available = self.body_length

    return nil if available == 0

    result     = ''
    bytes_size = 1024
    bytes      = Java::byte[bytes_size].new

    while (n = available < bytes_size ? available : bytes_size) > 0
      self.read_bytes(bytes, n)
      if n == bytes_size
        result << String.from_java_bytes(bytes)
      else
        result << String.from_java_bytes(bytes)[0..n-1]
      end
      available -= n
    end
    result
  end

  def data=(val)
    self.write_bytes(val.respond_to?(:to_java_bytes) ? val.to_java_bytes : val)
  end

  def to_s
    data
  end

end
