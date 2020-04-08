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

require 'aws/core'
require 'aws/sts/config'

module AWS

  # This class is a starting point for working with the AWS Security
  # Token Service.  The AWS Security Token Service is a web service
  # that enables you to request temporary, limited-privilege
  # credentials for users that you authenticate (federated users), or
  # IAM users.
  #
  # @example Getting temporary credentials and using them to make an EC2 request
  #
  #   sts = AWS::STS.new(:access_key_id => "LONG_TERM_KEY",
  #                      :secret_access_key => "LONG_TERM_SECRET")
  #   session = sts.new_session(:duration => 60*60)
  #   ec2 = AWS::EC2.new(session.credentials)
  #   ec2.instances.to_a
  #
  # @example Getting temporary credentials with restricted permissions
  #
  #   policy = AWS::STS::Policy.new
  #   policy.allow(:actions => ["s3:*", "ec2:*"],
  #                :resources => :any)
  #   session = sts.new_federated_session("TemporaryUser", :policy => policy)
  #   ec2 = AWS::EC2.new(session.credentials)
  #   ec2.instances.to_a
  #
  # @!attribute [r] client
  #   @return [Client] the low-level STS client object
  class STS

    autoload :Client, 'aws/sts/client'
    autoload :Errors, 'aws/sts/errors'
    autoload :FederatedSession, 'aws/sts/federated_session'
    autoload :Policy, 'aws/sts/policy'
    autoload :Session, 'aws/sts/session'

    include Core::ServiceInterface

    endpoint_prefix 'sts', :global => true

    # (see Client#assume_role)
    def assume_role options = {}
      client.assume_role(options).data
    end

    # Returns a set of temporary credentials for an AWS account or IAM
    # User. The credentials consist of an Access Key ID, a Secret
    # Access Key, and a security token. These credentials are valid
    # for the specified duration only. The session duration for IAM
    # users can be between one and 36 hours, with a default of 12
    # hours. The session duration for AWS account owners is restricted
    # to one hour.
    #
    # @param [Hash] opts Options for getting temporary credentials.
    #
    # @option opts [Integer] :duration The duration, in seconds, that
    #   the session should last. Acceptable durations for IAM user
    #   sessions range from 3600s (one hour) to 129600s (36 hours),
    #   with 43200s (12 hours) as the default. Sessions for AWS
    #   account owners are restricted to a maximum of 3600s (one
    #   hour).
    #
    # @option opts [String] :serial_number The identification number of the
    #   Multi-Factor Authentication (MFA) device for the user.
    #
    # @option opts [String] :token_code The value provided by the MFA device.
    #   If the user has an access policy requiring an MFA code, provide the
    #   value here to get permission to resources as specified in the access
    #   policy.
    #
    # @return [Session]
    def new_session(opts = {})
      get_session(:get_session_token, opts) do |resp, session_opts|
        Session.new(session_opts)
      end
    end

    # Returns a set of temporary credentials for a federated user with
    # the user name and policy specified in the request. The
    # credentials consist of an Access Key ID, a Secret Access Key,
    # and a security token. The credentials are valid for the
    # specified duration, between one and 36 hours.
    #
    # The federated user who holds these credentials has only those
    # permissions allowed by intersection of the specified policy and
    # any resource or user policies that apply to the caller of the
    # GetFederationToken API. For more information about how token
    # permissions work, see
    # {http://docs.aws.amazon.com/IAM/latest/UserGuide/TokenPermissions.html
    # Controlling Token Permissions} in Using AWS Identity and Access
    # Management.
    #
    # @param [String] name The name of the federated user associated
    #   with the session.  Must be between 2 and 32 characters in
    #   length.
    #
    # @param [Hash] opts Options for getting temporary credentials.
    #
    # @option opts [Integer] :duration The duration, in seconds, that
    #   the session should last. Acceptable durations for federation
    #   sessions range from 3600s (one hour) to 129600s (36 hours),
    #   with one hour as the default.
    #
    # @option opts [String, AWS::STS::Policy] :policy A policy
    #   specifying the permissions to associate with the session. The
    #   caller can delegate their own permissions by specifying a
    #   policy for the session, and both policies will be checked when
    #   a service call is made. In other words, permissions of the
    #   session credentials are the intersection of the policy
    #   specified in the API and the policies associated with the user
    #   who issued the session.
    #
    # @return [FederatedSession]
    #
    def new_federated_session(name, opts = {})
      opts = opts.merge(:name => name)
      case
      when opts[:policy].kind_of?(String) || !opts[:policy]
        # leave it alone
      when opts[:policy].respond_to?(:to_json)
        opts[:policy] = opts[:policy].to_json
      end
      get_session(:get_federation_token, opts) do |resp, session_opts|
        session_opts.merge!(
          :user_id => resp[:federated_user][:federated_user_id],
          :user_arn => resp[:federated_user][:arn],
          :packed_policy_size => resp[:packed_policy_size]
        )
        FederatedSession.new(session_opts)
      end
    end

    protected

    def get_session(method, opts = {})
      opts[:duration_seconds] = opts.delete(:duration) if
        opts[:duration]
      resp = client.send(method, opts)
      credentials = resp[:credentials].dup
      session_opts = {
        :credentials => credentials,
        :expires_at => credentials.delete(:expiration),
      }
      yield(resp, session_opts)
    end

  end

end
