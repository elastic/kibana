# frozen-string-literal: true

module Sequel
  module Plugins
    # The single_table_inheritance plugin allows storing all objects
    # in the same class hierarchy in the same table.  It makes it so
    # subclasses of this model only load rows related to the subclass,
    # and when you retrieve rows from the main class, you get instances
    # of the subclasses (if the rows should use the subclasses's class).
    #
    # By default, the plugin assumes that the +sti_key+ column (the first
    # argument to the plugin) holds the class name as a string.  However,
    # you can override this by using the <tt>:model_map</tt> option and/or
    # the <tt>:key_map</tt> option.
    #   
    # You should only load this plugin in the parent class, not in the subclasses.
    #   
    # You shouldn't call set_dataset in the model after applying this
    # plugin, otherwise subclasses might use the wrong dataset. You should
    # make sure this plugin is loaded before the subclasses. Note that since you
    # need to load the plugin before the subclasses are created, you can't use
    # direct class references in the plugin class.  You should specify subclasses
    # in the plugin call using class name strings or symbols, see usage below.
    #   
    # Usage:
    #
    #   # Use the default of storing the class name in the sti_key
    #   # column (:kind in this case)
    #   class Employee < Sequel::Model
    #     plugin :single_table_inheritance, :kind
    #   end
    #
    #   # Have subclasses inherit from the appropriate class
    #   class Staff < Employee; end
    #   class Manager < Employee; end
    #
    #   # You can also use many different options to configure the plugin:
    #
    #   # Using integers to store the class type, with a :model_map hash
    #   # and an sti_key of :type
    #   Employee.plugin :single_table_inheritance, :type,
    #     model_map: {1=>:Staff, 2=>:Manager}
    #
    #   # Using non-class name strings
    #   Employee.plugin :single_table_inheritance, :type,
    #     model_map: {'line staff'=>:Staff, 'supervisor'=>:Manager}
    #
    #   # By default the plugin sets the respective column value
    #   # when a new instance is created.
    #   Staff.create.type == 'line staff'
    #   Manager.create.type == 'supervisor'
    #
    #   # You can customize this behavior with the :key_chooser option.
    #   # This is most useful when using a non-bijective mapping.
    #   Employee.plugin :single_table_inheritance, :type,
    #     model_map: {'line staff'=>:Staff, 'supervisor'=>:Manager},
    #     key_chooser: lambda{|instance| instance.model.sti_key_map[instance.model.to_s].first || 'stranger'}
    #
    #   # Using custom procs, with :model_map taking column values
    #   # and yielding either a class, string, symbol, or nil, 
    #   # and :key_map taking a class object and returning the column
    #   # value to use
    #   Employee.plugin :single_table_inheritance, :type,
    #     model_map: :reverse.to_proc,
    #     key_map: lambda{|klass| klass.name.reverse}
    #
    #   # You can use the same class for multiple values.
    #   # This is mainly useful when the sti_key column contains multiple values
    #   # which are different but do not require different code.
    #   Employee.plugin :single_table_inheritance, :type,
    #     model_map: {'staff' => "Staff",
    #                  'manager' => "Manager",
    #                  'overpayed staff' => "Staff",
    #                  'underpayed staff' => "Staff"}
    #
    # One minor issue to note is that if you specify the <tt>:key_map</tt>
    # option as a hash, instead of having it inferred from the <tt>:model_map</tt>,
    # you should only use class name strings as keys, you should not use symbols
    # as keys.
    module SingleTableInheritance
      # Setup the necessary STI variables, see the module RDoc for SingleTableInheritance
      def self.configure(model, key, opts=OPTS)
        model.instance_exec do
          @sti_key_array = nil
          @sti_key = key 
          @sti_dataset = dataset
          @sti_model_map = opts[:model_map] || lambda{|v| v if v && v != ''}
          @sti_key_map = if km = opts[:key_map]
            if km.is_a?(Hash)
              h = Hash.new do |h1,k| 
                unless k.is_a?(String)
                  h1[k.to_s]
                else
                  []
                end
              end
              km.each do |k,v|
                h[k.to_s] = [] unless h.key?(k.to_s)
                h[k.to_s].push( *Array(v) )
              end
              h
            else
              km
            end
          elsif sti_model_map.is_a?(Hash)
            h = Hash.new do |h1,k| 
              unless k.is_a?(String)
                h1[k.to_s]
              else
                []
              end
            end
            sti_model_map.each do |k,v|
              h[v.to_s] = [] unless h.key?(v.to_s)
              h[v.to_s] << k
            end
            h
          else
            lambda{|klass| klass.name.to_s}
          end
          @sti_key_chooser = opts[:key_chooser] || lambda{|inst| Array(inst.model.sti_key_map[inst.model]).last }

          @dataset = @dataset.with_row_proc(model.method(:sti_load))
        end
      end

      module ClassMethods
        # The base dataset for STI, to which filters are added to get
        # only the models for the specific STI subclass.
        attr_reader :sti_dataset

        # The column name holding the STI key for this model
        attr_reader :sti_key

        # Array holding keys for all subclasses of this class, used for the
        # dataset filter in subclasses. Nil in the main class.
        attr_reader :sti_key_array

        # A hash/proc with class keys and column value values, mapping
        # the class to a particular value given to the sti_key column.
        # Used to set the column value when creating objects, and for the
        # filter when retrieving objects in subclasses.
        attr_reader :sti_key_map

        # A hash/proc with column value keys and class values, mapping
        # the value of the sti_key column to the appropriate class to use.
        attr_reader :sti_model_map

        # A proc which returns the value to use for new instances.
        # This defaults to a lookup in the key map.
        attr_reader :sti_key_chooser

        Plugins.inherited_instance_variables(self, :@sti_dataset=>nil, :@sti_key=>nil, :@sti_key_map=>nil, :@sti_model_map=>nil, :@sti_key_chooser=>nil)

        # Freeze STI information when freezing model class.  Note that
        # because of how STI works, you should not freeze an STI subclass
        # until after all subclasses of it have been created.
        def freeze
          @sti_key_array.freeze if @sti_key_array
          @sti_key_map.freeze if @sti_key_map.is_a?(Hash)
          @sti_model_map.freeze if @sti_model_map.is_a?(Hash)

          super
        end

        # Copy the necessary attributes to the subclasses, and filter the
        # subclass's dataset based on the sti_kep_map entry for the class.
        def inherited(subclass)
          super
          key = Array(sti_key_map[subclass]).dup
          sti_subclass_added(key)
          rp = dataset.row_proc
          subclass.set_dataset(sti_subclass_dataset(key), :inherited=>true)
          subclass.instance_exec do
            @dataset = @dataset.with_row_proc(rp)
            @sti_key_array = key
            self.simple_table = nil
          end
        end

        # Return an instance of the class specified by sti_key,
        # used by the row_proc.
        def sti_load(r)
          sti_class_from_sti_key(r[sti_key]).call(r)
        end

        # Return the sti class based on one of the keys from sti_model_map.
        def sti_class_from_sti_key(key)
          sti_class(sti_model_map[key])
        end

        # Make sure that all subclasses of the parent class correctly include 
        # keys for all of their descendant classes.
        def sti_subclass_added(key)
          if sti_key_array
            key_array = Array(key)
            Sequel.synchronize{sti_key_array.push(*key_array)}
            superclass.sti_subclass_added(key)
          end
        end

        private

        # Extend the sti dataset with the module when extending the main
        # dataset.
        def dataset_extend(mod, opts=OPTS)
          @sti_dataset = @sti_dataset.with_extend(mod)
          super
        end

        # If calling set_dataset manually, make sure to set the dataset
        # row proc to one that handles inheritance correctly.
        def set_dataset_row_proc(ds)
          if @dataset
            ds.with_row_proc(@dataset.row_proc)
          else
            super
          end
        end

        # Return a class object.  If a class is given, return it directly.
        # Treat strings and symbols as class names.  If nil is given or
        # an invalid class name string or symbol is used, return self.
        # Raise an error for other types.
        def sti_class(v)
          case v
          when String, Symbol
            constantize(v) rescue self
          when nil
            self
          when Class
            v
          else
            raise(Error, "Invalid class type used: #{v.inspect}")
          end
        end

        # Use the given dataset for the subclass, with key being the allowed
        # values for the sti_kind field.
        def sti_subclass_dataset(key)
          sti_dataset.where(SQL::QualifiedIdentifier.new(sti_dataset.first_source_alias, sti_key)=>Sequel.delay{Sequel.synchronize{key}})
        end
      end

      module InstanceMethods
        # Set the sti_key column based on the sti_key_map.
        def before_validation
          if new? && model.sti_key && !self[model.sti_key]
            set_column_value("#{model.sti_key}=", model.sti_key_chooser.call(self))
          end
          super
        end
      end
    end
  end
end
