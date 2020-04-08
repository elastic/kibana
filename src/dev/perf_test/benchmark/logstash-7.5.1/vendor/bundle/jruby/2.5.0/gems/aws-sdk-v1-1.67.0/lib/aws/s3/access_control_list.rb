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
  class S3

    # Represents an access control list for S3 objects and buckets.  For example:
    #
    #     acl = AccessControlList.new
    #     acl.grant(:full_control).
    #       to(:canonical_user_id => "8a6925ce4adf588a4f21c32aa379004fef")
    #     acl.to_xml                   # => '<AccessControlPolicy>...'
    #
    # You can also construct an AccessControlList from a hash:
    #
    #     AccessControlList.new(
    #       :owner => { :id => "8a6925ce4adf588a4f21c32aa379004fef" },
    #       :grants => [{
    #         :grantee => { :canonical_user_id => "8a6925ce4adf588a4f21c32aa379004fef" },
    #         :permission => :full_control,
    #       }]
    #     )
    #
    # @see ACLObject
    #
    # @attr [AccessControlList::Owner] owner The owner of the access
    #   control list.  You can set this as a hash, for example:
    #    acl.owner = { :id => '8a6925ce4adf588a4f21c32aa379004fef' }
    #   This attribute is required when setting an ACL.
    #
    # @attr [list of AccessControlList::Grant] grants The list of
    #   grants.  You can set this as a list of hashes, for example:
    #
    #       acl.grants = [{
    #         :grantee => { :canonical_user_id => "8a6925ce4adf588a4f21c32aa379004fef" },
    #         :permission => :full_control,
    #       }]
    class AccessControlList

      # Represents an ACL owner.  In the default ACL, this is the
      # bucket owner.
      #
      # @attr [String] id The canonical user ID of the ACL owner.
      #   This attribute is required when setting an ACL.
      #
      # @attr [String] display_name The display name of the ACL
      #   owner.  This value is ignored when setting an ACL.
      class Owner
        include ACLObject

        string_attr "ID", :required => true
        string_attr "DisplayName"
      end

      # Represents a user who is granted some kind of permission
      # through a Grant.  There are three ways to specify a grantee:
      #
      # * You can specify the canonical user ID, for example.  When
      #   you read an ACL from S3, all grantees will be identified
      #   this way, and the display_name attribute will also be provided.
      #
      #       Grantee.new(:canonical_user_id => "8a6925ce4adf588a4f21c32aa379004fef")
      #
      # * You can specify the e-mail address of an AWS customer, for example:
      #
      #       Grantee.new(:amazon_customer_email => 'foo@example.com')
      #
      # * You can specify a group URI, for example:
      #
      #        Grantee.new(:group_uri => 'http://acs.amazonaws.com/groups/global/AllUsers')
      #
      #   For more details about group URIs, see:
      #   http://docs.aws.amazon.com/AmazonS3/latest/dev/ACLOverview.html
      #
      # When constructing a grantee, you must provide a value for
      # exactly one of the following attributes:
      #
      # * `amazon_customer_email`
      # * `canonical_user_id`
      # * `group_uri`
      #
      # @attr [String] amazon_customer_email The e-mail address of
      #   an AWS customer.
      #
      # @attr [String] canonical_user_id The canonical user ID of an
      #   AWS customer.
      #
      # @attr [String] group_uri A URI that identifies a particular
      #   group of users.
      #
      # @attr [String] display_name The display name associated with
      #   the grantee.  This is provided by S3 when reading an ACL.
      class Grantee
        include ACLObject

        SIGNAL_ATTRIBUTES = [
          :amazon_customer_email,
          :canonical_user_id,
          :group_uri,
          :uri,
        ]

        string_attr "EmailAddress", :method_name => "amazon_customer_email"
        string_attr "ID", :method_name => "canonical_user_id"
        string_attr "URI", :method_name => "group_uri"
        string_attr "URI", :method_name => "uri"
        string_attr "DisplayName"

        # (see ACLObject#validate!)
        def validate!
          attr = signal_attribute
          raise "missing amazon_customer_email, canonical_user_id, "+
            "or group_uri" unless attr
          raise "display_name is invalid with #{attr}" if
            attr != :canonical_user_id and display_name
        end

        # @api private
        def stag
          if attr = signal_attribute
            super + " xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"" +
              " xsi:type=\"#{type_for_attr(attr)}\""
          else
            super
          end
        end

        # @api private
        def signal_attribute
          SIGNAL_ATTRIBUTES.find { |att| send(att) }
        end

        # @api private
        def type_for_attr(attr)
          {
            :amazon_customer_email => "AmazonCustomerByEmail",
            :canonical_user_id => "CanonicalUser",
            :group_uri => "Group",
            :uri => "Group",
          }[attr]
        end

      end

      # Represents the permission being granted in a Grant object.
      # Typically you will not need to construct an instance of this
      # class directly.
      # @see Grant#permission
      class Permission
        include ACLObject

        # The permission expressed as a symbol following Ruby
        # conventions.  For example, S3's FULL_CONTROL permission
        # will be returned as `:full_control`.
        attr_reader :name

        # @api private
        def initialize(name)
          raise "expected string or symbol" unless
            name.respond_to?(:to_str) or name.respond_to?(:to_sym)
          @name = name.to_sym
        end

        def body_xml
          name.to_s.upcase
        end

      end

      # Represents a single grant in an ACL.  Both `grantee` and
      # `permission` are required for each grant when setting an
      # ACL.
      #
      # See
      # http://docs.aws.amazon.com/AmazonS3/latest/dev/ACLOverview.html
      # for more information on how grantees and permissions are
      # interpreted by S3.
      #
      # @attr [Grantee] grantee The user or users who are granted
      #   access according to this grant.  You can specify this as a
      #   hash:
      #
      #       grant.grantee = { :amazon_customer_email => "foo@example.com" }
      #
      # @attr [Permission or Symbol] permission The type of
      #   permission that is granted by this grant.  Valid values are:
      #   * `:read`
      #   * `:write`
      #   * `:read_acp`
      #   * `:write_acp`
      #   * `:full_control`
      class Grant

        include ACLObject

        object_attr Grantee, :required => true
        object_attr Permission, :required => true, :cast => Symbol

      end

      include ACLObject

      # @api private
      def stag
        super()+" xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\""
      end

      # @api private
      def element_name
        "AccessControlPolicy"
      end

      class GrantBuilder

        # @api private
        def initialize(acl, grant)
          @acl = acl
          @grant = grant
        end

        # Specifies the grantee.
        #
        # @param [Grantee or Hash] grantee A Grantee object or hash;
        #   for example:
        #
        #       acl.grant(:full_control).to(:amazon_customer_email => "foo@example.com")
        def to(grantee)
          @grant.grantee = grantee
          @acl.grants << @grant
        end

      end

      # Convenience method for constructing a new grant and adding
      # it to the ACL.
      #
      # @example
      #
      #   acl.grants.size # => 0
      #   acl.grant(:full_control).to(:canonical_user_id => "8a6925ce4adf588a4f21c32aa379004fef")
      #   acl.grants.size # => 1
      #
      # @return [GrantBuilder]
      def grant(permission)
        GrantBuilder.new(self, Grant.new(:permission => permission))
      end

      object_attr Owner, :required => true
      object_list_attr("AccessControlList", Grant,
                       :required => true, :method_name => :grants)

    end

  end
end
