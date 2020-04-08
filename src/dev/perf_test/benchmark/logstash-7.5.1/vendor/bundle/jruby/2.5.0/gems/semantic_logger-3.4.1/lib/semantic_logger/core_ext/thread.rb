require 'thread'
class Thread
  # Returns the name of the current thread
  # Default:
  #    JRuby: The underlying Java thread name
  #    Other: String representation of this thread's object_id
  if defined? JRuby
    def name
      @name ||= JRuby.reference(self).native_thread.name
    end
  else
    def name
      @name ||= object_id.to_s
    end
  end

  # Set the name of this thread
  #   On JRuby it also sets the underlying Java Thread name
  if defined? JRuby
    def name=(name)
      JRuby.reference(self).native_thread.name = @name = name.to_s
    end
  else
    def name=(name)
      @name = name.to_s
    end
  end
end