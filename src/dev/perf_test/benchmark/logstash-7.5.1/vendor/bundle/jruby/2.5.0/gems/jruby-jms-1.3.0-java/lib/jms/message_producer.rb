# Extend JMS Message Producer Interface with Ruby methods
#
# For further help on javax.jms.MessageProducer
#   http://download.oracle.com/javaee/6/api/javax/jms/MessageProducer.html
#
# Interface javax.jms.Producer
module JMS::MessageProducer

  # Return the Delivery Mode as a Ruby symbol
  #   :persistent
  #   :non_persistent
  #   nil if unknown
  def delivery_mode_sym
    case delivery_mode
    when JMS::DeliveryMode::PERSISTENT
      :persistent
    when JMS::DeliveryMode::NON_PERSISTENT
      :non_persistent
    else
      nil
    end
  end

  # Set the JMS Delivery Mode from a Ruby Symbol
  # Valid values for mode
  #   :persistent
  #   :non_persistent
  #
  # Example:
  #   producer.delivery_mode_sym = :persistent
  def delivery_mode_sym=(mode)
    self.delivery_mode =
      case mode
      when :persistent
        JMS::DeliveryMode::PERSISTENT
      when :non_persistent
        JMS::DeliveryMode::NON_PERSISTENT
      else
        raise "Unknown delivery mode symbol: #{mode}"
      end
  end

end
