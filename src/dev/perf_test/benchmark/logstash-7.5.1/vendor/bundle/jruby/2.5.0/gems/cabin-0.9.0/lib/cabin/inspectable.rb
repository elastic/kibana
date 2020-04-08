require "cabin/namespace"

module Cabin
  module Inspectable
    # Provide a saner inspect method that's easier to configure.
    #
    # By default, will inspect all instance variables. You can tune
    # this by setting @inspectables to an array of ivar symbols, like:
    #     [ :@hello, :@world ]
    #
    #     class Foo
    #       include Cabin::Inspectable
    #
    #       def initialize
    #         @inspectables = [:@foo, :@bar]
    #         @foo = 123
    #         @bar = "hello"
    #         @baz = "ok"
    #       end
    #     end
    #
    #     foo = Foo.new
    #     foo.inspect == '<Foo(1) @foo=123 @bar="hello" >'
    def inspect
      if instance_variable_defined?(:@inspectables)
        ivars = @inspectables
      else
        ivars = instance_variables
      end
      str = "<#{self.class.name}(@#{self.object_id}) "
      ivars.each do |ivar|
        str << "#{ivar}=#{instance_variable_get(ivar).inspect} "
      end
      str << ">"
      return str
    end
  end

  def self.__Inspectable(*ivars)
    mod = Module.new
    mod.instance_eval do
      define_method(:inspect) do
        ivars = instance_variables if ivars.empty?
        str = "<#{self.class.name}(@#{self.object_id}) "
        ivars.each do |ivar|
          str << "#{ivar}=#{instance_variable_get(ivar).inspect} "
        end
        str << ">"
        return str
      end
    end
    return mod
  end # def Cabin.Inspectable
end # module Cabin


