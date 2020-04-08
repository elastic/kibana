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


    # Represents an IAM User.  Each AWS account can have many users.  Users
    # can be organized (optionally) into groups.  Users (and groups) can be
    # given policies that affect that they can do.
    #
    # ## Creating A User
    #
    #     iam = AWS::IAM.new
    #     user = iam.users.create('johndoe')
    #
    # ## Renaming a User
    #
    # You can only edit a user's name and path (both of which will modify
    # the user's ARN).
    #
    #     user = iam.users['johndoe']
    #     user.name = 'newname'
    #
    # ## User Path
    #
    # When you create a user you can assign a path.  Paths must begin and
    # end with a forward slash (/).
    #
    #     user = iam.users.create('newuser', :path => '/developers/ruby/')
    #
    # Paths are a useful tool for organizing/tagging users.  You can later
    # enumerate users by their path prefixes:
    #
    #     iam.users.each(:path_prefix => '/developers').each do |developer|
    #       puts developer.name
    #     end
    #
    # ## Login Profile
    #
    # A login profile is required for an IAM user to use the AWS Management
    # console (web interface).  See {LoginProfile} for more information.
    #
    # ## Deleting Users
    #
    # In order to delete a user you must first remove it from all of its
    # groups and delete all of its signing certificates.  Once this is done:
    #
    # @attr [String] user_name
    #
    # @attr [String] path
    #
    # @attr_reader [String] id
    #
    # @attr_reader [DateTime] create_date
    #
    # @attr_reader [String] arn
    #
    class User < Resource

      prefix_update_attributes

      # @param [String] name The IAM user name for this user.
      # @param [Hash] options
      def initialize name, options = {}
        options[:name] = name
        super(options)
      end

      # @attr [String] The IAM user name.
      mutable_attribute :name, :static => true, :from => :user_name

      # @attr_reader [String] The user's unique ID.
      attribute :id, :static => true, :from => :user_id

      # @attr_reader [Time] When the user was created.
      attribute :create_date, :static => true

      # @attr_reader [String] The user's ARN (Amazon Resource Name).
      attribute :arn

      # @attr [String] The path for this user.  Paths are used to
      #   identify which division or part of an organization the user
      #   belongs to.
      mutable_attribute :path

      populates_from(:create_user, :get_user) do |resp|
        resp[:user] if resp[:user][:user_name] == name
      end

      populates_from(:list_users, :get_group) do |resp|
        resp[:users].find{|u| u[:user_name] == name }
      end

      # Deletes this user.
      # @return [nil]
      def delete
        client.delete_user(resource_options)
        nil
      end

      # Deletes the current user, after:
      # * deleting its login profile
      # * removing it from all groups
      # * deleting all of its access keys
      # * deleting its mfa devices
      # * deleting its signing certificates
      def delete!
        groups.clear
        access_keys.clear
        policies.clear
        mfa_devices.clear
        signing_certificates.clear
        login_profile.delete if login_profile.exists?
        delete
      end

      # Returns a collection that represents all policies for this user.
      #
      #     user.policies.each do |policy|
      #       puts policy.name
      #     end
      #
      # @return [PolicyCollection] Returns a collection that represents
      #   all policies for this user.
      def policies
        UserPolicyCollection.new(self)
      end

      # Returns a collection that represents the signing certificates
      # belonging to this user.
      #
      #     user.signing_certificates.each do |cert|
      #       # ...
      #     end
      #
      # If you need to access the signing certificates of this AWS account,
      # see {IAM#signing_certificates}.
      #
      # @return [SigningCertificateCollection] Returns a collection that
      #   represents signing certificates for this user.
      def signing_certificates
        SigningCertificateCollection.new(:user => self, :config => config)
      end

      # @return [MFADeviceCollection] Returns a collection that represents
      #   all MFA devices assigned to this user.
      def mfa_devices
        MFADeviceCollection.new(self)
      end

      # A login profile is a user name and password that enables a
      # user to log in to the {http://aws.amazon.com/console AWS
      # Management Console}.  The object returned by this method
      # allows you to set or delete the password.  For example:
      #
      #     user.login_profile.password = "TheNewPassword"
      #
      # @return [LoginProfile] Returns the login profile for this user.
      def login_profile
        LoginProfile.new(self)
      end

      # Returns a collection that represents the access keys for this user.
      #
      #     user.access_keys.each do |access_key|
      #       puts access_key.id
      #     end
      #
      # @return [AccessKeyCollection] Returns a collection that represents all
      #   access keys for this user.
      def access_keys
        AccessKeyCollection.new(:user => self)
      end

      # Returns a collection that includes all of the groups the user is in.
      # @return [UserGroupCollection]
      def groups
        UserGroupCollection.new(self)
      end

      # @api private
      protected
      def resource_identifiers
        [[:user_name, name]]
      end

    end
  end
end
