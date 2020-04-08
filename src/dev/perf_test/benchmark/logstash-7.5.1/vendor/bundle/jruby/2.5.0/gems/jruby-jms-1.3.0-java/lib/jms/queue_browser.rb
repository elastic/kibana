# Interface javax.jms.QueueBrowser
module JMS::QueueBrowser
  # For each message on the queue call the supplied Proc
  def each(params={}, &block)
    raise(ArgumentError, 'JMS::QueueBrowser::each requires a code block to be executed for each message received') unless block

    e = self.getEnumeration
    while e.hasMoreElements
      block.call(e.nextElement)
    end
  end
end
