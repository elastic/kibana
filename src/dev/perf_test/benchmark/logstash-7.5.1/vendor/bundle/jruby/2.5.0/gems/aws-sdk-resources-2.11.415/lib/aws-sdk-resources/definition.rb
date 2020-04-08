require 'set'

module Aws
  module Resources

    # Given a resource definition document, a {Definition} can build a set
    # of related resource classes.
    class Definition

      # @param [Hash] definition
      # @option options [String] :source_path
      def initialize(definition = {}, options = {})
        @source = definition
        @source_path = options[:source_path]
      end

      # @param [Module<Service>] namespace
      # @return [void]
      def apply(namespace)
        build_resource_classes(namespace)
        each_resource_class(namespace) do |resource, definition|
          define_load(namespace, resource, definition['load'])
          define_actions(namespace, resource, definition['actions'] || {})
          define_batch_actions(namespace, resource, definition['batchActions'] || {})
          define_waiters(namespace, resource, definition['waiters'] || {})
          define_has(namespace, resource, definition['has'] || {})
          define_has_many(namespace, resource, definition['hasMany'] || {})
          define_data_attributes(namespace, resource, definition)
        end
      end

      private

      def build_resource_classes(namespace)
        each_definition do |name, definition|
          resource_class = Class.new(Resource)
          resource_class.client_class = namespace::Client
          resource_class.resource_name = name
          (definition['identifiers'] || []).each do |identifier|
            resource_class.add_identifier(underscore(identifier['name']))
          end
          namespace.const_set(name, resource_class)
        end
      end

      def each_resource_class(namespace, &block)
        each_definition do |name, definition|
          yield(namespace.const_get(name), definition)
        end
      end

      def define_batch_actions(namespace, resource, batch_actions)
        batch_actions.each do |name, definition|
          method_name = "batch_" + underscore(name)
          method_name += '!' if dangerous?(name, definition)
          operation = build_operation(namespace, resource, definition)
          resource.add_batch_operation(method_name, operation)
        end
      end

      def dangerous?(name, definition)
        if
          name.match(/delete/i) ||
          name.match(/terminate/i) ||
          definition['request']['operation'].match(/delete/i) ||
          definition['request']['operation'].match(/terminate/i)
        then
          true
        else
          false
        end
      end

      def define_data_attributes(namespace, resource, definition)
        if shape_name = definition['shape']
          shape = resource.client_class.api.metadata['shapes'][shape_name]
          shape.member_names.each do |member_name|
            if
              resource.instance_methods.include?(member_name) ||
              data_attribute_is_an_identifier?(member_name, resource, definition)
            then
              next # some data attributes are duplicates to identifiers
            else
              resource.add_data_attribute(member_name)
            end
          end
        end
      end

      def data_attribute_is_an_identifier?(attr_name, resource, definition)
        resource.identifiers.include?(attr_name) ||
        definition['identifiers'].any? { |i| underscore(i['dataMember']) == attr_name.to_s }
      end

      def define_load(namespace, resource, definition)
        return unless definition
        resource.load_operation = Operations::LoadOperation.new(
          request: define_request(definition['request']),
          path: underscore(definition['path']),
          source: source(definition),
        )
      end

      def define_actions(namespace, resource, actions)
        actions.each do |name, action|
          operation = build_operation(namespace, resource, action)
          resource.add_operation(underscore(name), operation)
        end
      end

      def define_waiters(namespace, resource, waiters)
        waiters.each do |name, definition|
          operation = build_waiter_operation(namespace, resource, definition)
          resource.add_operation("wait_until_#{underscore(name)}", operation)
        end
      end

      def build_operation(namespace, resource, definition)
        if definition['resource']
          build_resource_action(namespace, resource, definition)
        else
          build_basic_action(namespace, resource, definition)
        end
      end

      def build_basic_action(namespace, resource, definition)
        Operations::Operation.new(
          request: define_request(definition['request']),
          source: source(definition)
        )
      end

      def build_resource_action(namespace, resource, definition)
        builder = define_builder(namespace, definition['resource'])
        if path = definition['resource']['path']
          builder.sources << BuilderSources::ResponsePath.new({
            source: underscore(path),
            target: :data,
          })
        end
        Operations::ResourceOperation.new(
          request: define_request(definition['request']),
          builder: builder,
          source: source(definition)
        )
      end

      def has_many(namespace, resource, definition)
        builder = define_builder(namespace, definition['resource'])
        if path = definition['resource']['path']
          builder.sources << BuilderSources::ResponsePath.new({
            source: underscore(path),
            target: :data,
          })
        end
        Operations::HasManyOperation.new(
          request: define_request(definition['request']),
          builder: builder,
          source: source(definition),
          limit_key: limit_key(resource, definition))
      end

      def build_waiter_operation(namespace, resource, definition)
        Operations::WaiterOperation.new(
          waiter_name: underscore(definition['waiterName']).to_sym,
          waiter_params: request_params(definition['params']),
          path: underscore(definition['path'])
        )
      end

      def limit_key(resource, definition)
        operation_name = definition['request']['operation']
        operation = resource.client_class.api.operation(underscore(operation_name))
        if operation[:pager]
          operation[:pager].limit_key
        else
          nil
        end
      end

      def define_request(definition)
        Request.new(
          method_name: underscore(definition['operation']),
          params: request_params(definition['params'] || [])
        )
      end

      def request_params(params)
        params.map do |definition|
          send("#{definition['source']}_request_param", definition)
        end
      end

      def identifier_request_param(definition)
        RequestParams::Identifier.new({
          target: underscore(definition['target']),
          name: underscore(definition['name']).to_sym,
        })
      end

      def data_request_param(definition)
        RequestParams::DataMember.new({
          target: underscore(definition['target']),
          path: underscore(definition['path']),
        })
      end

      def string_request_param(definition)
        RequestParams::Literal.new({
          target: underscore(definition['target']),
          value: definition['value'],
        })
      end
      alias integer_request_param string_request_param
      alias float_request_param string_request_param
      alias boolean_request_param string_request_param
      alias null_request_param string_request_param

      def define_has_many(namespace, resource, has_many)
        has_many.each do |name, definition|
          operation = has_many(namespace, resource, definition)
          resource.add_operation(underscore(name), operation)
        end
      end

      def define_has(namespace, resource, has)
        has.each do |name, definition|
          has_operation(namespace, resource, name, definition)
        end
      end

      def has_operation(namespace, resource, name, definition)
        builder = define_builder(namespace, definition['resource'])
        if path = definition['resource']['path']
          builder.sources << BuilderSources::DataMember.new({
            source: underscore(path),
            target: :data,
          })
        end
        operation = Operations::HasOperation.new(
          builder: builder,
          source: source(definition))
        resource.add_operation(underscore(name), operation)
      end

      def define_builder(namespace, definition)
        Builder.new(
          resource_class: namespace.const_get(definition['type']),
          sources: builder_sources(definition['identifiers'] || [])
        )
      end

      def builder_sources(sources)
        sources.map do |definition|
          send("#{definition['source']}_builder_source", definition, sources)
        end
      end

      def input_builder_source(definition, sources)
        arguments = sources.select { |s| s['source'] == 'input' }
        BuilderSources::Argument.new({
          source: arguments.index(definition),
          target: underscore(definition['target']),
        })
      end

      def identifier_builder_source(definition, _)
        BuilderSources::Identifier.new({
          source: underscore(definition['name']),
          target: underscore(definition['target']),
        })
      end

      def data_builder_source(definition, _)
        BuilderSources::DataMember.new({
          source: underscore(definition['path']),
          target: underscore(definition['target']),
        })
      end

      def requestParameter_builder_source(definition, _)
        BuilderSources::RequestParameter.new({
          source: underscore(definition['path']),
          target: underscore(definition['target']),
        })
      end

      def response_builder_source(definition, _)
        BuilderSources::ResponsePath.new({
          source: underscore(definition['path']),
          target: underscore(definition['target']),
        })
      end

      def string_builder_source(definition, _)
        BuilderSources::ResponsePath.new({
          source: underscore(definition['value']),
          target: underscore(definition['target']),
        })
      end

      def svc_definition
        @source['service'] || {}
      end

      def resource_definitions
        @source['resources'] || {}
      end

      def each_definition(&block)
        yield('Resource', svc_definition)
        resource_definitions.each(&block)
      end

      def underscore(str)
        if str
          str.gsub(/\w+/) { |part| Seahorse::Util.underscore(part) }
        end
      end

      def source(definition)
        if ENV['SOURCE']
          Source.new(definition, @source_path)
        else
          nil
        end
      end

    end
  end
end
