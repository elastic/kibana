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

    # Both AWS accounts and IAM users can have access keys (maximum of 2).
    # You can create new keys so that you can rotate out your old keys.
    # You can create, delete, activate and deactivate access keys.
    #
    # ## Create New Access Keys
    #
    #     # for the aws account
    #     access_keys = iam.access_keys.create
    #
    #     # for an iam user
    #     user_access_keys = iam.users['johndoe'].access_keys.create
    #
    # ## Secret
    #
    # Make sure after creating an access to retrieve the secret access key
    # and save it somewhere safe.
    #
    #     access_keys = iam.access_keys.create
    #     secret = access_keys.secret
    #
    # If you try to access the secret on an access key that was not newly
    # created an error will be raised.  AWS will only give the secret for
    # a newly created access key:
    #
    #     access_keys = iam.access_keys.first
    #     access_keys.secret
    #     #=> oops, raises a runtime error
    #
    class AccessKeyCollection

      include Collection

      # @param [Hash] options
      # @option options [User] :user If present, this collection will only
      #   represent the access keys for the given user.
      def initialize options = {}
        @user = options[:user]
        @user ? super(@user, options) : super(options)
      end

      # @return [User,nil] Returns the user these accesss keys belong to.
      #   If this returns `nil` then these access keys belong to the
      #   AWS account.
      attr_reader :user

      def create

        options = {}
        options[:user_name] = user.name if user

        resp = client.create_access_key(options)

        AccessKey.new_from(:create_access_key, resp.access_key,
          resp.access_key.access_key_id, new_options)

      end

      # @param [String] access_key_id The ID of the access key.
      # @return [AccessKey] Returns a reference to the access key with
      #   the given `access_key_id`.
      def [] access_key_id
        AccessKey.new(access_key_id, new_options)
      end

      # Deletes all of the access keys from this collection.
      #
      #     iam.users['someuser'].access_keys.clear
      #
      # @return [nil]
      def clear
        each{|access_key| access_key.delete }
        nil
      end

      # Yields once for each access key.  You can limit the number of
      # access keys yielded using `:limit`.
      #
      # @param [Hash] options
      # @option options [Integer] :limit The maximum number of access keys
      #   to yield.
      # @option options [Integer] :batch_size The maximum number of
      #   access keys received each service reqeust.
      # @yieldparam [AccessKey] access_key
      # @return [nil]
      def each options = {}, &block
        each_options = options.dup
        each_options[:user_name] = user.name if user
        super(each_options, &block)
      end

      # @api private
      protected
      def each_item response, &block
        response.access_key_metadata.each do |item|

          access_key = AccessKey.new_from(:list_access_keys, item,
            item.access_key_id, new_options)

          yield(access_key)

        end
      end

      # @api private
      protected
      def new_options
        user ? { :user => user } : { :config => config }
      end

    end
  end
end
