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
  class IAM

    # A collection that provides access to IAM groups
    # belonging to this account.
    #
    #     iam = AWS::IAM.new
    #     groups = iam.groups
    #
    # ## Creating a Group
    #
    # You can create a group using the {#create} method:
    #
    #     group = iam.groups.create("Developers")
    #
    # ## Getting a Group by Name
    #
    # You can get a reference to a server certificate using array notation:
    #
    #     group = iam.groups["Developers"]
    #
    # ## Enumerating Groups
    #
    # Group collections can also be used to enumerate groups:
    #
    #     groups.each do |group|
    #       puts group.name
    #     end
    #
    # You can limit the groups returned by passing a `:prefix` option
    # to any of the enumerator methods.  When you pass a prefix, only
    # the certificates whose paths start with the given string will be
    # returned.
    class GroupCollection

      include Collection::WithPrefix

      # Creates a group.
      #
      # @param [String] name Name of the group to create. Do not
      #   include the path in this value.
      #
      # @param [Hash] options Options for creating the group.
      #
      # @option options [String] :path The path to the group.
      def create(name, options = {})
        client_opts = { :group_name => name }.merge(options)
        if path = client_opts[:path]
          client_opts[:path] = "/#{path}/".
            sub(%r{^//}, "/").
            sub(%r{//$}, "/")
        end
        resp = client.create_group(client_opts)
        Group.new(resp.group.group_name, :config => config)
      end

      # Yields once for each group.
      #
      # You can limit the number of groups yielded using `:limit` and
      # `:path_prefix`.
      #
      # @param [Hash] options
      #
      # @option options [String] :path_prefix ('/') A path prefix that
      #   filters according to the path of the group.
      #
      # @option options [Integer] :limit The maximum number of groups
      #   to yield.
      #
      # @option options [Integer] :batch_size The maximum number of
      #   groups to retrieve in each service request.
      #
      # @yieldparam [Group] group
      # @return [nil]
      def each options = {}, &block
        super(options, &block)
      end

      # Returns an enumerable object for this collection.  This can be
      # useful if you want to call an enumerable method that does
      # not accept options (e.g. `collect`, `first`, etc).
      #
      #     groups.enumerator(:path_prefix => '/admin').collect(&:name)
      #
      # @param (see #each)
      # @option (see #each)
      # @return [Enumerator]
      def enumerator options = {}
        super(options)
      end

      # Returns a reference to the group with the given name:
      #
      #     group = iam.groups['groupname']
      #
      # @param [String] name Name of the group to return a reference for.
      # @return [Group] Returns a reference to the named group.
      def [] name
        Group.new(name, :config => config)
      end

      # @api private
      protected
      def each_item response, &block
        response.groups.each do |item|

          group = Group.new_from(:list_groups, item,
                                 item.group_name,
                                 :config => config)

          yield(group)

        end
      end

    end

  end
end
