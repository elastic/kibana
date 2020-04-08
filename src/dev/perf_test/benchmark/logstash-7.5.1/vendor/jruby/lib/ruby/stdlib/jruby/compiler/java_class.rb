module JRuby::Compiler
  module JavaGenerator
    module_function

    def generate_java(node, script_name = nil)
      walker = ClassNodeWalker.new(script_name)

      node.accept(walker)

      walker.script
    end

    def generate_javac(files, options)
      files_string = files.join(' ')
      jruby_home = ENV_JAVA['jruby.home']
      jruby_jar = ['jruby.jar', 'jruby-complete.jar'].find do |jar|
        File.exist? File.join(jruby_home, 'lib', jar)
      end
      classpath = [ File.join(jruby_home, 'lib', jruby_jar) ]
      if options[:classpath].size > 0
        classpath += options[:classpath]
      else
        classpath << '.'
      end
      classpath.map! { |path| "\"#{path.gsub('"', '\\"')}\"" }
      classpath = classpath.join(File::PATH_SEPARATOR)

      javac_opts = options[:javac_options].join(' ')
      target = options[:target]

      "javac #{javac_opts} -d #{target} -cp #{classpath} #{files_string}"
    end
  end

  module VisitorBuilder
    def visit(name, &block)
      define_method :"visit_#{name.to_s}_node" do |node|
        log "visit: #{node.node_type} - #{node}"
        with_node(node) { instance_eval(&block) }
      end
    end

    def visit_default(&block)
      define_method :method_missing do |name, node|
        if name.to_s.start_with?('visit')
          log "visit: (default) #{node.node_type} - #{node}"
          block.call(node)
        else
          super
        end
      end
    end
  end

  class ClassNodeWalker

    LOG = $VERBOSE # whether to generate verbose output

    AST = org.jruby.ast

    include AST::visitor::NodeVisitor

    java_import AST::NodeType
    java_import java.io.ByteArrayInputStream

    extend VisitorBuilder

    attr_reader :script
    attr_accessor :class_stack, :method_stack, :signature, :annotations, :node

    def initialize(script_name = nil)
      @script = RubyScript.new(script_name)
      @class_stack = []
      @method_stack = []
      @signature = nil
      @annotations = []
      @name = nil
      @node = nil
    end

    def add_imports(nodes)
      nodes.each do |n|
        @script.add_import(name_or_value(n))
      end
    end

    def set_signature(name)
      @signature = name
    end

    def add_annotation(nodes)
      nodes.each do
        name = name_or_value(nodes[0])
        @annotations << name
      end
    end

    def add_interface(*ifc_nodes)
      ifc_nodes.
        map {|ifc| defined?(ifc.name) ? ifc.name.to_s : ifc.value}.
        each {|ifc| current_class.add_interface(ifc)}
    end

    def new_class(name)
      klass = @script.new_class(name, @annotations)
      @annotations = []

      class_stack.push(klass)
    end

    def current_class
      class_stack[0]
    end

    def pop_class
      class_stack.pop
      @signature = nil
      @annotations = []
    end

    def new_method(name)
      method = current_class.new_method(name, @signature, @annotations)
      @signature = nil
      @annotations = []

      method_stack.push(method)
    end

    def new_static_method(name)
      method = current_class.new_method(name, @signature, @annotations)
      method.static = true
      @signature = nil
      @annotations = []

      method_stack.push(method)
    end

    def current_method
      method_stack[0]
    end

    def pop_method
      method_stack.pop
    end

    def private_methods(names)
      names.each { |name| current_class.private_method(name) }
    end

    def protected_methods(names)
      names.each { |name| current_class.protected_method(name) }
    end

    def public_methods(names)
      names.each { |name| current_class.public_method(name) }
    end

    def set_method_visibility(visibility)
      current_class.method_visibility = visibility
    end

    def build_signature(signature)
      if signature.kind_of? String
        bytes = signature.to_java_bytes
        return org.jruby.parser.JavaSignatureParser.parse(ByteArrayInputStream.new(bytes))
      else
        raise "java_signature must take a literal string"
      end
    end

    def add_field(signature)
      if signature.kind_of? String
        current_class.new_field(signature, @annotations)
        @annotations = []
      else
        raise "java_field must take a literal string"
      end
    end

    def build_args_signature(params)
      sig = ['Object']
      param_strings = params.child_nodes.map do |param|
        if param.respond_to? :type_node
          type_node = param.type_node
          next name_or_value(type_node)
        end
        raise "unknown signature element: #{param}"
      end
      sig.concat(param_strings)
      sig
    end

    def add_requires(*requires)
      requires.each { |req| @script.add_require name_or_value(req) }
    end

    def set_package(package)
      @script.package = name_or_value(package)
    end

    def name_or_value(node)
      return node.name.to_s if defined? node.name
      return node.value if defined? node.value
      raise "unknown node: #{node.inspect}"
    end

    def with_node(node)
      begin
        old, @node = @node, node
        yield
      ensure
        @node = old
      end
    end

    def error(message)
      long_message =  "#{node.position}: #{message}"
      raise long_message
    end

    def log(str)
      puts "[jrubyc] #{str}" if LOG
    end

    visit :args do
      # Duby-style arg specification, only pre supported for now
      if node.pre && node.pre.child_nodes.find {|pre_arg| pre_arg.respond_to? :type_node}
        current_method.java_signature = build_args_signature(node.pre)
      end
      node.pre && node.pre.child_nodes.each do |pre_arg|
        current_method.args << pre_arg.name.to_s
      end
      node.opt_args && node.opt_args.child_nodes.each do |pre_arg|
        current_method.args << pre_arg.name.to_s
      end
      node.post && node.post.child_nodes.each do |post_arg|
        current_method.args << post_arg.name.to_s
      end
      if node.has_rest_arg
        current_method.args << node.rest_arg_node.name.to_s
      end
      if node.block
        current_method.args << node.block.name.to_s
      end

      # if method still has no signature, generate one
      unless current_method.java_signature
        args_string = current_method.args.map { |arg| "Object #{arg}" }.join(',')
        sig_string = "Object #{current_method.name.to_s}(#{args_string})"
        current_method.java_signature = build_signature(sig_string)
      end
    end

    visit :class do
      new_class(node.cpath.name.to_s)
      node.body_node.accept(self)
      pop_class
    end

    visit :defn do
      next if @class_stack.empty?
      new_method(node.name.to_s)
      node.args_node.accept(self)
      pop_method
    end

    visit :defs do
      next if @class_stack.empty?
      new_static_method(node.name.to_s)
      node.args_node.accept(self)
      pop_method
    end

    visit :fcall do
      case node.name.to_s
      when 'java_import'
        add_imports node.args_node.child_nodes
      when 'java_signature'
        set_signature build_signature(node.args_node.child_nodes[0].value)
      when 'java_annotation'
        add_annotation(node.args_node.child_nodes)
      when 'java_implements'
        add_interface(*node.args_node.child_nodes)
      when 'java_require'
        add_requires(*node.args_node.child_nodes)
      when 'java_package'
        set_package(*node.args_node.child_nodes)
      when 'java_field'
        add_field(node.args_node.child_nodes[0].value)
      when 'private'
        private_methods(node.args_node.child_nodes.map(&:name))
      when 'protected'
        protected_methods(node.args_node.child_nodes.map(&:name))
      when 'public'
        public_methods(node.args_node.child_nodes.map(&:name))
      end
    end

    visit :vcall do
      case node.name.to_s
      when 'private' # visibility modifier without args
        set_method_visibility :private
      when 'protected'
        set_method_visibility :protected
      when 'public'
        set_method_visibility :public
      end
    end

    visit :block do
      node.child_nodes.each { |node| node.accept self }
    end

    visit :newline do
      node.next_node.accept(self)
    end

    visit :nil do
    end

    visit :root do
      node.body_node.accept(self)
    end

    visit_default do |node|
      # ignore other nodes
    end
  end

  class RubyScript
    BASE_IMPORTS = [
      "org.jruby.Ruby",
      "org.jruby.RubyObject",
      "org.jruby.runtime.Helpers",
      "org.jruby.runtime.builtin.IRubyObject",
      "org.jruby.javasupport.JavaUtil",
      "org.jruby.RubyClass"
    ]

    def initialize(script_name, imports = BASE_IMPORTS)
      @classes = []
      @script_name = script_name
      @imports = imports.dup
      @requires = []
      @package = ''
    end

    attr_reader :classes, :imports, :script_name, :requires
    attr_accessor :package

    def add_import(name)
      @imports << name
    end

    def add_require(require)
      @requires << require
    end

    def new_class(name, annotations = [])
      RubyClass.new(name, imports, script_name, annotations, requires, package).tap { |klass| @classes << klass }
    end

    def to_s
      str = ''
      @classes.each do |cls|
        str << cls.to_s
      end
      str
    end
  end

  class RubyClass

    include_package 'org.jruby.ast.java_signature'

    def initialize(name, imports = [], script_name = nil, annotations = [], requires = [], package = '')
      @name = name
      @imports = imports
      @script_name = script_name
      @fields = []
      @methods = []
      @annotations = annotations
      @interfaces = []
      @requires = requires
      @package = package
    end

    attr_reader :name, :script_name
    attr_accessor :methods, :fields, :annotations, :interfaces, :requires, :package, :sourcefile

    def has_constructor?
      !!methods.find { |method| constructor?(method.name.to_s, method.java_signature) }
    end

    def new_field(java_signature, annotations = [])
      fields << [java_signature, annotations]
    end

    def new_method(name, java_signature = nil, annotations = [])
      if constructor?(name, java_signature)
        method = RubyConstructor.new(self, java_signature, annotations, method_visibility)
      else
        method = RubyMethod.new(self, name, java_signature, annotations, method_visibility)
      end

      methods << method
      method
    end

    attr_reader :method_visibility # current (Ruby) method modifier e.g. protected
    def method_visibility=(visibility); @method_visibility = visibility end

    def private_method(name)
      return if name.to_s.eql?('initialize')
      method = methods.find { |m| m.name.to_s == name.to_s } || raise(NoMethodError.new("could not find method :#{name}"))
      method.visibility = :private
    end

    def protected_method(name)
      method = methods.find { |m| m.name.to_s == name.to_s } || raise(NoMethodError.new("could not find method :#{name}"))
      method.visibility = :protected
    end

    def public_method(name)
      method = methods.find { |m| m.name.to_s == name.to_s } || raise(NoMethodError.new("could not find method :#{name}"))
      method.visibility = :public
    end

    def constructor?(name, java_signature = nil)
      name.to_s.eql?('initialize') || java_signature.is_a?(ConstructorSignatureNode)
    end
    private :constructor?

    def add_interface(ifc)
      @interfaces << ifc
    end

    def interface_string
      return '' if @interfaces.empty?
      "implements #{@interfaces.join(', ')}"
    end

    def static_init
      return <<JAVA
    static {
#{requires_string}
        RubyClass metaclass = __ruby__.getClass(\"#{name.to_s}\");
        if (metaclass == null) throw new NoClassDefFoundError(\"Could not load Ruby class: #{name.to_s}\");
        metaclass.setRubyStaticAllocator(#{name.to_s}.class);
        __metaclass__ = metaclass;
    }
JAVA
    end

    def annotations_string
      annotations.map { |anno| "@#{anno}" }.join("\n")
    end

    def methods_string # skip methods marked as (Ruby) private
      methods.select { |method| method.visibility != :private }.map(&:to_s).join("\n")
    end

    def requires_string
      if requires.size == 0
        source = File.read script_name
        source_chunks = source.unpack("a32000" * (source.size / 32000 + 1))
        source_chunks.each do |chunk|
          chunk.gsub!(/([\\"])/, '\\\\\1')
          chunk.gsub!("\n", "\\n\" +\n            \"")
        end
        source_line = source_chunks.join("\")\n          .append(\"");

        "        String source = new StringBuilder(\"#{source_line}\").toString();\n        __ruby__.executeScript(source, \"#{script_name}\");"
      else
        requires.map do |r|
          "        __ruby__.getLoadService().require(\"#{r}\");"
        end.join("\n")
      end
    end

    def package_string
      return '' if package.empty?
      "package #{package};"
    end

    def constructor_string
      str = <<JAVA
    /**
     * Standard Ruby object constructor, for construction-from-Ruby purposes.
     * Generally not for user consumption.
     *
     * @param ruby The JRuby instance this object will belong to
     * @param metaclass The RubyClass representing the Ruby class of this object
     */
    private #{name.to_s}(Ruby ruby, RubyClass metaclass) {
        super(ruby, metaclass);
    }

    /**
     * A static method used by JRuby for allocating instances of this object
     * from Ruby. Generally not for user comsumption.
     *
     * @param ruby The JRuby instance this object will belong to
     * @param metaClass The RubyClass representing the Ruby class of this object
     */
    public static IRubyObject __allocate__(Ruby ruby, RubyClass metaClass) {
        return new #{name.to_s}(ruby, metaClass);
    }
JAVA

      unless has_constructor?
        str << <<JAVA

    /**
     * Default constructor. Invokes this(Ruby, RubyClass) with the classloader-static
     * Ruby and RubyClass instances assocated with this class, and then invokes the
     * no-argument 'initialize' method in Ruby.
     */
    public #{name.to_s}() {
        this(__ruby__, __metaclass__);
        Helpers.invoke(__ruby__.getCurrentContext(), this, "initialize");
    }
JAVA
      end

      str
    end

    def to_s
      class_string = <<JAVA
#{package_string}

#{imports_string}

#{annotations_string}
public class #{name.to_s} extends RubyObject #{interface_string} {
    private static final Ruby __ruby__ = Ruby.getGlobalRuntime();
    private static final RubyClass __metaclass__;

#{static_init}
#{constructor_string}
#{fields_string}
#{methods_string}
}
JAVA

      class_string
    end

    def imports_string
      @imports.map do |import|
        "import #{import};"
      end.join("\n")
    end

    def fields_string
      @fields.map do |field|
        signature, annotations = field[0], field[1]
        annotations_string = annotations.map { |anno| "@#{anno}" }.join("\n")
        "    #{annotations_string}\n    #{signature};\n"
      end.join("\n\n")
    end
  end

  class RubyMethod
    # How many arguments we can invoke without needing to box arguments
    MAX_UNBOXED_ARITY_LENGTH = 3

    def initialize(ruby_class, name, java_signature = nil, annotations = [], visibility = nil)
      @ruby_class = ruby_class
      @name = name
      @java_signature = java_signature
      @static = false
      @args = []
      @annotations = annotations
      @visibility = visibility
    end

    attr_accessor :args, :name, :java_signature, :static, :annotations, :visibility

    def private?
      visibility == :private
    end

    def constructor?
      false
    end

    def arity
      typed_args.size
    end

    def to_s
      declarator_string do
        <<-JAVA
#{conversion_string(var_names)}
        IRubyObject ruby_result = Helpers.invoke(__ruby__.getCurrentContext(), #{static ? '__metaclass__' : 'this'}, \"#{name.to_s}\"#{passed_args});
        #{return_string}
        JAVA
      end
    end

    def declarator_string(&body)
      <<JAVA
    #{annotations_string}
    #{modifier_string} #{return_type} #{java_name}(#{declared_args}) #{throws_exceptions}{
#{body.call}
    }
JAVA
    end

    def annotations_string
      annotations.map { |anno| "@#{anno}" }.join("\n")
    end

    def conversion_string(var_names)
      if arity <= MAX_UNBOXED_ARITY_LENGTH
        var_names.map { |a| "        IRubyObject ruby_arg_#{a} = JavaUtil.convertJavaToRuby(__ruby__, #{a});"}.join("\n")
      else
        str =  "        IRubyObject ruby_args[] = new IRubyObject[#{arity}];\n"
        var_names.each_with_index { |a, i| str += "        ruby_args[#{i}] = JavaUtil.convertJavaToRuby(__ruby__, #{a});\n" }
        str
      end
    end

    # FIXME: We should allow all valid modifiers
    def modifier_string
      modifiers = {}
      java_signature.modifiers.reject(&:annotation?).each {|m| modifiers[m.to_s] = m.to_s}
      is_static = static || modifiers["static"]
      static_str = is_static ? ' static' : ''
      abstract_str = modifiers["abstract"] ? ' abstract' : ''
      final_str = modifiers["final"] ? ' final' : ''
      native_str = modifiers["native"] ? ' native' : ''
      synchronized_str = modifiers["synchronized"] ? ' synchronized' : ''
      # only make sense for fields
      #is_transient = modifiers["transient"]
      #is_volatile = modifiers["volatile"]
      strictfp_str = modifiers["strictfp"] ? ' strictfp' : ''
      visibilities = modifiers.keys.to_a.grep(/public|private|protected/)
      if visibilities.size > 0
        visibility_str = "#{visibilities[0]}"
      else # explicit java_signature takes precedence over Ruby visibility
        visibility_str = visibility || 'public'
      end

      annotations = java_signature.modifiers.select(&:annotation?).map(&:to_s).join(' ')

      "#{annotations}#{visibility_str}#{static_str}#{final_str}#{abstract_str}#{strictfp_str}#{native_str}#{synchronized_str}"
    end

    def typed_args
      @typed_args ||= begin
        i = 0
        java_signature.parameters.map do |a|
          type = a.type.name.to_s
          if a.variable_name
            var_name = a.variable_name
          else
            var_name = args[i]; i += 1
          end

          { :name => var_name, :type => type }
        end
      end
    end

    def throws_exceptions
      if java_signature.throws && !java_signature.throws.empty?
        "throws #{java_signature.throws.join(', ')} "
      else
        ''
      end
    end

    def declared_args
      @declared_args ||= typed_args.map { |a| "#{a[:type]} #{a[:name]}" }.join(', ')
    end

    def var_names
      @var_names ||= typed_args.map {|a| a[:name]}
    end

    def passed_args
      @passed_args ||= begin
        if arity <= MAX_UNBOXED_ARITY_LENGTH
          passed_args = var_names.map { |var| "ruby_arg_#{var}" }.join(', ')
          passed_args = ', ' + passed_args if args.size > 0
          passed_args
        else
          ', ruby_args'
        end
      end
    end

    def return_type
      has_java_signature!
      java_signature.return_type
    end

    def return_string
      has_java_signature!
      if return_type.void?
        "return;"
      else
        # Can't return wrapped array as primitive array
        cast_to = return_type.is_array ? return_type.fully_typed_name : return_type.wrapper_name
        "return (#{cast_to})ruby_result.toJava(#{return_type.name}.class);"
      end
    end

    def java_name
      has_java_signature!
      java_signature.name
    end

    private

    def has_java_signature!
      raise "no java_signature has been set for method #{name.to_s}" unless java_signature
    end

  end

  class RubyConstructor < RubyMethod
    def initialize(ruby_class, java_signature = nil, annotations = [], visibility = nil)
      super(ruby_class, 'initialize', java_signature, annotations, visibility)
    end

    def constructor?
      true
    end

    def java_name
      @ruby_class.name
    end

    def return_type
      ''
    end

    def to_s
      declarator_string do
        <<-JAVA
        this(__ruby__, __metaclass__);
#{conversion_string(var_names)}
        Helpers.invoke(__ruby__.getCurrentContext(), this, \"initialize\"#{passed_args});
        JAVA
      end
    end
  end
end
