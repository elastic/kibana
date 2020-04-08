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

require 'nokogiri'

module AWS
  class S3

    # A lifecycle configuration specify {Rule rules} that manage the way
    # Amazon S3 stores objects. The rules apply to objects whose keys match
    # the rule's prefix.
    #
    # ## Rules
    #
    # A rule is comprised primarily of an id, prefix and set of
    # configuration options. Configuration options on the rules can specify:
    #
    # * When to expire an object
    # * When to transition an object to Glacier
    # * Whether the rule is enabled or disabled
    #
    # See {Rule} for more information on all of the attributes and methods
    # available for rules.
    #
    # ## Expiring Objects
    #
    # You can add a rule to a bucket lifecycle configuration using {#add_rule}
    # inside of an {#update} block that will expire an object after a given
    # number of days:
    #
    #     # delete backups after they are 1 year old
    #     bucket.lifecycle_configuration.update do
    #       add_rule('backups/', :expiration_time => 365)
    #     end
    #
    # You can also define the rule to expire objects at a specific date:
    #
    #     # delete backups on January 1st of next year
    #     bucket.lifecycle_configuration.update do
    #       date = Date.new(Time.now.year + 1, 01, 01)
    #       add_rule('backups/', :expiration_time => date)
    #     end
    #
    # ## Transitioning Objects to Glacier
    #
    # You can add a rule to a bucket lifecycle configuration using {#add_rule}
    # inside of an {#update} block that will transition objects to Glacier
    # after a given number of days:
    #
    #     # move backups to Glacier after 3 days
    #     bucket.lifecycle_configuration.update do
    #       add_rule('backups/', :glacier_transition_time => 3)
    #     end
    #
    # You can also define the rule to transition objects at a specific date:
    #
    #     # transition all backups on January 1st of next year
    #     bucket.lifecycle_configuration.update do
    #       date = Date.new(Time.now.year + 1, 01, 01)
    #       add_rule('backups/', :glacier_transition_time => date)
    #     end
    #
    # ## Replacing Rules
    #
    # If you prefer to completely replace a lifecycle configuration, call
    # {#add_rule} inside a {#replace} block instead of an `#update` block:
    #
    #     # replace all existing rules with the following
    #     bucket.lifecycle_configuration.replace do
    #       add_rule('backups/', :glacier_transition_time => 10)
    #       add_rule('temp/', :expiration_time => 30)
    #     end
    #
    # ## Removing Rules
    #
    # You can delete specific rules with {#remove_rule}.
    #
    #     # delete all disabled rules
    #     bucket.lifecycle_configuration.update do
    #       rules.each do |rule|
    #         remove_rule(rule) if rule.disabled?
    #       end
    #     end
    #
    # You can also remove all rules in a single call with {#clear}:
    #
    #     # remove all rules from this lifecycle configuration
    #     bucket.lifecycle_configuration.clear
    #
    # ## Editing Existing Rules
    #
    # You can also make changes to existing rules.
    #
    #     # change the expiration days to 10 for EVERY rule
    #     bucket.lifecycle_configuration.update do
    #       rules.each do |rule|
    #         rule.expiration_time = 10
    #       end
    #     end
    #
    # Please be aware, if you add, remove or edit rules outside of an
    # {#update} or {#replace} block, then you must call `#update` yourself
    # or the changes will not be persisted.
    #
    class BucketLifecycleConfiguration

      # @api private
      def initialize bucket, options = {}
        @bucket = bucket
        @rules = parse_xml(options[:xml]) if options[:xml]
        @rules = [] if options[:empty] == true
      end

      # @return [Bucket] Returns the bucket this lifecycle configuration
      #   belongs to.
      attr_reader :bucket

      # @return [Array<Hash>] Returns an array of rules.
      def rules
        @rules ||= begin
          begin
            opts = { :bucket_name => bucket.name }
            response = bucket.client.get_bucket_lifecycle_configuration(opts)
            parse_xml(response.http_response.body)
          rescue Errors::NoSuchLifecycleConfiguration
            []
          end
        end
      end

      # @overload add_rule(prefix, options = {})
      #   @param [String] prefix objects whose keys begin with this prefix
      #     will be affected by the rule.
      #
      #   @option options [String] :id A unique ID for this rule.  If an ID
      #     is not provided, one will be generated.
      #
      #   @option options [Boolean] :disabled (false) By default, all rules
      #     will have the status of enabled.  You can override this default
      #     by passing `:disabled` => true.
      #
      #   @option options [Date, Integer] :expiration_time (nil) Indicates
      #     the lifetime for objects matching the given prefix.
      #
      #   @option options [Date, Integer] :glacier_transition_time (nil)
      #     Indicates the time before objects matching the given prefix will
      #     be transitioned into the Amazon Glacier storage tier.
      #
      #   @return [Rule] Returns the rule that was added, as a {Rule} object.
      def add_rule prefix, expiration_time = nil, options = {}
        if Hash === expiration_time
          options = expiration_time
        else
          options[:expiration_time] = expiration_time
        end

        id = options[:id] || SecureRandom.uuid
        opts = {
          :status => options[:disabled] == true ? 'Disabled' : 'Enabled',
          :expiration_time => options[:expiration_time],
          :glacier_transition_time => options[:glacier_transition_time],
          :noncurrent_version_transition_days => options[:noncurrent_version_transition_days],
          :noncurrent_version_expiration_days => options[:noncurrent_version_expiration_days]
        }
        rule = Rule.new(self, id, prefix, opts)
        self.rules << rule
        rule
      end

      # Removes a single rule.  You can pass a rule id or a {Rule}
      # object.
      #
      #     # remove a single rule by its ID
      #     bucket.lifecycle_configuration.update do
      #       remove_rule('rule-id')
      #     end
      #
      #     # remove all disabled rules
      #     bucket.lifecycle_configuration.update do
      #       rules.each do |rule|
      #         remove_rule(rule) if rule.disabled?
      #       end
      #     end
      #
      # If you call #remove_rule outside an update block
      # you need to call #update to save the changes.
      #
      # @param [Rule,String] rule_or_rule_id
      #
      # @return [nil]
      #
      def remove_rule rule_or_rule_id
        rule_id = rule_or_rule_id
        if rule_id.nil?
          raise ArgumentError, "expected a rule or rule id, got nil"
        end
        rule_id = rule_id.id unless rule_id.is_a?(String)
        @rules = rules.select{|r| r.id != rule_id }
        nil
      end

      # Saves changes made to this lifecycle configuration.
      #
      #     # set the number of days before expiration for all rules to 10
      #     config = bucket.lifecycle_configuration
      #     config.rules.each do |rule|
      #       rule.expiration_time = 10
      #     end
      #     config.update
      #
      # You can call #update with a block.  Changes are persisted at the
      # end of the block.
      #
      #     # shorter version of the example above
      #     bucket.lifecycle_configuration.update do
      #       rules.each {|rule| rule.expiration_time = 10 }
      #     end
      #
      # A block method for updating a BucketLifecycleConfiguration.
      # All modifications made inside the block are persisted at the end of
      # the block.
      #
      #     # 1 request
      #     bucket.lifecycle_configuration.update do
      #       add_rule 'prefix/a', 10
      #       add_rule 'prefix/b', 5
      #     end
      #
      #     # 2 requests
      #     bucket.lifecycle_configuration.add_rule 'prefix/a', 10
      #     bucket.lifecycle_configuration.add_rule 'prefix/b', 5
      #
      # @return [nil]
      #
      def update arg = {}, &block
        begin
          @batching = true
          instance_exec(arg, &block) if block_given?
          persist(true)
        ensure
          @batching = false
        end
        nil
      end

      # Yields to the given block.  Before yielding, the current
      # rules will be blanked out.  This allows you to provide all
      # new rules.
      #
      # When the block is complete, a single call will be made to save
      # the new rules.
      #
      #     bucket.lifecycle_configuration.rules.size #=> 3
      #
      #     # replace the existing 3 rules with a single rule
      #     bucket.lifecycle_configuration.replace
      #       add_rule 'temp/', 10
      #     end
      #
      #     bucket.lifecycle_configuration.rules.size #=> 1
      def replace &block
        @rules = []
        update(&block)
      end

      def clear
        @rules = []
        bucket.lifecycle_configuration = nil
      end
      alias_method :remove, :clear

      # @return [String] Returns an xml string representation of this
      #   bucket lifecycle configuration.
      def to_xml
        Nokogiri::XML::Builder.new do |xml|
          xml.LifecycleConfiguration do
            rules.each do |rule|
              xml.Rule do
                xml.ID rule.id
                xml.Prefix rule.prefix
                xml.Status rule.status
                xml.Expiration do
                  if Integer === rule.expiration_time
                    xml.Days rule.expiration_time
                  else
                    date = rule.expiration_time.to_s
                    xml.Date "#{date}T00:00:00Z"
                  end
                end if rule.expiration_time
                xml.Transition do
                  xml.StorageClass 'GLACIER'
                  if Integer === rule.glacier_transition_time
                    xml.Days rule.glacier_transition_time
                  else
                    date = rule.glacier_transition_time.to_s
                    xml.Date "#{date}T00:00:00Z"
                  end
                end if rule.glacier_transition_time
                xml.NoncurrentVersionTransition do
                  xml.StorageClass 'GLACIER'
                  xml.NoncurrentDays rule.noncurrent_version_transition_days
                end if rule.noncurrent_version_transition_days
                xml.NoncurrentVersionExpiration do
                  xml.NoncurrentDays rule.noncurrent_version_expiration_days
                end if rule.noncurrent_version_expiration_days
              end
            end
          end
        end.doc.root.to_xml
      end

      protected
      def persist force = false
        unless @batching and force == false
          if rules.empty?
            bucket.lifecycle_configuration = nil
          else
            bucket.lifecycle_configuration = self
          end
        end
      end

      # Represents a single rule from an Amazon S3 bucket lifecycle
      # configuration.
      #
      #     # delete all objects with the prefix 'temporary/' after 10 days
      #     bucket.lifecycle_configuration.add_rule 'temporary/', 10
      #
      #     # remove the rule created above
      #     bucket.lifecycle_configuration.remove_rule 'temporary/'
      #
      #
      class Rule

        # @api private
        def initialize configuration, id, prefix, expiration_time = nil, status = nil
          @configuration = configuration
          @id = id
          @prefix = prefix

          if Hash === expiration_time
            options = expiration_time
            options.each do |key, value|
              send("#{key}=", value) if respond_to?("#{key}=")
            end
          else
            self.expiration_time = expiration_time
            self.status = status
          end
        end

        # @return [BucketLifecycleConfiguration]
        attr_reader :configuration

        # @return [String]
        attr_reader :id

        # @return [String]
        attr_accessor :prefix

        # @return [Date] the date the objects will expire
        # @return [Integer] if the value is an integer, returns the number
        #   of days before the object will expire.
        attr_reader :expiration_time

        # Converts any time values to Date objects
        def expiration_time=(value)
          @expiration_time = convert_time_value(value)
        end

        alias expiration_days expiration_time
        alias expiration_days= expiration_time=

        # @return [Date] the date the objects will be
        #   transitioned into the Amazon Glacier storage tier.
        # @return [Integer] if the value is an integer, returns the number
        #   of days before the object is transitioned into the Amazon Glacier
        #   storage tier.
        attr_reader :glacier_transition_time

        # Converts any time values to Date objects
        def glacier_transition_time=(value)
          @glacier_transition_time = convert_time_value(value)
        end

        # @return [Integer]
        attr_accessor :noncurrent_version_transition_days

        # @return [Integer]
        attr_accessor :noncurrent_version_expiration_days

        # @return [String] Returns the rule status, 'Enabled' or 'Disabled'
        attr_accessor :status

        def enabled?
          status == 'Enabled'
        end

        def enable!
          self.status = 'Enabled'
        end

        def disabled?
          status == 'Disabled'
        end

        def disabled!
          self.status = 'Disabled'
        end

        # @api private
        def eql? other
          other.is_a?(Rule) and
          other.configuration.bucket == configuration.bucket and
          other.id == id and
          other.prefix == prefix and
          other.expiration_time == expiration_time and
          other.glacier_transition_time == glacier_transition_time and
          other.status == status and
          other.noncurrent_version_transition_days == noncurrent_version_transition_days and
          other.noncurrent_version_expiration_days == noncurrent_version_expiration_days
        end
        alias_method :==, :eql?

        private

        # If an integer, returns the integer as days, otherwise
        # converts any time-like values into Date objects
        # @return [Integer] if the value is an integer
        # @return [Date] if the value is a time-like object
        # @return [nil] if the value is nil
        def convert_time_value(value)
          return nil if value.nil?
          return value if value.is_a?(Integer)
          Date.parse(value.to_s)
        end

      end

      protected

      def parse_xml xml
        Client::XML::GetBucketLifecycleConfiguration.parse(xml).rules.map do |r|
          opts = { :status => r[:status] }

          if r[:expiration]
            opts[:expiration_time] =
              r[:expiration][:days] || r[:expiration][:date]
          end

          if r[:transition]
            opts[:glacier_transition_time] =
              r[:transition][:days] || r[:transition][:date]
          end

          Rule.new(self, r[:id], r[:prefix], opts)
        end
      end

    end

  end
end
