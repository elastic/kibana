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

    # @attr_reader [Symbol] status The status of this access key.
    #   Status may be `:active` or `:inactive`.
    #
    # @attr_reader [Time] create_date
    #
    class AccessKey < Resource

      # @param [String] access_key_id The id of this access key.
      # @param [Hash] options
      # @option [String] :user The IAM user this access key belongs to.
      #   If `:user` is omitted then this access key belongs to the
      #   AWS account.
      def initialize access_key_id, options = {}
        @id = access_key_id
        options[:secret_value] = nil unless options.has_key?(:secret_value)
        @user = options[:user]
        @user ? super(@user, options) : super(options)
      end

      # @return [User,nil] Returns the user this access key belongs to.
      #   Returns `nil` if this access key belongs to the AWS account and not
      #   a specific user.
      attr_reader :user

      # @return [String] Returns the access key id.
      attr_reader :id

      alias_method :access_key_id, :id

      # @attr_reader [Time] When the access key was created.
      attribute :create_date, :static => true

      attribute :secret_value, :from => :secret_access_key, :static => true

      protected :secret_value

      mutable_attribute :status, :to_sym => true

      protected :status=

      populates_from(:create_access_key) do |resp|
        resp.access_key if matches_response_object?(resp.access_key)
      end

      populates_from(:list_access_keys) do |resp|
        resp.access_key_metadata.find {|k| matches_response_object?(k) }
      end

      # Returns the secret access key.
      #
      # You can only access the secret for newly created access
      # keys.  Calling `secret` on existing access keys raises an error.
      #
      # @example Getting the secret from a newly created access key
      #
      #   access_key = iam.access_keys.create
      #   access_key.secret
      #   #=> 'SECRET_ACCESS_KEY'
      #
      # @example Failing to get the secret from an existing access key.
      #
      #   access_key = iam.access_keys.first
      #   access_key.secret
      #   #=> raises a runtime error
      #
      # @return [String] Returns the secret access key.
      def secret
        secret_value or raise 'secret is only available for new access keys'
      end

      alias_method :secret_access_key, :secret

      # @return [String,nil] Returns the name of the user this access key
      #   belogns to.  If the access key belongs to the account, `nil` is
      #   returned.
      def user_name
        @user ? @user.name : nil
      end

      # @return [Boolean] Returns true if this access key is active.
      def active?
        status == :active
      end

      # @return [Boolean] Returns true if this access key is inactive.
      def inactive?
        status == :inactive
      end

      # Activates this access key.
      #
      # @example
      #   access_key.activate!
      #   access_key.status
      #   # => :active
      #
      # @return [nil]
      def activate!
        self.status = 'Active'
        nil
      end

      # Deactivates this access key.
      #
      # @example
      #   access_key.deactivate!
      #   access_key.status
      #   # => :inactive
      #
      # @return [nil]
      # @return [nil]
      def deactivate!
        self.status = 'Inactive'
        nil
      end

      # Deletes the access key.
      def delete
        client.delete_access_key(resource_options)
        nil
      end

      # Returns a hash that should be saved somewhere safe.
      #
      #     access_keys = iam.access_keys.create
      #     access_keys.credentials
      #     #=> { :access_key_id => '...', :secret_access_key => '...' }
      #
      # You can also use these credentials to make requests:
      #
      #     s3 = AWS::S3.new(access_keys.credentials)
      #     s3.buckets.create('newbucket')
      #
      # @return [Hash] Returns a hash with the access key id and
      #   secret access key.
      def credentials
        { :access_key_id => id, :secret_access_key => secret }
      end

      # @api private
      protected
      def resource_identifiers
        identifiers = []
        identifiers << [:access_key_id, id]
        identifiers << [:user_name, user.name] if user
        identifiers
      end

      # IAM does not provide a request for "get access keys".
      # Also note, we do not page the response. This is because
      # restrictions on how many access keys an account / user may
      # have is fewer than one page of results.
      # @api private
      protected
      def get_resource attribute
        options = user ? { :user_name => user.name } : {}
        client.list_access_keys(options)
      end

      # @api private
      protected
      def matches_response_object? obj
        user_name = obj.respond_to?(:user_name) ? obj.user_name : nil
        obj.access_key_id == self.id and user_name == self.user_name
      end

    end
  end
end
