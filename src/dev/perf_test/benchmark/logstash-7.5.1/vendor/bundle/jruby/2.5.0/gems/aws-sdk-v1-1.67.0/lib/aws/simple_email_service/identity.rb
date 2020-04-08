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
  class SimpleEmailService

    # @attr_reader [String] verification_status
    #
    # @attr_reader [String,nil] verification_token
    #
    # @attr [String] bounce_topic_arn
    #
    # @attr [String] complaint_topic_arn
    #
    # @attr [Boolean] forwarding_enabled When `false`, complaint and bounce
    #   notifications will not be forwarded via email.  Can only be set to
    #   `false` when there is both a `bounce_topic` and `complaint_topic`.
    #
    # @attr [Boolean] dkim_enabled When set to `true`, Easy DKIM signing will
    #   be enabled for email sent from this identity.
    #
    # @attr_reader [Array<String>] dkim_tokens Returns a set of DNS records,
    #   or tokens, that must be published in the domain name's DNS to
    #   complete the DKIM verification process.  Call {#verify_dkim} if this
    #   returns an empty list.
    #
    # @attr_reader [String] dkim_verification_status
    #
    class Identity < Core::Resource

      # @api private
      def initialize email_address_or_domain, options = {}
        @identity = email_address_or_domain
        super
      end

      # @return [String] Returns the email address or domain name for
      #   this identity.
      attr_reader :identity

      attribute :verification_status

      attribute :verification_token, :static => true

      mutable_attribute :dkim_enabled, :alias => :dkim_enabled?

      attribute :dkim_tokens

      attribute :dkim_verification_status

      mutable_attribute :delivery_topic_arn, :from => :delivery_topic

      mutable_attribute :bounce_topic_arn, :from => :bounce_topic

      mutable_attribute :complaint_topic_arn, :from => :complaint_topic

      mutable_attribute :forwarding_enabled

      alias_method :forwarding_enabled?, :forwarding_enabled

      provider(:get_identity_verification_attributes) do |provider|
        provider.provides :verification_token
        provider.provides :verification_status
        provider.find{|resp| resp[:verification_attributes][identity] }
      end

      provider(:get_identity_notification_attributes) do |provider|
        provider.provides :delivery_topic_arn
        provider.provides :bounce_topic_arn
        provider.provides :complaint_topic_arn
        provider.provides :forwarding_enabled
        provider.find{|resp| resp[:notification_attributes][identity] }
      end

      provider(:get_identity_dkim_attributes) do |provider|
        provider.provides :dkim_enabled
        provider.provides :dkim_verification_status
        provider.provides :dkim_tokens
        provider.find{|resp| resp[:dkim_attributes][identity] }
      end

      # @return [Array<String>] Returns an array of DKIM tokens.
      def verify_dkim
        if domain?
          resp = client.verify_domain_dkim(:domain => identity)
          resp[:dkim_tokens]
        else
          raise "unable to verify dkim for an email address"
        end
      end

      # @param [String,SNS::Topic] topic The topic (ARN string or topic
      #   object) that delivery notifications should be published to.
      def delivery_topic= topic
        arn = topic.respond_to?(:arn) ? topic.arn : topic
        self.delivery_topic_arn = arn
      end

      # @return [SNS::Topic,nil]
      def delivery_topic
        if arn = delivery_topic_arn
          SNS::Topic.new(arn, :config => config)
        end
      end

      # @param [String,SNS::Topic] topic The topic (ARN string or topic
      #   object) that bounce notifications should be published to.
      def bounce_topic= topic
        arn = topic.respond_to?(:arn) ? topic.arn : topic
        self.bounce_topic_arn = arn
      end

      # @return [SNS::Topic,nil]
      def bounce_topic
        if arn = bounce_topic_arn
          SNS::Topic.new(arn, :config => config)
        end
      end

      # @param [String,SNS::Topic] topic The topic (ARN string or topic
      #   object) that complaint notifications should be published to.
      def complaint_topic= topic
        arn = topic.respond_to?(:arn) ? topic.arn : topic
        self.complaint_topic_arn = arn
      end

      # @return [SNS::Topic,nil]
      def complaint_topic
        if arn = complaint_topic_arn
          SNS::Topic.new(arn, :config => config)
        end
      end

      # @return [Boolean] Returns `true` if this {Identity} represents an
      #   email address.
      def email_address?
        identity.match(/@/) ? true : false
      end

      # @return [Boolean] Returns `true` if this {Identity} represents a
      #   domain.
      def domain?
        !email_address?
      end

      # @return [Boolean] Returns `true` if this email address/domain has
      #   been verified.
      def verified?
        verification_status == 'Success'
      end

      # @return [Boolean] Returns `true` if verification for this email
      #   address/domain is still pending.
      def pending?
        verification_status == 'Pending'
      end

      # Deletes the current identity.
      # @return [nil]
      def delete
        client.delete_identity(:identity => identity)
        nil
      end

      # @return [Boolean] Returns true if the identity exists.
      def exists?
        options = { :identities => [identity] }
        resp = client.get_identity_verification_attributes(options)
        !!resp[:verification_attributes][identity]
      end

      protected

      def resource_identifiers
        [[:identity, identity]]
      end

      def get_resource attr

        method_name =
          case attr.name.to_s
          when /dkim/         then :get_identity_dkim_attributes
          when /verification/ then :get_identity_verification_attributes
          else                     :get_identity_notification_attributes
          end

        client.send(method_name, :identities => [identity])

      end

      def update_resource attr, value
        client_opts = {}
        client_opts[:identity] = identity
        case attr.name
        when :delivery_topic_arn
            method = :set_identity_notification_topic
            client_opts[:notification_type] = 'Delivery'
            client_opts[:sns_topic] = value if value
        when :bounce_topic_arn
          method = :set_identity_notification_topic
          client_opts[:notification_type] = 'Bounce'
          client_opts[:sns_topic] = value if value
        when :complaint_topic_arn
          method = :set_identity_notification_topic
          client_opts[:notification_type] = 'Complaint'
          client_opts[:sns_topic] = value if value
        when :forwarding_enabled
          method = :set_identity_feedback_forwarding_enabled
          client_opts[:forwarding_enabled] = value
        when :dkim_enabled
          method = :set_identity_dkim_enabled
          client_opts[:dkim_enabled] = value
        else raise "unhandled attribute: #{attr.name}"
        end
        client.send(method, client_opts)
      end

    end
  end
end
