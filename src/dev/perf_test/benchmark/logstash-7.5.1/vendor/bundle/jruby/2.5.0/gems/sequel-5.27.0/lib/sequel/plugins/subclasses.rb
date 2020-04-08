# frozen-string-literal: true

module Sequel
  module Plugins
    # The subclasses plugin keeps track of all subclasses of the
    # current model class.  Direct subclasses are available via the
    # subclasses method, and all descendent classes are available via the
    # descendents method:
    #
    #   c = Class.new(Sequel::Model)
    #   c.plugin :subclasses
    #   sc1 = Class.new(c)
    #   sc2 = Class.new(c)
    #   ssc1 = Class.new(sc1)
    #   c.subclasses    # [sc1, sc2]
    #   sc1.subclasses  # [ssc1]
    #   sc2.subclasses  # []
    #   ssc1.subclasses # []
    #   c.descendents   # [sc1, ssc1, sc2]
    #
    # You can also finalize the associations and then freeze the classes
    # in all descendent classes.  Doing so is a recommended practice after
    # all models have been defined in production and testing, and this makes
    # it easier than keeping track of the classes to finalize and freeze
    # manually:
    #
    #   c.freeze_descendants
    #
    # You can provide a block when loading the plugin, and it will be called
    # with each subclass created:
    #
    #   a = []
    #   Sequel::Model.plugin(:subclasses){|sc| a << sc}
    #   class A < Sequel::Model; end
    #   class B < Sequel::Model; end
    #   a # => [A, B]
    module Subclasses
      # Initialize the subclasses instance variable for the model.
      def self.apply(model, &block)
        model.instance_variable_set(:@subclasses, [])
        model.instance_variable_set(:@on_subclass, block)
      end

      module ClassMethods
        # Callable object that should be called with every descendent
        # class created.
        attr_reader :on_subclass

        # All subclasses for the current model.  Does not
        # include the model itself.
        attr_reader :subclasses

        # All descendent classes of this model.
        def descendents
          Sequel.synchronize{subclasses.dup}.map{|x| [x] + x.send(:descendents)}.flatten
        end

        # Freeze all descendent classes.  This also finalizes the associations for those
        # classes before freezing.
        def freeze_descendents
          descendents.each(&:finalize_associations).each(&:freeze)
        end

        Plugins.inherited_instance_variables(self, :@subclasses=>lambda{|v| []}, :@on_subclass=>nil)

        # Add the subclass to this model's current subclasses,
        # and initialize a new subclasses instance variable
        # in the subclass.
        def inherited(subclass)
          super
          Sequel.synchronize{subclasses << subclass}
          on_subclass.call(subclass) if on_subclass
        end
      end
    end
  end
end
