# Workaround for IBM MQ JMS implementation that implements some undocumented methods
begin
  class com.ibm.mq.jms::MQQueueSession
    if self.method_defined?(:consume)
      def consume(params, &proc)
        Java::JavaxJms::Session.instance_method(:consume).bind(self).call(params, &proc)
      end
    end
  end

  class com.ibm.mq.jms::MQSession
    if self.method_defined?(:consume)
      def consume(params, &proc)
        Java::JavaxJms::Session.instance_method(:consume).bind(self).call(params, &proc)
      end
    end

    if self.method_defined?(:create_destination)
      def create_destination(params)
        Java::JavaxJms::Session.instance_method(:create_destination).bind(self).call(params)
      end
    end
  end

  class com.ibm.mq.jms::MQQueueBrowser
    if self.method_defined?(:each)
      def each(params, &proc)
        Java::ComIbmMsgClientJms::JmsQueueBrowser.instance_method(:each).bind(self).call(params, &proc)
      end
    end
  end

  class com.ibm.mq.jms::MQQueueReceiver
    if self.method_defined?(:each)
      def each(params, &proc)
        Java::JavaxJms::MessageConsumer.instance_method(:each).bind(self).call(params, &proc)
      end
    end

    if self.method_defined?(:get)
      def get(params={})
        Java::JavaxJms::MessageConsumer.instance_method(:get).bind(self).call(params)
      end
    end
  end

  class com.ibm.mq.jms::MQQueue
    if self.method_defined?(:delete)
      undef_method :delete
    end
  end

rescue NameError
  # Ignore errors (when we aren't using MQ)
end
