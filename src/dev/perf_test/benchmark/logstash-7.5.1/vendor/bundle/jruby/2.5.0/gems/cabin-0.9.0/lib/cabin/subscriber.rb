class Cabin::Subscriber
  attr :output
  attr :options
  def initialize(output, options = {})
    @output = output
    @options = options
  end

  def <<(data)
    @output << data
  end
end
