require 'java'
require 'jruby'

module JRuby
  # Extensions only provides one feature right now: stealing methods from one
  # class/module and inserting them into another.
  module Extensions
    
    # Transplant the named method from the given type into self. If self is a
    # module/class, it will gain the method. If self is not a module/class, then
    # the self object's singleton class will be used.
    def steal_method(type, method_name)
      if self.kind_of? Module
        to_add = self
      else
        to_add = JRuby.reference0(self).singleton_class
      end
      
      method_name = method_name.to_str
      
      raise TypeError, "first argument must be a module/class" unless type.kind_of? Module
      
      method = JRuby.reference0(type).search_method(method_name)
      
      if !method || method.undefined?
        raise ArgumentError, "no such method `#{method_name}' on type #{type}"
      end
      
      JRuby.reference0(to_add).add_method(method)
      
      nil
    end
    module_function :steal_method
    
    # Transplant all named methods from the given type into self. See
    # JRuby::Extensions.steal_method
    def steal_methods(type, *method_names)
      for method_name in method_names do
        steal_method(type, method_name)
      end
    end
  end
end
