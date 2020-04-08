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

    # A login profile is a user name and password that enables a user
    # to log in to the {http://aws.amazon.com/console AWS Management
    # Console}. Without a login profile, a user cannot access the
    # console. (For information about accessing and using the AWS
    # Management Console, see
    # {http://docs.aws.amazon.com/IAM/latest/UserGuide/Using_AWSManagementConsole.html
    # Using the AWS Management Console}.)
    #
    # @example Setting a password for a user's login profile
    #   user.login_profile.password = "TheNewPassword"
    #
    # @example Deleting the login profile for a user
    #   user.login_profile.delete
    #
    class LoginProfile < Resource

      # @api private
      def initialize(user, opts = {})
        @user = user
        super
      end

      # @attr_reader [User] The user to which this login profile
      #   belongs.
      attr_reader :user

      # @attr_reader [Time] The time at which the login profile was
      #   created.
      attribute :create_date

      # Sets a new password for the login profile, creating the
      # profile if no profile currently exists for the user.
      #
      # @param [String] password The new password for the user.
      def password=(password)
        options = resource_options(:password => password)
        client.update_login_profile(options)
        password
      rescue Errors::NoSuchEntity => e
        client.create_login_profile(options)
        password
      end

	  # Set whether a user needs to update their password when they next signin.
	  #
	  # @param [Boolean] bool If the password needs to be reset on next login
	  def password_reset_required=(bool)
		  options = resource_options(:password_reset_required => bool)
		  client.update_login_profile(options)
		  bool
	  rescue Errors::NoSuchEntity => e
		 # a password has to be set for us to be able to create a login_profile :(
		  raise ArgumentError, "Unable force password reset when no password is set"
	  end

      # Deletes the login profile for the specified user, which
      # terminates the user's ability to access AWS services through
      # the IAM login page.
      #
      # @note Deleting a user's login profile does not prevent a user
      #   from accessing IAM through the command line interface or the
      #   API. To prevent all user access you must also either make
      #   the access key inactive or delete it. For more information
      #   about making keys inactive or deleting them, see
      #   {User#access_keys}.
      #
      # @return [nil]
      #
      def delete
        client.delete_login_profile(resource_options)
        nil
      end

      # @return [Boolean] True if a login profile exists for the user.
      def exists?
        client.get_login_profile(resource_options)
      rescue Errors::NoSuchEntity => e
        false
      else
        true
      end

      populates_from(:get_login_profile, :create_login_profile) do |resp|
        resp.login_profile if resp.login_profile.user_name == user.name
      end

      protected
      def resource_identifiers
        [[:user_name, user.name]]
      end

    end

  end
end
