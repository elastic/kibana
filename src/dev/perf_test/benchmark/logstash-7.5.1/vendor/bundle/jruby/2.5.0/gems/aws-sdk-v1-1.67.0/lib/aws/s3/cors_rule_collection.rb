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

    # Manages the CORS rules for a single bucket.
    #
    # ## Getting Rules
    #
    # To get the CORS rules for a bucket, use the {Bucket#cors} method.  This
    # returns a CORSRuleCollection for the bucket.  The collection is
    # enumerable.
    #
    #     # enumerating all rules for a buck
    #     bucket.cors.each do |rule|
    #       # rule is a CORSRule object
    #     end
    #
    # ## Setting Rules
    #
    # You can set the rules for a bucket (replacing all existing rules) using
    # the {#set} method.
    #
    #     # accepts a list of one or more rules
    #     bucket.rules.set(rule1, rule2)
    #
    #     # rules can be an array of rules
    #     bucket.rules.set(rules)
    #
    #     # passing an empty list or array removes all rules
    #     bucket.rules.set([])
    #     bucket.rules.clear # does the same thing
    #
    # Each rule can be a Hash, a {CORSRule} or another {CORSRuleCollection}.
    # See {Client#put_bucket_cors} for a list of keys for a rule hash.
    #
    # ## Adding Rules
    #
    # Adding rules is the same as setting rules.  Rules you add will be
    # appended to the end of the existing list of rules.
    #
    #     # add one or more rules
    #     bucket.rules.add(rules)
    #
    # ## Deleting Rules
    #
    # To remove a rule, use the {#delete_if} method.
    #
    #     # delete rules that allow access from any domain
    #     bucket.cors.delete_if{|rule| rule.allowed_origins.include?('*')
    class CORSRuleCollection

      include Core::Collection::Simple

      # @param [Bucket] bucket
      # @param [Hash] options
      def initialize bucket, options = {}
        @bucket = bucket
        super
      end

      # @return [Bucket]
      attr_reader :bucket

      # Replaces the CORS rules attached to this bucket.  You can pass
      # one or more rules as an array or a list.
      #
      #     # replace all exisitng rules with a single rule
      #     bucket.cors.set(
      #       :allowed_methods => %w(GET),
      #       :allowed_origins => %w(http://*.mydomain.com),
      #       :max_age_seconds => 3600)
      #
      # If you pass an empty array, all of the rules will be removed from
      # the bucket.
      #
      #      # these two lines are equivilent
      #      bucket.cors.clear
      #      bucket.cors.set([])
      #
      # @param [Hash,CORSRule,CORSRuleCollection] rules A list or array
      #   of one or more rules to set.  Each rule may be a Hash, a CORSRule
      #   or a CORSRuleCollection.
      #
      # @return [nil]
      #
      def set *rules

        raise ArgumentError, 'expected one or more rules' if rules.empty?

        if rules == [[]]
          self.clear
        else
          rules = rule_hashes(rules)
          client.put_bucket_cors(:bucket_name => bucket.name, :rules => rules)
        end

        nil

      end

      # Add one or more CORS rules to this bucket.
      #
      #     # adding a single rule as a hash
      #     bucket.cors.add(
      #       :allowed_methods => %w(GET HEAD),
      #       :allowed_origins => %w(*),
      #       :max_age_seconds => 3600)
      #
      # You can add multiple rules in a single call:
      #
      #     # each rule may be a hash, CORSRule or a CORSRuleCollection,
      #     bucket.cors.add(rules)
      #
      #     # alternatively you can pass a list of rules
      #     bucket.cors.add(rule1, rule2, ...)
      #
      # @param (see #set)
      # @return (see #set)
      def add *rules
        self.set(self, *rules)
      end
      alias_method :create, :add

      # Deletes every rule for which the block evaluates to `true`.
      #
      # @example Remove all rules that are open to the 'world'
      #
      #   bucket.cors.delete_if{|rule| rule.allowed_origins.include?('*') }
      #
      # @yield [rule]
      # @yieldparam [CORSRule] rule
      # @yieldreturn [Boolean] Return `true` for each rule you want to delete.
      # @return (see #set)
      def delete_if &block
        rules = []
        self.each do |rule|
          rules << rule unless yield(rule)
        end
        self.set(rules)
      end

      # Removes all CORS rules attached to this bucket.
      #
      # @example
      #
      #   bucket.cors.count #=> 3
      #   bucket.cors.clear
      #   bucket.cors.count #=> 0
      #
      # @return [nil]
      def clear
        client.delete_bucket_cors(:bucket_name => bucket.name)
        nil
      end

      protected

      def _each_item options
        resp = client.get_bucket_cors(options.merge(:bucket_name => bucket.name))
        resp.data[:rules].each do |rule|
          yield(CORSRule.new(rule))
        end
      rescue AWS::S3::Errors::NoSuchCORSConfiguration
        # no cors rules exist for this bucket, nothing to yield
      end

      def rule_hashes rule
        case rule
        when Hash then rule
        when CORSRule then rule.to_h
        when CORSRuleCollection then rule.map(&:to_h)
        when Array then rule.map{|r| rule_hashes(r) }.flatten
        else
          msg = "Expected one or more CORSRule, CORSRuleCollection or hash"
          msg << ", got #{rule.class.name}"
          raise ArgumentError, msg
        end
      end

    end
  end
end
