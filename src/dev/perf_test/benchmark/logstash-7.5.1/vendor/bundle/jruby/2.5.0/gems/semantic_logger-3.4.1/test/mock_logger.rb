# Looks like a standard Ruby Logger or Rails Logger
# Except that it stores the last logged entry in the instance variable: message
class MockLogger
  attr_accessor :message

  Logger::Severity.constants.each do |level|
    class_eval <<-EOT, __FILE__, __LINE__
        def #{level.downcase}(message = nil, progname = nil)
          if message
            self.message = message
          elsif block_given?
            self.message = yield
          else
            self.message = progname
          end
          self.message
        end

        def #{level}?
          @true
        end
    EOT
  end

  def flush
    true
  end
end

