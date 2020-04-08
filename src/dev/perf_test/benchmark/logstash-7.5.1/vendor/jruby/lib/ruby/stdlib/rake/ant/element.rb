class Rake::Ant
  java_import org.apache.tools.ant.IntrospectionHelper
  java_import org.apache.tools.ant.RuntimeConfigurable
  java_import org.apache.tools.ant.UnknownElement

  # preserve idempotence of Ruby wrapper as much as possible
  UnknownElement.__persistent__ = true

  class UnknownElement
    attr_accessor :ant, :nesting
    # undef some method names that might collide with ant task/type names
    %w(test fail abort raise exec trap).each {|m| undef_method(m)}
    Object.instance_methods.grep(/java/).each {|m| undef_method(m)}

    def _element(name, args = {}, &block)
      Element.new(ant, name).call(self, args, &block)
    end

    def method_missing(name, *args, &block)
      ant.project.log "#{location.to_s}: #{' ' * nesting}#{task_name} -> #{name}", 5
      _element(name, *args, &block)
    end
  end

  # This is really the metadata of the element coupled with the logic for
  # instantiating an instance of an element and evaluating it.  My intention
  # is to decouple these two pieces.  This has extra value since we can then
  # also make two types of instances for both top-level tasks and for targets
  # since we have some conditionals which would then be eliminated
  class Element
    attr_reader :name

    def initialize(ant, name, clazz = nil)
      @ant, @name, @clazz = ant, name, clazz
    end

    def call(parent, args={}, &code)
      element = create_element(parent)
      assign_attributes element, args
      define_nested_elements element if @clazz
      code.arity==1 ? code[element] : element.instance_eval(&code) if block_given?
      if parent.respond_to? :add_child # Task
        parent.add_child element
        parent.runtime_configurable_wrapper.add_child element.runtime_configurable_wrapper
      elsif parent.respond_to? :add_task # Target
        parent.add_task element
      else # Just run it now
        @ant.project.log "#{element.location.to_s}: Executing #{name}", 5
        element.owning_target = Target.new.tap {|t| t.name = ""}
        element.maybe_configure
        element.execute
      end
    end

    private
    def create_element(parent) # See ProjectHelper2.ElementHandler
      UnknownElement.new(@name).tap do |e|
        if parent.respond_to?(:nesting)
          e.nesting = parent.nesting + 1
        else
          e.nesting = 1
        end
        e.ant = @ant
        e.project = @ant.project
        e.task_name = @name
        e.location = Ant.location_from_caller
        e.owning_target = @ant.current_target
      end
    end

    # This also subsumes configureId to only have to traverse args once
    def assign_attributes(instance, args)
      wrapper = RuntimeConfigurable.new instance, instance.task_name
      args.each do |key, value|
        wrapper.set_attribute to_string(key), @ant.project.replace_properties(to_string(value))
      end
    end

    def define_nested_elements(instance)
      meta_class = class << instance; self; end
      @helper = IntrospectionHelper.get_helper(@ant.project, @clazz)
      @helper.get_nested_element_map.each do |element_name, clazz|
        element = Element.new(@ant, element_name, clazz)
        meta_class.send(:define_method, Ant.safe_method_name(element_name)) do |*args, &block|
          instance.ant.project.log "#{instance.location.to_s}: #{' ' * instance.nesting}#{instance.task_name} . #{element_name}", 5
          element.call(instance, *args, &block)
        end
      end
    end

    def to_string(value)
      if String === value
        value
      elsif value.respond_to?(:to_str)
        value.to_str
      else
        value.to_s
      end
    end
  end
end
