require 'jruby'

class Java::JavaLang::Object
  def inspect()
    # '<#Java::MyPackage::TheClass:0xDECAFBAD '
    header = "#<#{self.class}:0x#{Java::JavaLang::System::identity_hash_code(self).to_s(16)} "
    # Bail quickly if looping
    return header + "...>" if JRuby.runtime.inspecting?(self)
    begin
      fs = self.java_class.declared_fields # get fields
      fvals = []
      JRuby.runtime.register_inspecting(self) # loop protection
      fs.each do |f| 
        f.accessible=true # let us prod everything. Invasive :-(
        fvals << "@#{f.name} = #{f.value(self).inspect}" if !f.static?
      end
      header + "#{fvals.join(', ')}>"
    ensure
      JRuby.runtime.unregister_inspecting(self) # undo loop protection
    end
  end
end
