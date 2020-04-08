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

require 'uri'

module AWS
  class IAM

    # Shared methods exposing a collection of policy documents
    # associated with an IAM resource (a {User} or a {Group}).  Policy
    # collections can be constructed using {Group#policies} and
    # {User#policies}.
    module PolicyCollection

      include Collection

      # Retrieves a policy document by name.
      #
      # @param [String] name The name of the policy to retrieve.
      #
      # @return [Policy] The policy with the given name.  If no such
      #   policy exists, this method returns `nil`.
      def [] name
        resp = get_policy(:policy_name => name)
        Policy.from_json(URI.unescape(resp.policy_document))
      rescue Errors::NoSuchEntity => e
        nil
      end

      # Adds or replaces a policy document.
      #
      # @param [String] name The name of the policy document.
      #
      # @param [Policy,String] document The policy document.  This can
      #   be a JSON string, or any object that responds to `to_json`.
      #   The {Policy} class provides a convenient way to construct
      #   policy documents that you can use with AWS IAM.
      def []= name, document
        document = document.to_json if document.respond_to?(:to_json) and
          !document.kind_of?(String)
        put_policy(:policy_name => name,
                   :policy_document => document)
      end

      # Deletes a policy by name.  This method is idempotent; if no
      # policy exists with the given name, the method does nothing.
      #
      # @param [String] name The name of the policy document.
      def delete(name)
        delete_policy(:policy_name => name)
        nil
      rescue Errors::NoSuchEntity => e
        nil
      end

      # Retrieves multiple policy documents by name.  This method
      # makes one request to AWS IAM per argument.
      #
      # @param names Each argument is the name of a policy to retrieve.
      #
      # @return [Array<Policy>] An array containing the requested
      #   policy documents, in the same order as the argument list.
      #   If a requested policy does not exist, the array member
      #   corresponding to that argument will be `nil`.
      def values_at(*names)
        names.map { |n| self[n] }
      end

      # @return [Enumerator<String>] An enumerator for retrieving all
      #   the policy names that are currently associated with the
      #   resource.
      def keys
        enumerator(:names_only => true)
      end
      alias_method :names, :keys

      # @return [Enumerator<Policy>] An enumerator for retrieving all
      #   the policy documents that are currently associated with the
      #   resource.
      def values
        enumerator(:values_only => true)
      end

      # Removes all policies from the collection.
      def clear
        keys.each { |k| delete(k) }
      end

      # @param [String] name The name of the policy to check.
      #
      # @return [Boolean] True if there is a policy with the given name.
      def has_key? name
        get_policy(:policy_name => name)
        true
      rescue Errors::NoSuchEntity => e
        false
      end
      alias_method :include?, :has_key?
      alias_method :key?, :has_key?
      alias_method :member?, :has_key?

      # @yield [name, policy] The name and document for each policy
      #   that is associated with the resource.  Like `Hash#each`,
      #   this method is sensitive to the arity of the provided block;
      #   if the block takes two arguments, they will be the name and
      #   document.  If it accepts only one argument, it will be an
      #   array containing the name and document.
      def each opts = {}, &block
        opts = opts.dup
        names_only = opts.delete(:names_only)
        values_only = opts.delete(:values_only)
        super(client_opts(opts)) do |pn|
          case
          when names_only
            yield pn
          when values_only
            yield self[pn]
          when block.arity == 2
            yield pn, self[pn]
          else
            yield [pn, self[pn]]
          end
        end
      end

      # @return [Hash] The contents of the collection as a hash.
      def to_h
        inject({}) do |hash, (name, policy)|
          hash[name] = policy
          hash
        end
      end

      protected
      def get_policy(opts = {})
        client.send("get_#{resource_name}_policy",
                    client_opts(opts))
      end

      protected
      def put_policy(opts = {})
        client.send("put_#{resource_name}_policy",
                    client_opts(opts))
      end

      protected
      def request_method
        :"list_#{resource_name}_policies"
      end

      protected
      def delete_policy(opts = {})
        client.send("delete_#{resource_name}_policy",
                    client_opts(opts))
      end

      protected
      def client_opts(opts = {})
        Hash[[[:"#{resource_name}_name",
               send(resource_name).name]]].merge(opts)
      end

      protected
      def resource_name
        raise NotImplementedError unless
          self.class.name =~ /AWS::IAM::(.*)PolicyCollection$/
        $1.downcase
      end

      protected
      def each_item(response, &block)
        response.data[:policy_names].each(&block)
      end

    end

  end
end
