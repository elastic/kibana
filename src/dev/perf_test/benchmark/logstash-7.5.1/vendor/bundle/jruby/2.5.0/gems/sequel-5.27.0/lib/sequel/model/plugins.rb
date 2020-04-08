# frozen-string-literal: true

module Sequel
  # Empty namespace that plugins should use to store themselves,
  # so they can be loaded via Model.plugin.
  #
  # Plugins should be modules with one of the following conditions:
  # * A singleton method named apply, which takes a model, 
  #   additional arguments, and an optional block.  This is called
  #   the first time the plugin is loaded for this model (unless it was
  #   already loaded by an ancestor class), before including/extending
  #   any modules, with the arguments
  #   and block provided to the call to Model.plugin.
  # * A module inside the plugin module named ClassMethods,
  #   which will extend the model class.
  # * A module inside the plugin module named InstanceMethods,
  #   which will be included in the model class.
  # * A module inside the plugin module named DatasetMethods,
  #   which will extend the model's dataset.
  # * A singleton method named configure, which takes a model, 
  #   additional arguments, and an optional block.  This is called
  #   every time the Model.plugin method is called, after including/extending
  #   any modules.
  module Plugins
    # In the given module +mod+, define methods that are call the same method
    # on the dataset.  This is designed for plugins to define dataset methods
    # inside ClassMethods that call the implementations in DatasetMethods.
    #
    # This should not be called with untrusted input or method names that
    # can't be used literally, since it uses class_eval.
    def self.def_dataset_methods(mod, meths)
      Array(meths).each do |meth|
        mod.class_eval("def #{meth}(*args, &block); dataset.#{meth}(*args, &block) end", __FILE__, __LINE__)
      end
    end

    # Add method to +mod+ that overrides inherited_instance_variables to include the
    # values in this hash.
    def self.inherited_instance_variables(mod, hash)
      mod.send(:define_method, :inherited_instance_variables) do ||
        super().merge!(hash)
      end
    end

    # Add method to +mod+ that overrides set_dataset to call the method afterward.
    def self.after_set_dataset(mod, meth)
      mod.send(:define_method, :set_dataset) do |*a|
        r = super(*a)
        # Allow calling private class methods as methods this specifies are usually private
        send(meth)
        r
      end
    end

    method_num = 0
    method_num_mutex = Mutex.new
    # Return a unique method name symbol for the given suffix.
    SEQUEL_METHOD_NAME = lambda do |suffix|
      :"_sequel_#{suffix}_#{method_num_mutex.synchronize{method_num += 1}}"
    end

    # Define a private instance method using the block with the provided name and
    # expected arity.  If the name is given as a Symbol, it is used directly.
    # If the name is given as a String, a unique name will be generated using
    # that string.  The expected_arity should be either 0 (no arguments) or
    # 1 (single argument).
    #
    # If a block with an arity that does not match the expected arity is used,
    # a deprecation warning will be issued. The method defined should still
    # work, though it will be slower than a method with the expected arity.
    #
    # Sequel only checks arity for regular blocks, not lambdas.  Lambdas were
    # already strict in regards to arity, so there is no need to try to fix
    # arity to keep backwards compatibility for lambdas.
    #
    # Blocks with required keyword arguments are not supported by this method.
    def self.def_sequel_method(model, meth, expected_arity, &block)
      if meth.is_a?(String)
        meth = SEQUEL_METHOD_NAME.call(meth)
      end
      call_meth = meth

      unless block.lambda?
        required_args, optional_args, rest, keyword = _define_sequel_method_arg_numbers(block)

        if keyword == :required
          raise Error, "cannot use block with required keyword arguments when calling define_sequel_method with expected arity #{expected_arity}"
        end

        case expected_arity
        when 0
          unless required_args == 0
            # SEQUEL6: remove
            Sequel::Deprecation.deprecate("Arity mismatch in block passed to define_sequel_method. Expected Arity 0, but arguments required for #{block.inspect}. Support for this will be removed in Sequel 6.")
            b = block
            block = lambda{instance_exec(&b)} # Fallback
          end
        when 1
          if required_args == 0 && optional_args == 0 && !rest
            # SEQUEL6: remove
            Sequel::Deprecation.deprecate("Arity mismatch in block passed to define_sequel_method. Expected Arity 1, but no arguments accepted for #{block.inspect}.  Support for this will be removed in Sequel 6.")
            temp_method = SEQUEL_METHOD_NAME.call("temp")
            model.class_eval("def #{temp_method}(_) #{meth =~ /\A\w+\z/ ? "#{meth}_arity" : "send(:\"#{meth}_arity\")"} end", __FILE__, __LINE__)
            model.send(:alias_method, meth, temp_method)
            model.send(:undef_method, temp_method)
            model.send(:private, meth)
            meth = :"#{meth}_arity"
          elsif required_args > 1
            # SEQUEL6: remove
            Sequel::Deprecation.deprecate("Arity mismatch in block passed to define_sequel_method. Expected Arity 1, but more arguments required for #{block.inspect}.  Support for this will be removed in Sequel 6.")
            b = block
            block = lambda{|r| instance_exec(r, &b)} # Fallback
          end
        else
          raise Error, "unexpected arity passed to define_sequel_method: #{expected_arity.inspect}"
        end
      end

      model.send(:define_method, meth, &block)
      model.send(:private, meth)
      call_meth
    end

    # Return the number of required argument, optional arguments,
    # whether the callable accepts any additional arguments,
    # and whether the callable accepts keyword arguments (true, false
    # or :required).
    def self._define_sequel_method_arg_numbers(callable)
      optional_args = 0
      rest = false
      keyword = false
      callable.parameters.map(&:first).each do |arg_type, _|
        case arg_type
        when :opt
          optional_args += 1
        when :rest
          rest = true
        when :keyreq
          keyword = :required
        when :key, :keyrest
          keyword ||= true
        end
      end
      arity = callable.arity
      if arity < 0
        arity = arity.abs - 1
      end
      required_args = arity
      arity -= 1 if keyword == :required

      if callable.is_a?(Proc) && !callable.lambda?
        optional_args -= arity
      end

      [required_args, optional_args, rest, keyword]
    end
    private_class_method :_define_sequel_method_arg_numbers
  end
end
