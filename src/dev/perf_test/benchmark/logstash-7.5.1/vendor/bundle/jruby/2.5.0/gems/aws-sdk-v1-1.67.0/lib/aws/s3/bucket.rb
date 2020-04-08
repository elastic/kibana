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

    # Represents a bucket in S3.
    #
    # # Creating Buckets
    #
    # You create a bucket by name.  Bucket names must be globally unique
    # and must be DNS compatible.
    #
    #     s3 = AWS::S3.new
    #     bucket = s3.buckets.create('dns-compat-bucket-name')
    #
    # # Getting a Bucket
    #
    # You can create a reference to a bucket, given its name.
    #
    #     bucket = s3.buckets['bucket-name'] # makes no request
    #     bucket.exists? #=> returns true/false
    #
    # # Enumerating Buckets
    #
    # The {BucketCollection} class is enumerable.
    #
    #     s3.buckets.each do |bucket|
    #       puts bucket.name
    #     end
    #
    # # Deleting a Bucket
    #
    # You can delete an empty bucket you own.
    #
    #     bucket = s3.buckets.create('my-temp-bucket')
    #     bucket.objects['abc'].write('xyz')
    #
    #     bucket.clear! # deletes all object versions in batches
    #     bucket.delete
    #
    # You can alternatively call {#delete!} which will clear
    # the bucket for your first.
    #
    #     bucket.delete!
    #
    # # Objects
    #
    # Given a bucket you can access its objects, either by key or by
    # enumeration.
    #
    #     bucket.objects['key'] #=> makes no request, returns an S3Object
    #
    #     bucket.objects.each do |obj|
    #       puts obj.key
    #     end
    #
    # See {ObjectCollection} and {S3Object} for more information on working
    # with objects.
    #
    # # Website Configuration
    #
    # It is easy to enable website hosting for a bucket.
    #
    #     bucket.configure_website
    #
    # You can specify the index and error documents by passing a block.
    # If your bucket is already configured as a website, the current
    # configuration will be yielded.  If you bucket it not currently
    # configured as a website, a new configuration will be yielded
    # with default values.
    #
    #     bucket.configure_website do |cfg|
    #       cfg.index_document_suffix = 'index.html'
    #       cfg.error_document_key = 'error.html'
    #     end
    #
    # You can disable website hosting two ways:
    #
    #     bucket.remove_website_configuration
    #     bucket.website_configuration = nil
    #
    # You can use {#website_configuration=} to copy a website configuration
    # from one bucket to another.
    #
    #     bucket.website_configuration = other_bucket.website_configuration
    #
    # # Bucket Policies and ACLs
    #
    # You can control access to your bucket and its contents a number
    # of ways.  You can specify a bucket ACL (access control list)
    # or a bucket policy.
    #
    # ## ACLs
    #
    # ACLs control access to your bucket and its contents via a list of
    # grants and grantees.
    #
    # ### Canned ACLs
    #
    # The simplest way to specify an ACL is to use one of Amazon's "canned"
    # ACLs.  Amazon accepts the following canned ACLs:
    #
    # * `:private`
    # * `:public_read`
    # * `:public_read_write`
    # * `:authenticated_read`
    # * `:bucket_owner_read`
    # * `:bucket_owner_full_control`
    #
    # You can specify a the ACL at bucket creation or later update a bucket.
    #
    #     # at create time, defaults to :private when not specified
    #     bucket = s3.buckets.create('name', :acl => :public_read)
    #
    #     # replacing an existing bucket ACL
    #     bucket.acl = :private
    #
    # ### Grants
    #
    # Alternatively you can specify a hash of grants.  Each entry in the
    # `:grant` hash has a grant (key) and a list of grantees (values).
    # Valid grant keys are:
    #
    # * `:grant_read`
    # * `:grant_write`
    # * `:grant_read_acp`
    # * `:grant_write_acp`
    # * `:grant_full_control`
    #
    # Each grantee can be a String, Hash or array of strings or hashes.
    # The following example uses grants to provide public read
    # to everyone while providing full control to a user by email address
    # and to another by their account id (cannonical user id).
    #
    #     bucket = s3.buckets.create('name', :grants => {
    #       :grant_read => [
    #         { :uri => "http://acs.amazonaws.com/groups/global/AllUsers" },
    #       ],
    #       :grant_full_control => [
    #         { :id => 'abc...mno' }               # cannonical user id
    #         { :email_address => 'foo@bar.com' }, # email address
    #       ]
    #     })
    #
    # ### ACL Object
    #
    # Lastly, you can build an ACL object and use a Ruby DSL to specify grants
    # and grantees.  See {ACLObject} for more information.
    #
    #     # updating an existing bucket acl using ACLObject
    #     bucket.acl.change do |acl|
    #       acl.grants.reject! do |g|
    #         g.grantee.canonical_user_id != bucket.owner.id
    #       end
    #     end
    #
    # ## Policies
    #
    # You can also work with bucket policies.
    #
    #     policy = AWS::S3::Policy.new
    #     policy.allow(
    #       :actions => [:put_object, :get_object]
    #       :resources => [bucket]
    #       :principals => :any)
    #
    #     bucket.policy = policy
    #
    # See {Core::Policy} and {S3::Policy} for more information on build
    # policy objects.
    #
    # # Versioned Buckets
    #
    # You can enable versioning on a bucket you control.  When versioning
    # is enabled, S3 will keep track of each version of each object you
    # write to the bucket (even deletions).
    #
    #     bucket.versioning_enabled? #=> false
    #     bucket.enable_versioning
    #     # there is also a #suspend_versioning method
    #
    #     obj = bucket.objects['my-obj']
    #     obj.write('a')
    #     obj.write('b')
    #     obj.delete
    #     obj.write('c')
    #
    #     obj.versions.each do |obj_version|
    #         if obj_version.delete_marker?
    #         puts obj_version.read
    #       else
    #         puts "- DELETE MARKER"
    #       end
    #     end
    #
    # Alternatively you can enumerate all versions of all objects in your
    # bucket.
    #
    #     bucket.versions.each do |obj_version|
    #       puts obj_version.key ` " : " ` obj_version.version_id
    #     end
    #
    # See {BucketVersionCollection}, {ObjectVersionCollection} and
    # {ObjectVersion} for more information on working with objects in
    # a versioned bucket.  Also see the S3 documentation for information
    # on object versioning.
    #
    class Bucket

      include Core::Model
      include ACLOptions

      # @param [String] name
      # @param [Hash] options
      # @option options [String] :owner (nil) The owner id of this bucket.
      def initialize(name, options = {})
        # the S3 docs disagree with what the service allows,
        # so it's not safe to toss out invalid bucket names
        # S3::Client.validate_bucket_name!(name)
        @name = name
        @owner = options[:owner]
        super
      end

      # @return [String] The bucket name
      attr_reader :name

      # Returns the url for this bucket.
      # @return [String] url to the bucket
      def url(options = {})
        protocol = options.fetch(:secure, false) ? "https://" : "http://"
        if client.dns_compatible_bucket_name?(name)
          "#{protocol}#{name}.s3.amazonaws.com/"
        else
          "#{protocol}s3.amazonaws.com/#{name}/"
        end
      end

      # @return [Boolean] Returns true if the bucket has no objects
      #   (this includes versioned objects that are delete markers).
      def empty?
        versions.first ? false : true
      end

      # @return [String,nil] Returns the location constraint for a bucket
      #   (if it has one), nil otherwise.
      def location_constraint
        client.get_bucket_location(:bucket_name => name).location_constraint
      end

      # Configure the current bucket as a website.
      #
      #     bucket.configure_website
      #
      # If you pass a block, the website configuration object
      # will be yielded.  You can modify it before it is saved.
      #
      #     bucket.configure_website do |cfg|
      #       cfg.index_document_suffix = 'index.html'
      #       cfg.error_document_key = 'error.html'
      #     end
      #
      # If the bucket already has a website configuration, it will be loaded
      # and yielded.  This makes it possible to modify an existing
      # configuration.
      #
      #     # only rename the error document
      #     bucket.configure_website do |cfg|
      #       cfg.error_document_key = 'oops.html'
      #     end
      #
      # @yieldparam [WebsiteConfiguration] website_config
      # @return [WebsiteConfiguration]
      # @see #website_configuration
      # @see #website_configuration=
      # @see #remove_website_configuration
      # @see #website?
      def configure_website &block
        website_config = self.website_configuration
        website_config ||= WebsiteConfiguration.new
        yield(website_config) if block_given?
        self.website_configuration = website_config
      end

      # Returns the bucket website configuration. Returns `nil` if the bucket
      # is not configured as a website.
      # @return [WebsiteConfiguration,nil]
      # @see #configure_website
      # @see #website_configuration=
      # @see #remove_website_configuration
      # @see #website?
      def website_configuration
        resp = client.get_bucket_website(:bucket_name => name)
        WebsiteConfiguration.new(resp.data)
      rescue Errors::NoSuchWebsiteConfiguration
        nil
      end

      # Sets the website configuration.  Deletes the configuration if
      # `nil` is passed.
      # @param [WebsiteConfiguration,nil] website_configuration
      # @see #configure_website
      # @see #website_configuration
      # @see #remove_website_configuration
      # @see #website?
      def website_configuration= website_configuration
        if website_configuration
          client_opts = website_configuration.to_hash
          client_opts[:bucket_name] = name
          client.put_bucket_website(client_opts)
        else
          remove_website_configuration
        end
      end

      # @return [nil] Deletes the bucket website configuration.
      # @see #configure_website
      # @see #website_configuration
      # @see #website_configuration=
      # @see #website?
      def remove_website_configuration
        client.delete_bucket_website(:bucket_name => name)
        @website_configuration = false
        nil
      end

      # @return [Boolean] Returns `true` if this bucket is configured as
      #   a website.
      # @see #configure_website
      # @see #website_configuration
      # @see #website_configuration=
      # @see #remove_website_configuration
      def website?
        !!website_configuration
      end

      # Returns the tags for this bucket.
      #
      #     tags = bucket.tags
      #     #=> <AWS::S3::BucketTagCollection>
      #
      #     # adds a tag to the bucket
      #     tags['foo'] = 'abc'
      #
      #     # replaces all tags
      #     tags.set('new' => 'tags')
      #
      #     # removes all tags from the bucket
      #     tags.clear
      #
      #     # returns tags as a hash
      #     tags.to_h
      #
      # @return [BucketTagCollection] Returns a collection that represents
      #   the tags for this bucket.
      #
      def tags
        BucketTagCollection.new(self)
      end

      # Sets the tags for this bucket.
      #
      #     bucket.tags = { 'contents' => 'photots' }
      #
      # You can remove all tags for the bucket by passing an empty
      # hash or `nil`.
      #
      #     bucket.tags = nil # {} also deletes all tags
      #     bucket.tags
      #     #=> {}
      #
      # @param [Hash,nil] tags The tags to set on this bucket.
      #
      def tags= tags
        self.tags.set(tags)
      end

      # @return [CORSRuleCollection] Returns a collection that can be
      #   used to manage (add, edit and delete) CORS rules for this bucket.
      def cors
        CORSRuleCollection.new(self)
      end

      # Sets the bucket CORS rules.
      # @param (see CORSRuleCollection#set)
      # @see CORSRuleCollection#set
      def cors= *rules
        self.cors.set(*rules)
      end

      # Enables versioning on this bucket.
      #
      # @option opts [String] :mfa_delete Set to 'Enabled' or 'Disabled'
      #   to control the state of MFA delete on the bucket versioning.
      #   Setting this option requires the :mfa option to also be set.
      #
      # @option opts [String] :mfa The serial number and current token code of
      #   the Multi-Factor Authentication (MFA) device for the user. Format
      #   is "SERIAL TOKEN" - with a space between the serial and token.
      #
      # @return [nil]
      def enable_versioning(opts = {})
        client.set_bucket_versioning(
          :bucket_name => @name,
          :state       => :enabled,
          :mfa_delete  => opts[:mfa_delete],
          :mfa         => opts[:mfa])
        nil
      end

      # Suspends versioning on this bucket.
      #
      # @option opts [String] :mfa_delete Set to 'Enabled' or 'Disabled'
      #   to control the state of MFA delete on the bucket versioning.
      #   Setting this option requires the :mfa option to also be set.
      #
      # @option opts [String] :mfa The serial number and current token code of
      #   the Multi-Factor Authentication (MFA) device for the user. Format
      #   is "SERIAL TOKEN" - with a space between the serial and token.
      #
      # @return [nil]
      def suspend_versioning(opts = {})
        client.set_bucket_versioning(
          :bucket_name => @name,
          :state       => :suspended,
          :mfa_delete  => opts[:mfa_delete],
          :mfa         => opts[:mfa])
        nil
      end

      # @return [Boolean] returns `true` if version is enabled on this bucket.
      def versioning_enabled?
        versioning_state == :enabled
      end
      alias_method :versioned?, :versioning_enabled?

      # Returns the versioning status for this bucket.  States include:
      #
      # * `:enabled` - currently enabled
      # * `:suspended` - currently suspended
      # * `:unversioned` - versioning has never been enabled
      #
      # @return [Symbol] the versioning state
      def versioning_state
        client.get_bucket_versioning(:bucket_name => @name).status
      end

      # Deletes all objects from this bucket.
      # @return [nil]
      def clear!
        versions.each_batch do |versions|
          objects.delete(versions)
        end
      end

      # Deletes the current bucket.  An error will be raised if the
      # bucket is not empty.
      # @return [nil]
      def delete
        client.delete_bucket(:bucket_name => @name)
        nil
      end

      # Deletes all objects in a bucket and then deletes the bucket.
      # @return [nil]
      def delete!
        clear!
        delete
      end

      # @return [String] bucket owner id
      def owner
        @owner || client.list_buckets.owner
      end

      # @api private
      def inspect
        "#<AWS::S3::Bucket:#{name}>"
      end

      # @return [Boolean] Returns true if the two buckets have the same name.
      def ==(other)
        other.kind_of?(Bucket) && other.name == name
      end

      # @return [Boolean] Returns true if the two buckets have the same name
      def eql?(other_bucket)
        self == other_bucket
      end

      # @note This method only indicates if there is a bucket in S3, not
      #   if you have permissions to work with the bucket or not.
      # @return [Boolean] Returns true if the bucket exists in S3.
      def exists?
        begin
          versioned? # makes a get bucket request without listing contents
                     # raises a client error if the bucket doesn't exist or
                     # if you don't have permission to get the bucket
                     # versioning status.
          true
        rescue Errors::NoSuchBucket => e
          false # bucket does not exist
        rescue Errors::AccessDenied => e
          true # bucket exists
        end
      end

      # @return [ObjectCollection] Represents all objects(keys) in
      #   this bucket.
      def objects
        ObjectCollection.new(self)
      end

      # @return [BucketVersionCollection] Represents all of the versioned
      #   objects stored in this bucket.
      def versions
        BucketVersionCollection.new(self)
      end

      # @return [MultipartUploadCollection] Represents all of the
      #   multipart uploads that are in progress for this bucket.
      def multipart_uploads
        MultipartUploadCollection.new(self)
      end

      # @api private
      module ACLProxy

        attr_accessor :bucket

        def change
          yield(self)
          bucket.acl = self
        end

      end

      # Returns the bucket's access control list.  This will be an
      # instance of AccessControlList, plus an additional `change`
      # method:
      #
      #     bucket.acl.change do |acl|
      #       acl.grants.reject! do |g|
      #         g.grantee.canonical_user_id != bucket.owner.id
      #       end
      #     end
      #
      # @return [AccessControlList]
      def acl

        resp = client.get_bucket_acl(:bucket_name => name)

        acl = AccessControlList.new(resp.data)
        acl.extend ACLProxy
        acl.bucket = self
        acl

      end

      # Sets the bucket's ACL (access control list).  You can provide an ACL
      # in a number of different formats.
      # @param (see ACLOptions#acl_options)
      # @return [nil]
      def acl= acl
        client.set_bucket_acl(acl_options(acl).merge(:bucket_name => name))
        nil
      end

      # @api private
      module PolicyProxy

        attr_accessor :bucket

        def change
          yield(self)
          bucket.policy = self
        end

        def delete
          bucket.client.delete_bucket_policy(:bucket_name => bucket.name)
        end

      end

      # Returns the bucket policy.  This will be an instance of
      # Policy.  The returned policy will also have the methods of
      # PolicyProxy mixed in, so you can use it to change the
      # current policy or delete it, for example:
      #
      #     if policy = bucket.policy
      #       # add a statement
      #       policy.change do |p|
      #         p.allow(...)
      #       end
      #
      #       # delete the policy
      #       policy.delete
      #     end
      #
      # Note that changing the policy is not an atomic operation; it
      # fetches the current policy, yields it to the block, and then
      # sets it again.  Therefore, it's possible that you may
      # overwrite a concurrent update to the policy using this
      # method.
      #
      # @return [Policy,nil] Returns the bucket policy (if it has one),
      #   or it returns `nil` otherwise.
      def policy
        resp = client.get_bucket_policy(:bucket_name => name)
        policy = Policy.from_json(resp.data[:policy])
        policy.extend(PolicyProxy)
        policy.bucket = self
        policy
      rescue Errors::NoSuchBucketPolicy => e
        nil
      end

      # Sets the bucket's policy.
      #
      # @param policy The new policy.  This can be a string (which
      #   is assumed to contain a valid policy expressed in JSON), a
      #   Policy object or any object that responds to `to_json`.
      # @see Policy
      # @return [nil]
      def policy=(policy)
        client.set_bucket_policy(:bucket_name => name, :policy => policy)
        nil
      end

      # The primary interface for editing the lifecycle configuration.
      # See {BucketLifecycleConfiguration} for more information.
      #
      # @example Adding rules to a bucket's lifecycle configuration
      #
      #   bucket.lifecycle_configuration.update do
      #     add_rule 'cache-1/', 30
      #     add_rule 'cache-2/', 30
      #   end
      #
      # @example Deleting the lifecycle configuration
      #
      #   bucket.lifecycle_configuration.clear
      #
      # @return [BucketLifecycleConfiguration]
      #
      def lifecycle_configuration
        @lifecycle_cfg ||= BucketLifecycleConfiguration.new(self)
      end

      # You can call this method if you prefer to build your own
      # lifecycle configuration.
      #
      #     bucket.lifecycle_configuration = <<-XML
      #       <LifecycleConfiguration>
      #         ...
      #       </LifecycleConfiguration>
      #     XML
      #
      # You can also use this method to copy a lifecycle configuration
      # from another bucket.
      #
      #     bucket.lifecycle_configuration = other_bucket.lifecycle_configuration
      #
      # If you call this method, passing nil, the lifecycle configuration
      # for this bucket will be deleted.
      #
      # @param [String,Object] config You can pass an xml string or any
      #   other object that responds to #to_xml (e.g.
      #   BucketLifecycleConfiguration).
      #
      # @return [nil]
      #
      def lifecycle_configuration= config

        if config.nil?

          client_opts = {}
          client_opts[:bucket_name] = name
          client.delete_bucket_lifecycle_configuration(client_opts)

          @lifecycle_cfg = BucketLifecycleConfiguration.new(self, :empty => true)

        else

          xml = config.is_a?(String) ? config : config.to_xml

          client_opts = {}
          client_opts[:bucket_name] = name
          client_opts[:lifecycle_configuration] = xml
          client.set_bucket_lifecycle_configuration(client_opts)

          @lifecycle_cfg = BucketLifecycleConfiguration.new(self, :xml => xml)

        end

        nil

      end

      # Returns a tree that allows you to expose the bucket contents
      # like a directory structure.
      #
      # @see Tree
      # @param [Hash] options
      # @option options [String] :prefix (nil) Set prefix to choose where
      #   the top of the tree will be.  A value of `nil` means
      #   that the tree will include all objects in the collection.
      #
      # @option options [String] :delimiter ('/') The string that separates
      #   each level of the tree.  This is usually a directory separator.
      #
      # @option options [Boolean] :append (true) If true, the delimiter is
      #   appended to the prefix when the prefix does not already end
      #   with the delimiter.
      #
      # @return [Tree]
      def as_tree options = {}
        objects.as_tree(options)
      end

      # Generates fields for a presigned POST to this object.  All
      # options are sent to the PresignedPost constructor.
      #
      # @see PresignedPost
      def presigned_post(options = {})
        PresignedPost.new(self, options)
      end

    end

  end
end
