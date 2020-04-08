require 'jruby'

module JRuby
  # Include into a class to make all of that class's instance methods be
  # "synchronized" against the object itself. In Ruby parlance, it is as if
  # each method on the class locks against a reentrant, per-object Mutex.
  module Synchronized
    def self.append_features(cls)
      raise TypeError, "#{self} can only be included into classes" unless Class === cls
      cls_r = JRuby.reference0(cls)
      cls_r.become_synchronized
      
      super
    end
    
    def self.extend_object(obj)
      obj_r = JRuby.reference0(obj)
      singleton_class = obj_r.singleton_class
      JRuby.reference(singleton_class).become_synchronized
      
      super
    end
  end
end