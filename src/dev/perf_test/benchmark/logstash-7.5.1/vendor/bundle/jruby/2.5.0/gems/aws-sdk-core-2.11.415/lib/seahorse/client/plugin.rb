module Seahorse
  module Client
    class Plugin

      extend HandlerBuilder

      # @param [Configuration] config
      # @return [void]
      def add_options(config)
        self.class.options.each do |args, block|
          config.add_option(*args, &block)
        end
      end

      # @param [HandlerList] handlers
      # @param [Configuration] config
      # @return [void]
      def add_handlers(handlers, config)
        handlers.copy_from(self.class.handlers)
      end

      # @param [Class<Client::Base>] client_class
      # @param [Hash] options
      # @return [void]
      def before_initialize(client_class, options)
        self.class.before_initialize_hooks.each do |block|
          block.call(client_class, options)
        end
      end

      # @param [Client::Base] client
      # @return [void]
      def after_initialize(client)
        self.class.after_initialize_hooks.each do |block|
          block.call(client)
        end
      end

      class << self

        def option(name, default = nil, &block)
          if block_given?
            options << [[name], block]
          else
            options << [[name, default]]
          end
        end

        def before_initialize(&block)
          before_initialize_hooks << block
        end

        def after_initialize(&block)
          after_initialize_hooks << block
        end

        # @api private
        def options
          @options ||= []
        end

        # @api private
        def handlers
          @handlers ||= HandlerList.new
        end

        # @api private
        def before_initialize_hooks
          @before_initialize_hooks ||= []
        end

        # @api private
        def after_initialize_hooks
          @after_initialize_hooks ||= []
        end

      end
    end
  end
end
