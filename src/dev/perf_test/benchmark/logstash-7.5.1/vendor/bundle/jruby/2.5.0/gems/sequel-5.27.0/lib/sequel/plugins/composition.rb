# frozen-string-literal: true

module Sequel
  module Plugins
    # The composition plugin allows you to easily define a virtual
    # attribute where the backing data is composed of other columns.
    #
    # There are two ways to use the plugin.  One way is with the
    # :mapping option.  A simple example of this is when you have a
    # database table with separate columns for year, month, and day,
    # but where you want to deal with Date objects in your ruby code.
    # This can be handled with:
    #
    #   Album.plugin :composition
    #   Album.composition :date, mapping: [:year, :month, :day]
    #
    # With the :mapping option, you can provide a :class option
    # that gives the class to use, but if that is not provided, it
    # is inferred from the name of the composition (e.g. :date -> Date).
    # When the <tt>date</tt> method is called, it will return a
    # Date object by calling:
    #
    #   Date.new(year, month, day)
    #
    # When saving the object, if the date composition has been used
    # (by calling either the getter or setter method), it will
    # populate the related columns of the object before saving:
    #
    #   self.year = date.year
    #   self.month = date.month
    #   self.day = date.day
    #
    # The :mapping option is just a shortcut that works in particular
    # cases.  To handle any case, you can define a custom :composer
    # and :decomposer procs.  The :composer and :decomposer procs will
    # be used to define instance methods.  The :composer will be called
    # the first time the getter is called, and the :decomposer 
    # will be called before saving.  The above example could
    # also be implemented as:
    #
    #   Album.composition :date,
    #     :composer=>proc{Date.new(year, month, day) if year || month || day},
    #     :decomposer=>(proc do
    #       if d = compositions[:date]
    #         self.year = d.year
    #         self.month = d.month
    #         self.day = d.day
    #       else
    #         self.year = nil
    #         self.month = nil
    #         self.day = nil
    #       end
    #     end)
    #
    # Note that when using the composition object, you should not
    # modify the underlying columns if you are also instantiating
    # the composition, as otherwise the composition object values
    # will override any underlying columns when the object is saved.
    module Composition
      # Define the necessary class instance variables.
      def self.apply(model)
        model.instance_exec do
          @compositions = {}
          include(@composition_module ||= Module.new)
        end
      end

      module ClassMethods
        # A hash with composition name keys and composition reflection
        # hash values.
        attr_reader :compositions
        
        # Define a composition for this model, with name being the name of the composition.
        # You must provide either a :mapping option or both the :composer and :decomposer options. 
        #
        # Options:
        # :class :: if using the :mapping option, the class to use, as a Class, String or Symbol.
        # :composer :: A proc used to define the method that the composition getter method will call 
        #              to create the composition.
        # :decomposer :: A proc used to define the method called before saving the model object,
        #                if the composition object exists, which sets the columns in the model object
        #                based on the value of the composition object.
        # :mapping :: An array where each element is either a symbol or an array of two symbols.
        #             A symbol is treated like an array of two symbols where both symbols are the same.
        #             The first symbol represents the getter method in the model, and the second symbol
        #             represents the getter method in the composition object. Example:
        #                 # Uses columns year, month, and day in the current model
        #                 # Uses year, month, and day methods in the composition object
        #                 {mapping: [:year, :month, :day]}
        #                 # Uses columns year, month, and day in the current model
        #                 # Uses y, m, and d methods in the composition object where
        #                 # for example y in the composition object represents year
        #                 # in the model object.
        #                 {mapping: [[:year, :y], [:month, :m], [:day, :d]]}
        def composition(name, opts=OPTS)
          opts = opts.dup
          compositions[name] = opts
          if mapping = opts[:mapping]
            keys = mapping.map{|k| k.is_a?(Array) ? k.first : k}
            if !opts[:composer]              
              late_binding_class_option(opts, name)
              klass = opts[:class]
              class_proc = proc{klass || constantize(opts[:class_name])}
              opts[:composer] = proc do
                if values = keys.map{|k| get_column_value(k)} and values.any?{|v| !v.nil?}
                  class_proc.call.new(*values)
                else
                  nil
                end
              end
            end
            if !opts[:decomposer]
              setter_meths = keys.map{|k| :"#{k}="}
              cov_methods = mapping.map{|k| k.is_a?(Array) ? k.last : k}
              setters = setter_meths.zip(cov_methods)
              opts[:decomposer] = proc do
                if (o = compositions[name]).nil?
                  setter_meths.each{|sm| set_column_value(sm, nil)}
                else
                  setters.each{|sm, cm| set_column_value(sm, o.public_send(cm))}
                end
              end
            end
          end
          raise(Error, "Must provide :composer and :decomposer options, or :mapping option") unless opts[:composer] && opts[:decomposer]
          define_composition_accessor(name, opts)
        end
        
        Plugins.inherited_instance_variables(self, :@compositions=>:dup)
        
        # Define getter and setter methods for the composition object.
        def define_composition_accessor(name, opts=OPTS)
          composer_meth = opts[:composer_method] = Plugins.def_sequel_method(@composition_module, "#{name}_composer", 0, &opts[:composer])
          opts[:decomposer_method] = Plugins.def_sequel_method(@composition_module, "#{name}_decomposer", 0, &opts[:decomposer])
          @composition_module.class_eval do
            define_method(name) do 
              if compositions.has_key?(name)
                compositions[name]
              elsif frozen?
                # composer_meth is private
                send(composer_meth)
              else
                compositions[name] = send(composer_meth)
              end
            end
            define_method("#{name}=") do |v|
              modified!
              compositions[name] = v
            end
          end
        end

        # Freeze composition information when freezing model class.
        def freeze
          compositions.freeze.each_value(&:freeze)
          @composition_module.freeze

          super
        end
      end

      module InstanceMethods
        # Cache of composition objects for this class.
        def compositions
          @compositions ||= {}
        end

        # Freeze compositions hash when freezing model instance.
        def freeze
          compositions.freeze
          super
        end

        # For each composition, set the columns in the model class based
        # on the composition object.
        def before_validation
          # decomposer_method is private
          @compositions.keys.each{|n| send(model.compositions[n][:decomposer_method])} if @compositions
          super
        end
        
        private

        # Clear the cached compositions when manually refreshing.
        def _refresh_set_values(hash)
          @compositions.clear if @compositions
          super
        end

        # Duplicate compositions hash when duplicating model instance.
        def initialize_copy(other)
          super
          @compositions = Hash[other.compositions]
          self
        end
      end
    end
  end
end
