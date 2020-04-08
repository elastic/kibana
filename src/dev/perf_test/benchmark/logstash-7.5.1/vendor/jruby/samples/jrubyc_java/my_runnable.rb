require 'java'

class MyRunnable
  java_implements "java.lang.Runnable"

  java_signature "void run()"
  def run
    puts 'here'
  end

  java_signature "void main(String[])"
  def self.main(args)
    t = java.lang.Thread.new(MyRunnable.new)
    t.start
  end
end

=begin
~/projects/jruby/jrubyc_stuff ➔ jrubyc --java my_runnable.rb 
Compiling my_runnable.rb to class my_runnable
Generating Java class MyRunnable to MyRunnable.java
javac -cp /Users/headius/projects/jruby/lib/jruby.jar:. MyRunnable.java

~/projects/jruby/jrubyc_stuff ➔ java -cp ../lib/jruby.jar:. MyRunnable
here

~/projects/jruby/jrubyc_stuff ➔ javap MyRunnable
Compiled from "MyRunnable.java"
public class MyRunnable extends org.jruby.RubyObject implements java.lang.Runnable{
    public MyRunnable();
    public void run();
    public static void main(java.lang.String[]);
    static {};
}
=end