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

require 'rexml/document'

module AWS
  class S3

    # Provides a method to {Bucket} and {S3Object} that parses a wide
    # range of ACL options.
    # @api private
    module ACLOptions

      protected

      # @param [Symbol,String,Hash,AccessControlList] acl Accepts an ACL
      #   description in one of the following formats:
      #
      #   ==== Canned ACL
      #
      #   S3 supports a number of canned ACLs for buckets and
      #   objects.  These include:
      #
      #   * `:private`
      #   * `:public_read`
      #   * `:public_read_write`
      #   * `:authenticated_read`
      #   * `:bucket_owner_read` (object-only)
      #   * `:bucket_owner_full_control` (object-only)
      #   * `:log_delivery_write` (bucket-only)
      #
      #   Here is an example of providing a canned ACL to a bucket:
      #
      #       s3.buckets['bucket-name'].acl = :public_read
      #
      #   ==== ACL Grant Hash
      #
      #   You can provide a hash of grants.  The hash is composed of grants (keys)
      #   and grantees (values).  Accepted grant keys are:
      #
      #   * `:grant_read`
      #   * `:grant_write`
      #   * `:grant_read_acp`
      #   * `:grant_write_acp`
      #   * `:grant_full_control`
      #
      #   Grantee strings (values) should be formatted like some of the
      #   following examples:
      #
      #       id="8a6925ce4adf588a4532142d3f74dd8c71fa124b1ddee97f21c32aa379004fef"
      #       uri="http://acs.amazonaws.com/groups/global/AllUsers"
      #       emailAddress="xyz@amazon.com"
      #
      #   You can provide a comma delimited list of multiple grantees in a single
      #   string.  Please note the use of quotes inside the grantee string.
      #   Here is a simple example:
      #
      #       { :grant_full_control => "emailAddress=\"foo@bar.com\", id=\"abc..mno\"" }
      #
      #   See the S3 API documentation for more information on formatting
      #   grants.
      #
      #   ==== AcessControlList Object
      #
      #   You can build an ACL using the {AccessControlList} class and
      #   pass this object.
      #
      #       acl = AWS::S3::AccessControlList.new
      #       acl.grant(:full_control).to(:canonical_user_id => "8a6...fef")
      #       acl #=> this is acceptible
      #
      #   ==== ACL XML String
      #
      #   Lastly you can build your own ACL XML document and pass it as a string.
      #
      #       <<-XML
      #         <AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      #           <Owner>
      #             <ID>8a6...fef</ID>
      #             <DisplayName>owner-display-name</DisplayName>
      #           </Owner>
      #           <AccessControlList>
      #             <Grant>
      #               <Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="Canonical User">
      #                 <ID>8a6...fef</ID>
      #                 <DisplayName>owner-display-name</DisplayName>
      #               </Grantee>
      #               <Permission>FULL_CONTROL</Permission>
      #             </Grant>
      #           </AccessControlList>
      #         </AccessControlPolicy>
      #       XML
      #
      # @return [Hash] Returns a hash of options suitable for
      #   passing to {Client#put_bucket_acl} and {Client#put_object_acl}
      #   with a mixture of ACL options.
      #
      def acl_options acl
        case acl
        when Symbol
          { :acl => acl.to_s.tr('_', '-') }
        when String
          # Strings are either access control policies (xml strings)
          # or they are canned acls
          xml?(acl) ?
            { :access_control_policy => acl } :
            { :acl => acl }
        when AccessControlList
            { :access_control_policy => acl.to_xml }
        when Hash
          # Hashes are either grant hashes or constructor args for an
          # access control list (deprecated)
          grant_hash?(acl) ?
            format_grants(acl) :
            { :access_control_policy => AccessControlList.new(acl).to_xml }
        else
          # failed to parse the acl option
          msg = "expected a canned ACL, AccessControlList object, ACL "
                "XML string or a grants hash"
          raise ArgumentError, msg
        end
      end

      # @param [Hash] acl_hash
      # @return [Boolean] Retursn `true` if this hash is a hash of grants.
      def grant_hash? acl_hash
        grant_keys = [
          :grant_read,
          :grant_write,
          :grant_read_acp,
          :grant_write_acp,
          :grant_full_control,
        ]
        acl_hash.keys.all?{|key| grant_keys.include?(key) }
      end

      # @param [String] acl_string
      # @return [Boolean] Returns `true` if this string is an xml document.
      def xml? acl_string
        begin
          REXML::Document.new(acl_string).has_elements?
        rescue
          false
        end
      end

      # @param [Hash] acl_hash
      # @return [Hash] Returns a hash of grant options suitable for
      #   passing to the various S3 client methods that accept ACL grants.
      def format_grants acl_hash
        grants = {}
        acl_hash.each_pair do |grant,grantees|
          grantees = [grantees] unless grantees.is_a?(Array)
          grants[grant] = grantees.map{|g| format_grantee(g) }.join(', ')
        end
        grants
      end

      def format_grantee grantee
        case grantee
        when String then grantee
        when Hash

          if grantee.keys.count != 1
            msg = "grantee hashes must have exactly 1 key"
            raise ArgumentError, msg
          end

          # A granee hash looks like:
          #
          #     { :id => 'abc...fec' }
          #     { :uri => 'http://abc.com/foo' }
          #     { :email_address => 'xyz@amazon.com }
          #
          # It needs to look like
          #
          #     'id="abc...fec"'
          #     'uri="http://abc.com/foo"'
          #     'emailAddress="xyz@amazon.com"'
          type, token = grantee.to_a.flatten
          type = type.to_s.split('_').map{|part| ucfirst(part) }.join
          "#{type[0,1].downcase}#{type[1..-1]}=\"#{token}\""
        else
          raise ArgumentError, "grantees must be a string or a hash"
        end
      end

      def ucfirst str
        str[0,1].upcase + str[1..-1]
      end

    end
  end
end
