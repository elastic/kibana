# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

module AWS
  class EC2

    # @api private
    class Resource < Core::Resource

      # @api private
      protected
      def resource_identifiers
        [[resource_id_method, send(resource_id_method)]]
      end

      protected
      def __resource_id__
        send(resource_id_method)
      end

      protected
      def response_id_method
        # e.g. instance_id
        inflected_name + "_" + resource_id_method.to_s
      end

      protected
      def resource_id_method
        @resource_id_method ||=
          case
          when respond_to?(:id) && method(:id).owner != Kernel
            # id isn't defined on Object in some Ruby versions, in
            # others it is an alias for object_id; if the method is
            # not owned by Kernel we can assume that it has been
            # overridden in a subclass
            :id
          when respond_to?(:name)
            :name
          else
            raise NotImplementedError
          end
      end

      protected
      def get_resource attribute = nil
        describe_call
      end

      protected
      def retrieve_attribute attribute_or_attribute_name, &block
        if attribute_or_attribute_name.is_a?(Symbol)
          attribute = self.class.attributes[attribute_or_attribute_name]
        else
          attribute = attribute_or_attribute_name
        end
        super(attribute, &block)
      end

      protected
      def describe_call
        options = { :"#{response_id_method}s" => [__resource_id__] }
        client.send(describe_call_name, options)
      end

      protected
      def describe_attribute_call(attribute)
        name = describe_attribute_call_name

        attr_opt_name = Core::Inflection.class_name(attribute.from.to_s)
        attr_opt_name = attr_opt_name[0,1].downcase + attr_opt_name[1..-1]

        client.send(name, Hash[[[response_id_method.to_sym,
                                 __resource_id__],
                                [:attribute, attr_opt_name]]])
      end

      protected
      def update_resource attribute, value
        options = {}
        if value.is_a?(Array)
          options[attribute.set_as] = value
        else
          options[attribute.set_as] = { :value => value }
        end
        options[:"#{inflected_name}_id"] = __resource_id__
        method_name = "modify_#{inflected_name}_attribute"
        client.send(method_name, options)
      end

      # required for tagged item, which most ec2 resources are
      protected
      def find_in_response response
        self.class.attribute_providers.each do |provider|
          if provider.request_types.include?(response.request_type)
            return send(provider.finder_method, response)
          end
        end
      end

      module InflectionMethods

        protected
        def describe_call_name
          :"describe_#{plural_name}"
        end

        protected
        def describe_attribute_call_name
          "describe_#{inflected_name}_attribute"
        end

        protected
        def inflected_name
          Core::Inflection.ruby_name(class_name)
        end

        protected
        def class_name
          self.kind_of?(Class) ? name : self.class.name
        end

        protected
        def plural_name
          name = inflected_name
          name[-1..-1] == 's' ? name : name + "s"
        end

        protected
        def output_translator(name, type)
          "translate_#{type}_output_for_#{name}"
        end

      end

      extend InflectionMethods
      include InflectionMethods

      class << self

        # @api private
        protected
        def describe_call_attribute(name, opts = {}, &blk)
          attribute(name, opts, &blk)
        end

      end

    end

  end
end
