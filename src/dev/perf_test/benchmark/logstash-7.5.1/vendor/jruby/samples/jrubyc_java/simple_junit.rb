require 'java'

class TestSomething
  java_annotation "org.junit.Test"
  def test_jruby_rocks
    fail unless "JRuby rocks" == "JRuby" + " " + "rocks"
  end

  java_annotation "org.junit.Test"
  def test_jruby_will_never_support_annotations
    fail("JRuby does support annotations!") if "JRuby supports annotations"
  end
end

=begin
~/projects/jruby/samples/compiler2 ➔ jrubyc -c ~/Downloads/junit-4.6.jar --java myruby3.rb 
Compiling myruby3.rb to class myruby3
Generating Java class TestSomething to TestSomething.java
javac -cp /Users/headius/projects/jruby/lib/jruby.jar:/Users/headius/Downloads/junit-4.6.jar TestSomething.java

~/projects/jruby/samples/compiler2 ➔ cat TestSomething.java 
import org.jruby.Ruby;
import org.jruby.RubyObject;
import org.jruby.runtime.Helpers;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.javasupport.JavaUtil;
import org.jruby.RubyClass;


public class TestSomething extends RubyObject  {
  private static final Ruby __ruby__ = Ruby.getGlobalRuntime();
  private static final RubyClass __metaclass__;
  static {
    __ruby__.getLoadService().require("myruby3.rb");
    RubyClass metaclass = __ruby__.getClass("TestSomething");
    metaclass.setClassAllocator(TestSomething.class);
    if (metaclass == null) throw new NoClassDefFoundError("Could not load Ruby class: TestSomething");
        __metaclass__ = metaclass;
  }
  public TestSomething() {
    super(__ruby__, __metaclass__);
  }
  @org.junit.Test()
  public Object test_jruby_rocks() {

    IRubyObject ruby_result = Helpers.invoke(__ruby__.getCurrentContext(), this, "test_jruby_rocks" );
    return (Object)ruby_result.toJava(Object.class);
  }


  @org.junit.Test()
  public Object test_jruby_will_never_support_annotations() {

    IRubyObject ruby_result = Helpers.invoke(__ruby__.getCurrentContext(), this, "test_jruby_will_never_support_annotations" );
    return (Object)ruby_result.toJava(Object.class);
  }

}
=end
