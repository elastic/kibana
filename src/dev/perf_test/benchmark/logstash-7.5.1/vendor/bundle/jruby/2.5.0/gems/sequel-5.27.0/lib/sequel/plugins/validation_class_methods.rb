# frozen-string-literal: true

module Sequel
  module Plugins
    # Sequel's built-in validation_class_methods plugin adds backwards compatibility
    # for the legacy class-level validation methods (e.g. validates_presence_of :column).
    #
    # It is recommended to use the validation_helpers plugin instead of this one,
    # as it is less complex and more flexible.  However, this plugin provides reflection
    # support, since it is class-level, while the instance-level validation_helpers
    # plugin does not.
    #
    # Usage:
    #
    #   # Add the validation class methods to all model subclasses (called before loading subclasses)
    #   Sequel::Model.plugin :validation_class_methods
    #
    #   # Add the validation class methods to the Album class
    #   Album.plugin :validation_class_methods
    module ValidationClassMethods
      # Setup the validations hash for the given model.
      def self.apply(model)
        model.class_eval do
          @validations = {}
          @validation_reflections = {}
        end
      end

      module ClassMethods
        # A hash of validations for this model class.  Keys are column symbols,
        # values are arrays of validation procs.
        attr_reader :validations

        # A hash of validation reflections for this model class.  Keys are column
        # symbols, values are an array of two element arrays, with the first element
        # being the validation type symbol and the second being a hash of validation
        # options.
        attr_reader :validation_reflections

        # Freeze validation metadata when freezing model class.
        def freeze
          @validations.freeze.each_value(&:freeze)
          @validation_reflections.freeze.each_value do |vs|
            vs.freeze.each do |v|
              v.freeze
              v.last.freeze
            end
          end

          super
        end

        # The Generator class is used to generate validation definitions using 
        # the validates {} idiom.
        class Generator
          # Initializes a new generator.
          def initialize(receiver ,&block)
            @receiver = receiver
            instance_exec(&block)
          end
      
          # Delegates method calls to the receiver by calling receiver.validates_xxx.
          def method_missing(m, *args, &block)
            @receiver.send(:"validates_#{m}", *args, &block)
          end

          # This object responds to all validates_* methods the model responds to.
          def respond_to_missing?(meth, include_private)
            @receiver.respond_to?(:"validates_#{meth}", include_private)
          end
        end
    
        # Returns true if validations are defined.
        def has_validations?
          !validations.empty?
        end

        Plugins.inherited_instance_variables(self, :@validations=>:hash_dup, :@validation_reflections=>:hash_dup)

        # Instructs the model to skip validations defined in superclasses
        def skip_superclass_validations
          superclass.validations.each do |att, procs|
            if @validations[att]
              @validations[att] -= procs
            end
          end
          @skip_superclass_validations = true
        end
        
        # Instructs the model to skip validations defined in superclasses
        def skip_superclass_validations?
          @skip_superclass_validations
        end

        # Defines validations by converting a longhand block into a series of 
        # shorthand definitions. For example:
        #
        #   class MyClass < Sequel::Model
        #     validates do
        #       length_of :name, minimum: 6
        #       length_of :password, minimum: 8
        #     end
        #   end
        #
        # is equivalent to:
        #
        #   class MyClass < Sequel::Model
        #     validates_length_of :name, minimum: 6
        #     validates_length_of :password, minimum: 8
        #   end
        def validates(&block)
          Generator.new(self, &block)
        end
    
        # Validates the given instance.
        def validate(o)
          validations.each do |att, procs|
            v = case att
            when Array
              att.map{|a| o.get_column_value(a)}
            else
              o.get_column_value(att)
            end
            procs.each {|tag, p| p.call(o, att, v)}
          end
        end
        
        # Validates acceptance of an attribute.  Just checks that the value
        # is equal to the :accept option. This method is unique in that
        # :allow_nil is assumed to be true instead of false.
        #
        # Possible Options:
        # :accept :: The value required for the object to be valid (default: '1')
        # :message :: The message to use (default: 'is not accepted')
        def validates_acceptance_of(*atts)
          opts = {
            :message => 'is not accepted',
            :allow_nil => true,
            :accept => '1',
            :tag => :acceptance,
          }.merge!(extract_options!(atts))
          reflect_validation(:acceptance, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            o.errors.add(a, opts[:message]) unless v == opts[:accept]
          end
        end
    
        # Validates confirmation of an attribute. Checks that the object has
        # a _confirmation value matching the current value.  For example:
        #
        #   validates_confirmation_of :blah
        #
        # Just makes sure that object.blah = object.blah_confirmation.  Often used for passwords
        # or email addresses on web forms.
        #
        # Possible Options:
        # :message :: The message to use (default: 'is not confirmed')
        def validates_confirmation_of(*atts)
          opts = {
            :message => 'is not confirmed',
            :tag => :confirmation,
          }.merge!(extract_options!(atts))
          reflect_validation(:confirmation, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            o.errors.add(a, opts[:message]) unless v == o.get_column_value(:"#{a}_confirmation")
          end
        end
    
        # Adds a validation for each of the given attributes using the supplied
        # block. The block must accept three arguments: instance, attribute and 
        # value, e.g.:
        #
        #   validates_each :name, :password do |object, attribute, value|
        #     object.errors.add(attribute, 'is not nice') unless value.nice?
        #   end
        #
        # Possible Options:
        # :allow_blank :: Whether to skip the validation if the value is blank. 
        # :allow_missing :: Whether to skip the validation if the attribute isn't a key in the
        #                   values hash.  This is different from allow_nil, because Sequel only sends the attributes
        #                   in the values when doing an insert or update.  If the attribute is not present, Sequel
        #                   doesn't specify it, so the database will use the table's default value.  This is different
        #                   from having an attribute in values with a value of nil, which Sequel will send as NULL.
        #                   If your database table has a non NULL default, this may be a good option to use.  You
        #                   don't want to use allow_nil, because if the attribute is in values but has a value nil,
        #                   Sequel will attempt to insert a NULL value into the database, instead of using the
        #                   database's default.
        # :allow_nil :: Whether to skip the validation if the value is nil.
        # :if :: A symbol (indicating an instance_method) or proc (which is used to define an instance method)
        #        skipping this validation if it returns nil or false.
        # :tag :: The tag to use for this validation.
        def validates_each(*atts, &block)
          opts = extract_options!(atts)
          blank_meth = db.method(:blank_object?).to_proc
          blk = if (i = opts[:if]) || (am = opts[:allow_missing]) || (an = opts[:allow_nil]) || (ab = opts[:allow_blank])
            if i.is_a?(Proc)
              i = Plugins.def_sequel_method(self, "validation_class_methods_if", 0, &i)
            end

            proc do |o,a,v|
              next if i && !validation_if_proc(o, i)
              next if an && Array(v).all?(&:nil?)
              next if ab && Array(v).all?(&blank_meth)
              next if am && Array(a).all?{|x| !o.values.has_key?(x)}
              block.call(o,a,v)
            end
          else
            block
          end
          tag = opts[:tag]
          atts.each do |a| 
            a_vals = Sequel.synchronize{validations[a] ||= []}
            if tag && (old = a_vals.find{|x| x[0] == tag})
              old[1] = blk
            else
              a_vals << [tag, blk]
            end
          end
        end
    
        # Validates the format of an attribute, checking the string representation of the
        # value against the regular expression provided by the :with option.
        #
        # Possible Options:
        # :message :: The message to use (default: 'is invalid')
        # :with :: The regular expression to validate the value with (required).
        def validates_format_of(*atts)
          opts = {
            :message => 'is invalid',
            :tag => :format,
          }.merge!(extract_options!(atts))
          
          unless opts[:with].is_a?(Regexp)
            raise ArgumentError, "A regular expression must be supplied as the :with option of the options hash"
          end
          
          reflect_validation(:format, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            o.errors.add(a, opts[:message]) unless v.to_s =~ opts[:with]
          end
        end
    
        # Validates the length of an attribute.
        #
        # Possible Options:
        # :is :: The exact size required for the value to be valid (no default)
        # :maximum :: The maximum size allowed for the value (no default)
        # :message :: The message to use (no default, overrides :nil_message, :too_long, :too_short, and :wrong_length
        #             options if present)
        # :minimum :: The minimum size allowed for the value (no default)
        # :nil_message :: The message to use use if :maximum option is used and the value is nil (default: 'is not present')
        # :too_long :: The message to use use if it the value is too long (default: 'is too long')
        # :too_short :: The message to use use if it the value is too short (default: 'is too short')
        # :within :: The array/range that must include the size of the value for it to be valid (no default)
        # :wrong_length :: The message to use use if it the value is not valid (default: 'is the wrong length')
        def validates_length_of(*atts)
          opts = {
            :nil_message  => 'is not present',
            :too_long     => 'is too long',
            :too_short    => 'is too short',
            :wrong_length => 'is the wrong length'
          }.merge!(extract_options!(atts))
          
          opts[:tag] ||= ([:length] + [:maximum, :minimum, :is, :within].reject{|x| !opts.include?(x)}).join('-').to_sym
          reflect_validation(:length, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            if m = opts[:maximum]
              o.errors.add(a, opts[:message] || (v ? opts[:too_long] : opts[:nil_message])) unless v && v.size <= m
            end
            if m = opts[:minimum]
              o.errors.add(a, opts[:message] || opts[:too_short]) unless v && v.size >= m
            end
            if i = opts[:is]
              o.errors.add(a, opts[:message] || opts[:wrong_length]) unless v && v.size == i
            end
            if w = opts[:within]
              o.errors.add(a, opts[:message] || opts[:wrong_length]) unless v && w.public_send(w.respond_to?(:cover?) ? :cover? : :include?, v.size)
            end
          end
        end
    
        # Validates whether an attribute is a number.
        #
        # Possible Options:
        # :message :: The message to use (default: 'is not a number')
        # :only_integer :: Whether only integers are valid values (default: false)
        def validates_numericality_of(*atts)
          opts = {
            :message => 'is not a number',
            :tag => :numericality,
          }.merge!(extract_options!(atts))
          reflect_validation(:numericality, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            begin
              if opts[:only_integer]
                Kernel.Integer(v.to_s)
              else
                Kernel.Float(v.to_s)
              end
            rescue
              o.errors.add(a, opts[:message])
            end
          end
        end
    
        # Validates the presence of an attribute.  Requires the value not be blank,
        # with false considered present instead of absent.
        #
        # Possible Options:
        # :message :: The message to use (default: 'is not present')
        def validates_presence_of(*atts)
          opts = {
            :message => 'is not present',
            :tag => :presence,
          }.merge!(extract_options!(atts))
          reflect_validation(:presence, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            o.errors.add(a, opts[:message]) if db.send(:blank_object?, v) && v != false
          end
        end
        
        # Validates that an attribute is within a specified range or set of values.
        #
        # Possible Options:
        # :in :: An array or range of values to check for validity (required)
        # :message :: The message to use (default: 'is not in range or set: <specified range>')
        def validates_inclusion_of(*atts)
          opts = extract_options!(atts)
          n = opts[:in]
          unless n && (n.respond_to?(:cover?) || n.respond_to?(:include?))
            raise ArgumentError, "The :in parameter is required, and must respond to cover? or include?"
          end
          opts[:message] ||= "is not in range or set: #{n.inspect}"
          reflect_validation(:inclusion, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            o.errors.add(a, opts[:message]) unless n.public_send(n.respond_to?(:cover?) ? :cover? : :include?, v)
          end
        end
    
        # Validates whether an attribute has the correct ruby type for the associated
        # database type.  This is generally useful in conjunction with
        # raise_on_typecast_failure = false, to handle typecasting errors at validation
        # time instead of at setter time. 
        #
        # Possible Options:
        # :message :: The message to use (default: 'is not a valid (integer|datetime|etc.)')
        def validates_schema_type(*atts)
          opts = {
            :tag => :schema_type,
          }.merge!(extract_options!(atts))
          reflect_validation(:schema_type, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            next if v.nil? || (klass = o.send(:schema_type_class, a)).nil?
            if klass.is_a?(Array) ? !klass.any?{|kls| v.is_a?(kls)} : !v.is_a?(klass)
              message = opts[:message] || "is not a valid #{Array(klass).join(" or ").downcase}"
              o.errors.add(a, message)
            end
          end
        end
    
        # Validates only if the fields in the model (specified by atts) are
        # unique in the database.  Pass an array of fields instead of multiple
        # fields to specify that the combination of fields must be unique,
        # instead of that each field should have a unique value.
        #
        # This means that the code:
        #   validates_uniqueness_of([:column1, :column2])
        # validates the grouping of column1 and column2 while
        #   validates_uniqueness_of(:column1, :column2)
        # validates them separately.
        #
        # You should also add a unique index in the
        # database, as this suffers from a fairly obvious race condition.
        #
        # Possible Options:
        # :message :: The message to use (default: 'is already taken')
        def validates_uniqueness_of(*atts)
          opts = {
            :message => 'is already taken',
            :tag => :uniqueness,
          }.merge!(extract_options!(atts))
    
          reflect_validation(:uniqueness, opts, atts)
          atts << opts
          validates_each(*atts) do |o, a, v|
            error_field = a
            a = Array(a)
            v = Array(v)
            next if v.empty? || !v.all?
            ds = o.class.where(a.zip(v))
            num_dups = ds.count
            allow = if num_dups == 0
              # No unique value in the database
              true
            elsif num_dups > 1
              # Multiple "unique" values in the database!!
              # Someone didn't add a unique index
              false
            elsif o.new?
              # New record, but unique value already exists in the database
              false
            elsif ds.first === o
              # Unique value exists in database, but for the same record, so the update won't cause a duplicate record
              true
            else
              false
            end
            o.errors.add(error_field, opts[:message]) unless allow
          end
        end
    
        private
    
        # Removes and returns the last member of the array if it is a hash. Otherwise,
        # an empty hash is returned This method is useful when writing methods that
        # take an options hash as the last parameter.
        def extract_options!(array)
          array.last.is_a?(Hash) ? array.pop : OPTS
        end

        # Add the validation reflection to the class's validations.
        def reflect_validation(type, opts, atts)
          atts.each do |att|
            (validation_reflections[att] ||= []) << [type, opts]
          end
        end

        # Handle the :if option for validations
        def validation_if_proc(o, i)
          case i
          when Symbol
            o.get_column_value(i)
          else
            raise(::Sequel::Error, "invalid value for :if validation option")
          end
        end
      end
    
      module InstanceMethods
        # Validates the object.
        def validate
          model.validate(self)
          super
        end
      end
    end
  end
end
