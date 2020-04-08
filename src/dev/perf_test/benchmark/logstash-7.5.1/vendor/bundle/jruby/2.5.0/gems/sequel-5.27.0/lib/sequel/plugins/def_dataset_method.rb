# frozen-string-literal: true

module Sequel
  module Plugins
    # The def_dataset_method plugin adds Model.def_dataset_method
    # for defining dataset methods:
    #
    #   Album.def_dataset_method(:by_name) do |name|
    #     where(name: name)
    #   end
    #
    # Additionally, this adds support for Model.subset, which can also
    # be used to define dataset methods that add specific filters:
    #
    #   Album.subset(:gold){copies_sold >= 500000}
    #
    # This exists for backwards compatibility with previous Sequel versions.
    # 
    # Usage:
    #
    #   # Make all model subclasses support Model.def_dataset_method
    #   # (called before loading subclasses)
    #   Sequel::Model.plugin :def_dataset_method
    #
    #   # Make the Album class support Model.def_dataset_method
    #   Album.plugin :def_dataset_method
    module DefDatasetMethod
      module ClassMethods
        # If a block is given, define a method on the dataset (if the model currently has an dataset)  with the given argument name using
        # the given block.  Also define a class method on the model that calls the
        # dataset method.  Stores the method name and block so that it can be reapplied if the model's
        # dataset changes.
        #
        # If a block is not given, just define a class method on the model for each argument
        # that calls the dataset method of the same argument name.
        #
        # Using dataset_module is recommended over using this method.  In addition to allowing
        # more natural ruby syntax for defining methods manually, it also offers numerous
        # helper methods that make defining common dataset methods more easily, as well as
        # supporting dataset caching (assuming the arguments allow it).
        #
        #   # Add new dataset method and class method that calls it
        #   Artist.def_dataset_method(:by_name){order(:name)}
        #   Artist.where(Sequel[:name].like('A%')).by_name
        #   Artist.by_name.where(Sequel[:name].like('A%'))
        #
        #   # Just add a class method that calls an existing dataset method
        #   Artist.def_dataset_method(:paginate)
        #   Artist.paginate(2, 10)
        def def_dataset_method(*args, &block)
          raise(Error, "No arguments given") if args.empty?

          if block
            raise(Error, "Defining a dataset method using a block requires only one argument") if args.length > 1
            dataset_module{define_method(args.first, &block)}
          else
            args.each{|arg| def_model_dataset_method(arg)}
          end
        end

        # Sets up a dataset method that returns a filtered dataset.
        # Sometimes thought of as a scope, and like most dataset methods,
        # they can be chained.
        # For example:
        #
        #   Topic.subset(:joes, Sequel[:username].like('%joe%'))
        #   Topic.subset(:popular){num_posts > 100}
        #   Topic.subset(:recent){created_on > Date.today - 7}
        #
        # Allows you to do:
        #
        #   Topic.joes.recent.popular
        #
        # to get topics with a username that includes joe that
        # have more than 100 posts and were created less than
        # 7 days ago.
        #
        # Both the args given and the block are passed to <tt>Dataset#where</tt>.
        #
        # This method creates dataset methods that do not accept arguments.  To create
        # dataset methods that accept arguments, you should use define a
        # method directly inside a #dataset_module block.
        def subset(*args, &block)
          dataset_module{subset(*args, &block)}
        end
      end
    end
  end
end

