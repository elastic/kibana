# Extend JMS Message Interface with Ruby methods
#
# A Message is the item that can be put on a queue, or obtained from a queue.
#
# A Message consists of 3 major parts:
#   - Header
#     Accessible as attributes of the Message class
#   - Properties
#     Accessible via [] and []= methods
#   - Data
#     The actual data portion of the message
#     See the specific message types for details on how to access the data
#     portion of the message
#
# For further help on javax.jms.Message
#   http://download.oracle.com/javaee/6/api/index.html?javax/jms/Message.html
#
# Interface javax.jms.Message
module JMS::Message

  # Methods directly exposed from the Java class:

  # call-seq:
  #   acknowledge
  #
  # Acknowledges all consumed messages of the session of this consumed message
  #

  # call-seq:
  #   clear_body
  #
  #  Clears out the message body
  #

  # call-seq:
  #   clear_properties
  #
  #  Clears out the properties of this message
  #

  # Return the JMS Delivery Mode as a Ruby symbol
  #   :persistent
  #   :non_persistent
  #   nil if unknown
  def jms_delivery_mode_sym
    case jms_delivery_mode
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
  def jms_delivery_mode_sym=(mode)
    val =
      case mode
      when :persistent
        JMS::DeliveryMode::PERSISTENT
      when :non_persistent
        JMS::DeliveryMode::NON_PERSISTENT
      else
        raise "Unknown delivery mode symbol: #{mode}"
      end
    self.setJMSDeliveryMode(val)
  end

  # Return the attributes (header fields) of the message as a Hash
  def attributes
    {
      jms_correlation_id:    jms_correlation_id,
      jms_delivery_mode_sym: jms_delivery_mode_sym,
      jms_destination:       jms_destination.nil? ? nil : jms_destination.to_string,
      jms_expiration:        jms_expiration,
      jms_message_id:        jms_message_id,
      jms_priority:          jms_priority,
      jms_redelivered:       jms_redelivered?,
      jms_reply_to:          jms_reply_to,
      jms_timestamp:         jms_timestamp,
      jms_type:              jms_type,
    }
  end

  # Methods for manipulating the message properties

  # Get the value of a property
  def [](key)
    getObjectProperty key.to_s
  end

  # Set a property
  def []=(key, value)
    setObjectProperty(key.to_s, value)
  end

  # Does message include specified property?
  def include?(key)
    # Ensure a Ruby true is returned
    property_exists(key) == true
  end

  # Return Properties as a hash
  def properties
    h = {}
    properties_each_pair { |k, v| h[k]=v }
    h
  end

  # Set Properties from an existing hash
  def properties=(h)
    clear_properties
    h.each_pair { |k, v| setObjectProperty(k.to_s, v) }
    h
  end

  # Return each name value pair
  def properties_each_pair(&proc)
    enum = getPropertyNames
    while enum.has_more_elements
      key = enum.next_element
      proc.call key, getObjectProperty(key)
    end
  end

  def inspect
    "#{self.class.name}: #{data}\nAttributes: #{attributes.inspect}\nProperties: #{properties.inspect}"
  end

end
