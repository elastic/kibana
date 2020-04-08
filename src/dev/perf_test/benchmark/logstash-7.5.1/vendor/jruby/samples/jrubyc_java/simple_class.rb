require 'java'

class SimpleRubyClass
  java_signature "void simple_method()"
  def simple_method
    puts "here!"
  end
end

=begin
~/projects/jruby/jrubyc_stuff ➔ jrubyc --java simple_class.rb 
Compiling simple_class.rb to class simple_class
Generating Java class SimpleRubyClass to SimpleRubyClass.java
javac -cp /Users/headius/projects/jruby/lib/jruby.jar:. SimpleRubyClass.java

~/projects/jruby/jrubyc_stuff ➔ javap SimpleRubyClass
Compiled from "SimpleRubyClass.java"
public class SimpleRubyClass extends org.jruby.RubyObject{
    public SimpleRubyClass();
    public void simple_method();
    static {};
}
=end
