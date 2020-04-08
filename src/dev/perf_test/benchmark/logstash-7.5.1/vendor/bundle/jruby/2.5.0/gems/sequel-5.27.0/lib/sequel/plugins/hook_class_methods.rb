# frozen-string-literal: true

module Sequel
  module Plugins
    # Sequel's built-in hook_class_methods plugin is designed for backwards
    # compatibility.  Its use is not encouraged, it is recommended to use
    # instance methods and super instead of this plugin.  This plugin allows
    # calling class methods with blocks to define hooks:
    #
    #   # Block only, can cause duplicate hooks if code is reloaded
    #   before_save{self.created_at = Time.now}
    #   # Block with tag, safe for reloading
    #   before_save(:set_created_at){self.created_at = Time.now}
    #   # Tag only, safe for reloading, calls instance method
    #   before_save(:set_created_at)
    #
    # Pretty much anything you can do with a hook class method, you can also
    # do with an instance method instead (making sure to call super), which is
    # the recommended way to add hooks in Sequel:
    #
    #    def before_save
    #      super
    #      self.created_at = Time.now
    #    end
    #
    # Usage:
    #
    #   # Allow use of hook class methods in all model subclasses (called before loading subclasses)
    #   Sequel::Model.plugin :hook_class_methods
    #
    #   # Allow the use of hook class methods in the Album class
    #   Album.plugin :hook_class_methods
    module HookClassMethods
      # Set up the hooks instance variable in the model.
      def self.apply(model)
        hooks = model.instance_variable_set(:@hooks, {})
        Model::HOOKS.each{|h| hooks[h] = []}
      end

      module ClassMethods
        Model::HOOKS.each do |h|
          class_eval(<<-END, __FILE__, __LINE__ + 1)
            def #{h}(method = nil, &block)
              add_hook(:#{h}, method, &block)
            end
          END
        end

        # Freeze hooks when freezing model class.
        def freeze
          @hooks.freeze.each_value(&:freeze)
          super
        end
    
        # Returns true if there are any hook blocks for the given hook.
        def has_hooks?(hook)
          !@hooks[hook].empty?
        end
    
        # Yield every block related to the given hook.
        def hook_blocks(hook)
          # SEQUEL6: Remove
          Sequel::Deprecation.deprecate("The hook_blocks class method in the hook_class_methods plugin is deprecated and will be removed in Sequel 6.")
          @hooks[hook].each{|_,v,_| yield v}
        end

        # Yield every method related to the given hook.
        def hook_methods_for(hook)
          @hooks[hook].each{|_,_,m| yield m}
        end

        Plugins.inherited_instance_variables(self, :@hooks=>:hash_dup)
    
        private
    
        # Add a hook block to the list of hook methods.
        # If a non-nil tag is given and it already is in the list of hooks,
        # replace it with the new block.
        def add_hook(hook, tag, &block)
          unless block
            (raise Error, 'No hook method specified') unless tag
            # Allow calling private hook methods
            block = proc {send(tag)}
          end

          h = @hooks[hook]

          if tag && (old = h.find{|x| x[0] == tag})
            old[1] = block
            Plugins.def_sequel_method(self, old[2], 0, &block)
          else
            meth = Plugins.def_sequel_method(self, "validation_class_methods_#{hook}", 0, &block)
            if hook.to_s =~ /^before/
              h.unshift([tag, block, meth])
            else
              h << [tag, block, meth]
            end
          end
        end
      end

      module InstanceMethods
        # hook methods are private
        [:before_create, :before_update, :before_validation, :before_save, :before_destroy].each{|h| class_eval("def #{h}; model.hook_methods_for(:#{h}){|m| send(m)}; super end", __FILE__, __LINE__)}

        [:after_create, :after_update, :after_validation, :after_save, :after_destroy].each{|h| class_eval("def #{h}; super; model.hook_methods_for(:#{h}){|m| send(m)}; end", __FILE__, __LINE__)}
      end
    end
  end
end
