# frozen-string-literal: true

module Sequel
  module Plugins
    # The instance_hooks plugin allows you to add hooks to specific instances,
    # by passing a block to a _hook method (e.g. before_save_hook{do_something}).
    # The block is executed when the hook is called (e.g. before_save).
    #
    # All of the standard hooks are supported.
    # Instance level before hooks are executed in reverse order of addition before
    # calling super.  Instance level after hooks are executed in order of addition
    # after calling super.
    #
    # Instance level hooks for before and after are cleared after all related
    # after level instance hooks have run.  This means that if you add a before_create
    # and before_update instance hooks to a new object, the before_create hook will
    # be run the first time you save the object (creating it), and the before_update
    # hook will be run the second time you save the object (updating it), and no
    # hooks will be run the third time you save the object.
    #
    # Validation hooks are not cleared until after a successful save.
    # 
    # Usage:
    #
    #   # Add the instance hook methods to all model subclass instances (called before loading subclasses)
    #   Sequel::Model.plugin :instance_hooks
    #
    #   # Add the instance hook methods just to Album instances
    #   Album.plugin :instance_hooks
    module InstanceHooks
      module InstanceMethods 
        Sequel::Model::HOOKS.each{|h| class_eval(<<-END , __FILE__, __LINE__+1)}
          def #{h}_hook(&block)
            raise Sequel::Error, "can't add hooks to frozen object" if frozen?
            add_instance_hook(:#{h}, &block)
            self
          end
        END
        
        [:before_create, :before_update, :before_validation].each{|h| class_eval("def #{h}; run_before_instance_hooks(:#{h}) if @instance_hooks; super end", __FILE__, __LINE__)}
        [:after_create, :after_update].each{|h| class_eval(<<-END, __FILE__, __LINE__ + 1)}
          def #{h}
            super
            return unless @instance_hooks
            run_after_instance_hooks(:#{h})
            @instance_hooks.delete(:#{h})
            @instance_hooks.delete(:#{h.to_s.sub('after', 'before')})
          end
        END

        # Run after destroy instance hooks.
        def after_destroy
          super
          return unless @instance_hooks
          run_after_instance_hooks(:after_destroy)
          @instance_hooks.delete(:after_destroy)
          @instance_hooks.delete(:before_destroy)
        end

        # Run after validation instance hooks.
        def after_validation
          super
          return unless @instance_hooks
          run_after_instance_hooks(:after_validation)
        end
        
        # Run after save instance hooks.
        def after_save
          super
          return unless @instance_hooks
          run_after_instance_hooks(:after_save)
          @instance_hooks.delete(:after_save)
          @instance_hooks.delete(:before_save)
          @instance_hooks.delete(:after_validation)
          @instance_hooks.delete(:before_validation)
        end

        # Run before_destroy instance hooks.
        def before_destroy
          return super unless @instance_hooks
          run_before_instance_hooks(:before_destroy)
          super
        end

        # Run before_save instance hooks.
        def before_save
          return super unless @instance_hooks
          run_before_instance_hooks(:before_save)
          super
        end
        
        private
        
        # Add the block as an instance level hook.  For before hooks, add it to
        # the beginning of the instance hook's array.  For after hooks, add it
        # to the end.
        def add_instance_hook(hook, &block)
          instance_hooks(hook).public_send(hook.to_s.start_with?('before') ? :unshift : :push, block)
        end
        
        # An array of instance level hook blocks for the given hook type.
        def instance_hooks(hook)
          @instance_hooks ||= {}
          @instance_hooks[hook] ||= []
        end
        
        # Run all hook blocks of the given hook type.
        def run_after_instance_hooks(hook)
          instance_hooks(hook).each(&:call)
        end
        alias run_before_instance_hooks run_after_instance_hooks
      end
    end
  end
end
