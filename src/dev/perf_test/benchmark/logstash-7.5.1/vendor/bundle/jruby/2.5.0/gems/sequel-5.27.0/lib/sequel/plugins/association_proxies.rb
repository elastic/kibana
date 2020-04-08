# frozen-string-literal: true

module Sequel
  module Plugins
    # Sequel by default does not use proxies for associations.  The association
    # method for *_to_many associations returns an array, and the association_dataset
    # method returns a dataset.  This plugin makes the association method return a proxy
    # that will load the association and call a method on the association array if sent
    # an array method, and otherwise send the method to the association's dataset.
    # 
    # You can override which methods to forward to the dataset by passing a block to the plugin:
    #
    #   plugin :association_proxies do |opts|
    #     [:find, :where, :create].include?(opts[:method])
    #   end
    #
    # If the block returns false or nil, the method is sent to the array of associated
    # objects.  Otherwise, the method is sent to the association dataset.  Here are the entries
    # in the hash passed to the block:
    #
    # :method :: The name of the method
    # :arguments :: The arguments to the method
    # :block :: The block given to the method
    # :instance :: The model instance related to the call
    # :reflection :: The reflection for the association related to the call
    # :proxy_argument :: The argument given to the association method call
    # :proxy_block :: The block given to the association method call
    # 
    # For example, in a call like:
    #
    #   artist.albums(1){|ds| ds}.foo(2){|x| 3}
    #
    # The opts passed to the block would be:
    #
    #   {
    #     :method => :foo,
    #     :arguments => [2],
    #     :block => {|x| 3},
    #     :instance => artist,
    #     :reflection => AssociationReflection instance,
    #     :proxy_argument => 1,
    #     :proxy_block => {|ds| ds}
    #   }
    #
    # Usage:
    #
    #   # Use association proxies in all model subclasses (called before loading subclasses)
    #   Sequel::Model.plugin :association_proxies
    #
    #   # Use association proxies in a specific model subclass
    #   Album.plugin :association_proxies
    module AssociationProxies
      def self.configure(model, &block)
        model.instance_exec do
          @association_proxy_to_dataset = block if block
          @association_proxy_to_dataset ||= AssociationProxy::DEFAULT_PROXY_TO_DATASET
        end
      end

      # A proxy for the association.  Calling an array method will load the
      # associated objects and call the method on the associated object array.
      # Calling any other method will call that method on the association's dataset.
      class AssociationProxy < BasicObject
        array = [].freeze

        if RUBY_VERSION < '2.6'
          # :nocov:

          # Default proc used to determine whether to send the method to the dataset.
          # If the array would respond to it, sends it to the array instead of the dataset.
          DEFAULT_PROXY_TO_DATASET = proc do |opts|
            array_method = array.respond_to?(opts[:method])
            if !array_method && opts[:method] == :filter
              Sequel::Deprecation.deprecate "The behavior of the #filter method for association proxies will change in Ruby 2.6. Switch from using #filter to using #where to conserve current behavior."
            end
            !array_method
          end
          # :nocov:
        else
          DEFAULT_PROXY_TO_DATASET = proc{|opts| !array.respond_to?(opts[:method])}
        end

        # Set the association reflection to use, and whether the association should be
        # reloaded if an array method is called.
        def initialize(instance, reflection, proxy_argument, &proxy_block)
          @instance = instance
          @reflection = reflection
          @proxy_argument = proxy_argument
          @proxy_block = proxy_block
        end

        # Call the method given on the array of associated objects if the method
        # is an array method, otherwise call the method on the association's dataset.
        def method_missing(meth, *args, &block)
          v = if @instance.model.association_proxy_to_dataset.call(:method=>meth, :arguments=>args, :block=>block, :instance=>@instance, :reflection=>@reflection, :proxy_argument=>@proxy_argument, :proxy_block=>@proxy_block)
            @instance.public_send(@reflection[:dataset_method])
          else
            @instance.send(:load_associated_objects, @reflection, @proxy_argument, &@proxy_block)
          end
          v.public_send(meth, *args, &block)
        end
      end

      module ClassMethods
        # Proc that accepts a method name, array of arguments, and block and
        # should return a truthy value to send the method to the dataset instead of the
        # array of associated objects.
        attr_reader :association_proxy_to_dataset

        Plugins.inherited_instance_variables(self, :@association_proxy_to_dataset=>nil)

        # Changes the association method to return a proxy instead of the associated objects
        # directly.
        def def_association_method(opts)
          if opts.returns_array?
            association_module_def(opts.association_method, opts) do |dynamic_opts=OPTS, &block|
              AssociationProxy.new(self, opts, dynamic_opts, &block)
            end
          else
            super
          end
        end
      end
    end
  end
end
