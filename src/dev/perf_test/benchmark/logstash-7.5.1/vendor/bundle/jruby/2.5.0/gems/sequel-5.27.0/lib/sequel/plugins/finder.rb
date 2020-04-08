# frozen-string-literal: true

module Sequel
  module Plugins
    # The finder plugin adds Model.finder for defining optimized finder methods.
    # There are two ways to use this.  The recommended way is to pass a symbol
    # that represents a model class method that returns a dataset:
    #
    #   def Artist.by_name(name)
    #     where(name: name)
    #   end
    #
    #   Artist.finder :by_name
    #
    # This creates an optimized first_by_name method, which you can call normally:
    #
    #   Artist.first_by_name("Joe")
    #
    # The alternative way to use this to pass your own block:
    #
    #   Artist.finder(name: :first_by_name){|pl, ds| ds.where(name: pl.arg).limit(1)}
    #
    # Additionally, there is a Model.prepared_finder method.  This works similarly
    # to Model.finder, but uses a prepared statement.  This limits the types of
    # arguments that will be accepted, but can perform better in the database.
    # 
    # Usage:
    #
    #   # Make all model subclasses support Model.finder
    #   # (called before loading subclasses)
    #   Sequel::Model.plugin :finder
    #
    #   # Make the Album class support Model.finder
    #   Album.plugin :finder
    module Finder
      FINDER_TYPES = [:first, :all, :each, :get].freeze

      def self.apply(model)
        model.instance_exec do
          @finders ||= {}
          @finder_loaders ||= {}
        end
      end

      module ClassMethods
        # Create an optimized finder method using a dataset placeholder literalizer.
        # This pre-computes the SQL to use for the query, except for given arguments.
        #
        # There are two ways to use this.  The recommended way is to pass a symbol
        # that represents a model class method that returns a dataset:
        #
        #   def Artist.by_name(name)
        #     where(name: name)
        #   end
        #
        #   Artist.finder :by_name
        #
        # This creates an optimized first_by_name method, which you can call normally:
        #
        #   Artist.first_by_name("Joe")
        #
        # The alternative way to use this to pass your own block:
        #
        #   Artist.finder(name: :first_by_name){|pl, ds| ds.where(name: pl.arg).limit(1)}
        #
        # Note that if you pass your own block, you are responsible for manually setting
        # limits if necessary (as shown above).
        #
        # Options:
        # :arity :: When using a symbol method name, this specifies the arity of the method.
        #           This should be used if if the method accepts an arbitrary number of arguments,
        #           or the method has default argument values.  Note that if the method is defined
        #           as a dataset method, the class method Sequel creates accepts an arbitrary number
        #           of arguments, so you should use this option in that case.  If you want to handle
        #           multiple possible arities, you need to call the finder method multiple times with
        #           unique :arity and :name methods each time.
        # :name :: The name of the method to create.  This must be given if you pass a block.
        #          If you use a symbol, this defaults to the symbol prefixed by the type.
        # :mod :: The module in which to create the finder method.  Defaults to the singleton
        #         class of the model.
        # :type :: The type of query to run.  Can be :first, :each, :all, or :get, defaults to
        #          :first.
        #
        # Caveats:
        #
        # This doesn't handle all possible cases.  For example, if you have a method such as:
        #
        #   def Artist.by_name(name)
        #     name ? where(name: name) : exclude(name: nil)
        #   end
        #
        # Then calling a finder without an argument will not work as you expect.
        #
        #   Artist.finder :by_name
        #   Artist.by_name(nil).first
        #   # WHERE (name IS NOT NULL)
        #   Artist.first_by_name(nil)
        #   # WHERE (name IS NULL)
        #
        # See Dataset::PlaceholderLiteralizer for additional caveats.
        def finder(meth=OPTS, opts=OPTS, &block)
          if block
            raise Error, "cannot pass both a method name argument and a block of Model.finder" unless meth.is_a?(Hash)
            raise Error, "cannot pass two option hashes to Model.finder" unless opts.equal?(OPTS)
            opts = meth
            raise Error, "must provide method name via :name option when passing block to Model.finder" unless meth_name = opts[:name]
          end

          type = opts.fetch(:type, :first)
          unless prepare = opts[:prepare]
            raise Error, ":type option to Model.finder must be :first, :all, :each, or :get" unless FINDER_TYPES.include?(type)
          end
          limit1 = type == :first || type == :get
          meth_name ||= opts[:name] || :"#{type}_#{meth}"

          argn = lambda do |model|
            if arity = opts[:arity]
              arity
            else
              method = block || model.method(meth)
              (method.arity < 0 ? method.arity.abs - 1 : method.arity)
            end
          end

          loader_proc = if prepare
            proc do |model|
              args = prepare_method_args('$a', argn.call(model))
              ds = if block
                model.instance_exec(*args, &block)
              else
                model.public_send(meth, *args)
              end
              ds = ds.limit(1) if limit1
              model_name = model.name
              if model_name.to_s.empty?
                model_name = model.object_id
              else
                model_name = model_name.gsub(/\W/, '_')
              end
              ds.prepare(type, :"#{model_name}_#{meth_name}")
            end
          else
            proc do |model|
              n = argn.call(model)
              block ||= lambda do |pl, model2|
                args = (0...n).map{pl.arg}
                ds = model2.public_send(meth, *args)
                ds = ds.limit(1) if limit1
                ds
              end

              Sequel::Dataset::PlaceholderLiteralizer.loader(model, &block) 
            end
          end

          @finder_loaders[meth_name] = loader_proc
          mod = opts[:mod] || singleton_class
          if prepare
            def_prepare_method(mod, meth_name)
          else
            def_finder_method(mod, meth_name, type)
          end
        end

        def freeze
          @finder_loaders.freeze
          @finder_loaders.each_key{|k| finder_for(k)} if @dataset
          @finders.freeze
          super
        end

        # Similar to finder, but uses a prepared statement instead of a placeholder
        # literalizer. This makes the SQL used static (cannot vary per call), but
        # allows binding argument values instead of literalizing them into the SQL
        # query string.
        #
        # If a block is used with this method, it is instance_execed by the model,
        # and should accept the desired number of placeholder arguments.
        #
        # The options are the same as the options for finder, with the following
        # exception:
        # :type :: Specifies the type of prepared statement to create
        def prepared_finder(meth=OPTS, opts=OPTS, &block)
          if block
            raise Error, "cannot pass both a method name argument and a block of Model.finder" unless meth.is_a?(Hash)
            meth = meth.merge(:prepare=>true)
          else
            opts = opts.merge(:prepare=>true)
          end
          finder(meth, opts, &block)
        end

        Plugins.inherited_instance_variables(self, :@finders=>:dup, :@finder_loaders=>:dup)

        private

        # Define a finder method in the given module with the given method name that
        # load rows using the finder with the given name.
        def def_finder_method(mod, meth, type)
          mod.send(:define_method, meth){|*args, &block| finder_for(meth).public_send(type, *args, &block)}
        end

        # Define a prepared_finder method in the given module that will call the associated prepared
        # statement.
        def def_prepare_method(mod, meth)
          mod.send(:define_method, meth){|*args, &block| finder_for(meth).call(prepare_method_arg_hash(args), &block)}
        end

        # Find the finder to use for the give method.  If a finder has not been loaded
        # for the method, load the finder and set correctly in the finders hash, then
        # return the finder.
        def finder_for(meth)
          unless finder = (frozen? ? @finders[meth] : Sequel.synchronize{@finders[meth]})
            finder_loader = @finder_loaders.fetch(meth)
            finder = finder_loader.call(self)
            Sequel.synchronize{@finders[meth] = finder}
          end
          finder
        end

        # An hash of prepared argument values for the given arguments, with keys
        # starting at a.  Used by the methods created by prepared_finder.
        def prepare_method_arg_hash(args)
          h = {}
          prepare_method_args('a', args.length).zip(args).each{|k, v| h[k] = v}
          h
        end

        # An array of prepared statement argument names, of length n and starting with base.
        def prepare_method_args(base, n)
          (0...n).map do
            s = base.to_sym
            base = base.next
            s
          end
        end

        # Clear any finders when reseting the instance dataset
        def reset_instance_dataset
          Sequel.synchronize{@finders.clear} if @finders && !@finders.frozen?
          super
        end
      end
    end
  end
end
