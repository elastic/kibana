# Interface javax.jms.ObjectMessage
module JMS::ObjectMessage
  def data
    getObject
  end

  def data(val)
    setObject(val)
  end
end
