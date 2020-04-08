require "cabin/namespace"

# An experiment to use AD&D-style log levels, because why not? 'info' and
# 'fatal' and other log levels are silly anyway.
#
# Plus, now you can 'include Dragons' in your logger, which means it
# has +2 against Knights and a special fire breathing attack..
module Cabin::Mixins::Dragons
  orders = %w(lawful ambivalent chaotic)
  desires = %w(good neutral evil)

  orders.each do |order|
    desires.each do |desire|
      # alignment will be like 'lawful_good' etc
      alignment = "#{order} #{desire}"
      define_method(alignment.gsub(" ", "_")) do |message, data={}|
        log(alignment, message, data)
      end
    end # desires
  end # orders

  private
  def log(alignment, message, data={})
    # Invoke 'info?' etc to ask if we should act.
    if message.is_a?(Hash)
      data.merge!(message)
    else
      data[:message] = message
    end

    data[:alignment] = alignment
    publish(data)
  end # def log
end # module Cabin::Dragons
