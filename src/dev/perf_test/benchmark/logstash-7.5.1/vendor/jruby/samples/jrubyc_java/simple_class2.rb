require 'java'

class MyRubyClass
  java_signature 'void helloWorld()'
  def helloWorld
    puts "Hello from Ruby"
  end
  
  java_signature 'void goodbyeWorld(String)'
  def goodbyeWorld(a)
    puts a
  end
end
