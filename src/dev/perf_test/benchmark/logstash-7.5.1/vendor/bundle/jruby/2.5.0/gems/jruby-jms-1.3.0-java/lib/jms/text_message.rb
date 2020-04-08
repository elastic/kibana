#Interface javax.jms.TextMessage
module JMS::TextMessage
  def data
    getText
  end

  def data=(val)
    setText(val.to_s)
  end

  def to_s
    data
  end

end
