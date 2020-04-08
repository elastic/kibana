require 'java'

java_import "java.lang.Deprecated"

java_annotation :Deprecated
class DeprecatedClass
end

=begin
import org.jruby.Ruby;
import org.jruby.RubyObject;
import org.jruby.runtime.Helpers;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.javasupport.JavaUtil;
import org.jruby.RubyClass;
import java.lang.Deprecated;

@Deprecated()
public class DeprecatedClass extends RubyObject  {
  private static final Ruby __ruby__ = Ruby.getGlobalRuntime();
  private static final RubyClass __metaclass__;
  static {
    __ruby__.getLoadService().require("annotated.rb");
    RubyClass metaclass = __ruby__.getClass("DeprecatedClass");
    metaclass.setClassAllocator(DeprecatedClass.class);
    if (metaclass == null) throw new NoClassDefFoundError("Could not load Ruby class: DeprecatedClass");
        __metaclass__ = metaclass;
  }
  public DeprecatedClass() {
    super(__ruby__, __metaclass__);
  }
}
=end
