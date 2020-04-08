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

    # A collection that provides access to IAM users belonging to this
    # account.
    #
    #     iam = AWS::IAM.new
    #     users = iam.users
    #
    # ## Creating A User
    #
    # To create an IAM user you need only provide a user name.
    #
    #     user = users.create('username')
    #
    # You can also provide an optional `:path` that can be used to organize
    # users.
    #
    #     user = users.create('johndoe', :path => '/staff/customer_support/')
    #
    # ## Getting a User by Name
    #
    # You can get a referene to a user by using array notation:
    #
    #     user = users['username']
    #
    # ## Enumerating Users
    #
    # A user collection can also be used to enumerate users:
    #
    #     users.each do |user|
    #       puts user.name
    #     end
    #
    # ## Path Prefixes
    #
    # You can also find/enumerate users who's path begins with a given prefix:
    #
    #     users.each(:path_prefix => '/staff/developers/ruby').each do |ruby_dev|
    #       puts "#{ruby_dev.name} is awesome!"
    #     end
    #
    class UserCollection

      include Collection::WithPrefix

      # @param [String] name Name of the user to create.
      # @option options [String] :path ('/') The path for the user name.
      #   For more information about paths, see
      #   [Identifiers for IAM Entities](http://docs.aws.amazon.com/IAM/latest/UserGuide/index.html?Using_Identifiers.html)
      # @return [User] Returns the newly created user.
      def create name, options = {}
        create_opts = {}
        create_opts[:user_name] = name
        create_opts[:path] = options[:path] if options[:path]
        resp = client.create_user(create_opts)
        User.new_from(:create_user, resp.user,
          resp.user.user_name, :config => config)
      end

      # Returns a reference to the user with the given name:
      #
      #     user = iam.users['username']
      #
      # @param [String] name Name of the user to return a reference for.
      # @return [User] Returns a reference to the named user.
      def [] name
        User.new(name.to_s, :config => config)
      end

      # Yields once for each user.
      #
      # You can limit the number of users yielded using `:limit` and
      # `:path_prefix`.
      #
      # @param [Hash] options
      #
      # @option options [String] :path_prefix ('/') A path prefix that
      #   filters according to the path of the user.
      #
      # @option options [Integer] :limit The maximum number of users to yield.
      #
      # @option options [Integer] :batch_size The maximum number of users
      #   to retrieve with each service request.
      #
      # @yieldparam [User] user
      # @return [nil]
      def each options = {}, &block
        super(options, &block)
      end

      # Returns an enumerable object for this collection.  This can be
      # useful if you want to call an enumerable method that does
      # not accept options (e.g. `collect`, `first`, etc).
      #
      #     users.enumerator(:path_prefix => '/admin').collect(&:name)
      #
      # @param (see #each)
      # @option (see #each)
      # @return [Enumerator]
      def enumerator options = {}
        super(options)
      end

      # @api private
      protected
      def each_item response, &block
        response.users.each do |item|

          user = User.new_from(:list_users, item,
            item.user_name, :config => config)

          yield(user)

        end
      end

    end
  end
end
