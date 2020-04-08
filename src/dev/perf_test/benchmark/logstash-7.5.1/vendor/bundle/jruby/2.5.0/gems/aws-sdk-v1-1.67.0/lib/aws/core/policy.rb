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

require 'date'
require 'json'

module AWS
  module Core

    # Represents an access policy for AWS operations and resources.  For example:
    #
    #     policy = Policy.new
    #     policy.allow(
    #       :actions => ['s3:PutObject'],
    #       :resources => "arn:aws:s3:::mybucket/mykey/*",
    #       :principals => :any
    #     ).where(:acl).is("public-read")
    #
    #     policy.to_json # => '{ "Version":"2008-10-17", ...'
    #
    # @see #initialize More ways to construct a policy.
    # @see http://docs.aws.amazon.com/AmazonS3/latest/dev/AccessPolicyLanguage_UseCases_s3_a.html Example policies (in JSON).
    class Policy

      # @see Statement
      # @return [Array] An array of policy statements.
      attr_reader :statements

      # @return [String] The version of the policy language used in this
      #   policy object.
      attr_reader :version

      # @return [String] A unique ID for the policy.
      attr_reader :id

      class Statement; end

      # Constructs a policy.  There are a few different ways to
      # build a policy:
      #
      # * With hash arguments:
      #
      #     Policy.new(:statements => [
      #       {
      #         :effect => :allow,
      #         :actions => :all,
      #         :principals => ["abc123"],
      #         :resources => "mybucket/mykey"
      #       }
      #     ])
      #
      # * From a JSON policy document:
      #
      #     Policy.from_json(policy_json_string)
      #
      # * With a block:
      #
      #     Policy.new do |policy|
      #       policy.allow(
      #         :actions => ['s3:PutObject'],
      #         :resources => "arn:aws:s3:::mybucket/mykey/*",
      #         :principals => :any
      #       ).where(:acl).is("public-read")
      #     end
      #
      def initialize(opts = {})
        @statements = opts.values_at(:statements, "Statement").select do |a|
          a.kind_of?(Array)
        end.flatten.map do |stmt|
          self.class::Statement.new(stmt)
        end

        if opts.has_key?(:id) or opts.has_key?("Id")
          @id = opts[:id] || opts["Id"]
        else
          @id = SecureRandom.uuid.tr('-','')
        end
        if opts.has_key?(:version) or opts.has_key?("Version")
          @version = opts[:version] || opts["Version"]
        else
          @version = "2008-10-17"
        end

        yield(self) if block_given?
      end

      # @return [Boolean] Returns true if the two policies are the same.
      def ==(other)
        if other.kind_of?(Core::Policy)
          self.hash_without_ids == other.hash_without_ids
        else
          false
        end
      end
      alias_method :eql?, :==

      # Removes the ids from the policy and its statements for the purpose
      # of comparing two policies for equivilence.
      # @return [Hash] Returns the policy as a hash with no ids
      # @api private
      def hash_without_ids
        hash = self.to_h
        hash.delete('Id')
        hash['Statement'].each do |statement|
          statement.delete('Sid')
        end
        hash
      end
      protected :hash_without_ids

      # Returns a hash representation of the policy. The following
      # statements are equivalent:
      #
      #     policy.to_h.to_json
      #     policy.to_json
      #
      # @return [Hash]
      def to_h
        {
          "Version" => version,
          "Id" => id,
          "Statement" => statements.map { |st| st.to_h }
        }
      end

      # @return [String] a JSON representation of the policy.
      def to_json
        to_h.to_json
      end

      # Constructs a policy from a JSON representation.
      # @see #initialize
      # @return [Policy] Returns a Policy object constructed by parsing
      #   the passed JSON policy.
      def self.from_json(json)
        new(JSON.parse(json))
      end

      # Convenient syntax for expressing operators in statement
      # condition blocks.  For example, the following:
      #
      #     policy.allow.where(:s3_prefix).not("forbidden").
      #       where(:current_time).lte(Date.today+1)
      #
      # is equivalent to:
      #
      #     conditions = Policy::ConditionBlock.new
      #     conditions.add(:not, :s3_prefix, "forbidden")
      #     conditions.add(:lte, :current_time, Date.today+1)
      #     policy.allow(:conditions => conditions)
      #
      # @see ConditionBlock#add
      class OperatorBuilder

        # @api private
        def initialize(condition_builder, key)
          @condition_builder = condition_builder
          @key = key
        end

        def method_missing(m, *values)
          @condition_builder.conditions.add(m, @key, *values)
          @condition_builder
        end

      end

      # Convenient syntax for adding conditions to a statement.
      # @see Policy#allow
      # @see Policy#deny
      class ConditionBuilder

        # @return [Array] Returns an array of policy conditions.
        attr_reader :conditions

        # @api private
        def initialize(conditions)
          @conditions = conditions
        end

        # Adds a condition for the given key.  For example:
        #
        #     policy.allow(...).where(:current_time).lte(Date.today + 1)
        #
        # @return [OperatorBuilder]
        def where(key, operator = nil, *values)
          if operator
            @conditions.add(operator, key, *values)
            self
          else
            OperatorBuilder.new(self, key)
          end
        end

      end

      # Convenience method for constructing a new statement with the
      # "Allow" effect and adding it to the policy.  For example:
      #
      #     policy.allow(
      #       :actions => [:put_object],
      #       :principals => :any,
      #       :resources => "mybucket/mykey/*").
      #     where(:acl).is("public-read")
      #
      # @option (see Statement#initialize)
      # @see Statement#initialize
      # @return [ConditionBuilder]
      def allow(opts = {})
        stmt = self.class::Statement.new(opts.merge(:effect => :allow))
        statements << stmt
        ConditionBuilder.new(stmt.conditions)
      end

      # Convenience method for constructing a new statement with the
      # "Deny" effect and adding it to the policy.  For example:
      #
      #     policy.deny(
      #       :actions => [:put_object],
      #       :principals => :any,
      #       :resources => "mybucket/mykey/*"
      #     ).where(:acl).is("public-read")
      #
      # @param (see Statement#initialize)
      # @see Statement#initialize
      # @return [ConditionBuilder]
      def deny(opts = {})
        stmt = self.class::Statement.new(opts.merge(:effect => :deny))
        statements << stmt
        ConditionBuilder.new(stmt.conditions)
      end

      # Represents the condition block of a policy.  In JSON,
      # condition blocks look like this:
      #
      #     { "StringLike": { "s3:prefix": ["photos/*", "photos.html"] } }
      #
      # ConditionBlock lets you specify conditions like the above
      # example using the add method, for example:
      #
      #     conditions.add(:like, :s3_prefix, "photos/*", "photos.html")
      #
      # See the add method documentation for more details about how
      # to specify keys and operators.
      #
      # This class also provides a convenient way to query a
      # condition block to see what operators, keys, and values it
      # has.  For example, consider the following condition block
      # (in JSON):
      #
      #   {
      #     "StringEquals": {
      #       "s3:prefix": "photos/index.html"
      #     },
      #     "DateEquals": {
      #       "aws:CurrentTime": ["2010-10-12", "2011-01-02"]
      #     },
      #     "NumericEquals": {
      #       "s3:max-keys": 10
      #     }
      #   }
      #
      # You can get access to the condition data using #[], #keys,
      # #operators, and #values -- for example:
      #
      #   conditions["DateEquals"]["aws:CurrentTime"].values
      #     # => ["2010-10-12", "2011-01-02"]
      #
      # You can also perform more sophisticated queries, like this
      # one:
      #
      #   conditions[:is].each do |equality_conditions|
      #     equality_conditions.keys.each do |key|
      #       puts("#{key} may be any of: " +
      #            equality_conditions[key].values.join(" ")
      #     end
      #   end
      #
      # This would print the following lines:
      #
      #   s3:prefix may be any of: photos/index.html
      #   aws:CurrentTime may be any of: 2010-10-12 2011-01-02
      #   s3:max-keys may be any of: 10
      #
      class ConditionBlock

        # @api private
        def initialize(conditions = {})
          # filter makes a copy
          @conditions = filter_conditions(conditions)
        end

        # Adds a condition to the block.  This method defines a
        # convenient set of abbreviations for operators based on the
        # type of value passed in.  For example:
        #
        #   conditions.add(:is, :secure_transport, true)
        #
        # Maps to:
        #
        #   { "Bool": { "aws:SecureTransport": true } }
        #
        # While:
        #
        #   conditions.add(:is, :s3_prefix, "photos/")
        #
        # Maps to:
        #
        #   { "StringEquals": { "s3:prefix": "photos/" } }
        #
        # The following list shows which operators are accepted as
        # symbols and how they are represented in the JSON policy:
        #
        # * `:is` (StringEquals, NumericEquals, DateEquals, or Bool)
        # * `:like` (StringLike)
        # * `:not_like` (StringNotLike)
        # * `:not` (StringNotEquals, NumericNotEquals, or DateNotEquals)
        # * `:greater_than`, `:gt` (NumericGreaterThan or DateGreaterThan)
        # * `:greater_than_equals`, `:gte`
        #   (NumericGreaterThanEquals or DateGreaterThanEquals)
        # * `:less_than`, `:lt` (NumericLessThan or DateLessThan)
        # * `:less_than_equals`, `:lte`
        #   (NumericLessThanEquals or DateLessThanEquals)
        # * `:is_ip_address` (IpAddress)
        # * `:not_ip_address` (NotIpAddress)
        # * `:is_arn` (ArnEquals)
        # * `:not_arn` (ArnNotEquals)
        # * `:is_arn_like` (ArnLike)
        # * `:not_arn_like` (ArnNotLike)
        #
        # @param [Symbol or String] operator The operator used to
        #   compare the key with the value.  See above for valid
        #   values and their interpretations.
        #
        # @param [Symbol or String] key The key to compare.  Symbol
        #   keys are inflected to match AWS conventions.  By
        #   default, the key is assumed to be in the "aws"
        #   namespace, but if you prefix the symbol name with "s3_"
        #   it will be sent in the "s3" namespace.  For example,
        #   `:s3_prefix` is sent as "s3:prefix" while
        #   `:secure_transport` is sent as "aws:SecureTransport".
        #   See
        #   http://docs.aws.amazon.com/AmazonS3/latest/dev/UsingResOpsConditions.html
        #   for a list of the available keys for each action in S3.
        #
        # @param [Mixed] values The value to compare against.
        #   This can be:
        #   * a String
        #   * a number
        #   * a Date, DateTime, or Time
        #   * a boolean value
        #   This method does not attempt to validate that the values
        #   are valid for the operators or keys they are used with.
        #
        def add(operator, key, *values)
          if operator.kind_of?(Symbol)
            converted_values = values.map { |v| convert_value(v) }
          else
            converted_values = values
          end
          operator = translate_operator(operator, values.first)
          op = (@conditions[operator] ||= {})
          raise "duplicate #{operator} conditions for #{key}" if op[key]
          op[translate_key(key)] = converted_values
        end

        # @api private
        def to_h
          @conditions
        end

        # Filters the conditions described in the block, returning a
        # new ConditionBlock that contains only the matching
        # conditions.  Each argument is matched against either the
        # keys or the operators in the block, and you can specify
        # the key or operator in any way that's valid for the #add
        # method.  Some examples:
        #
        #   # all conditions using the StringLike operator
        #   conditions["StringLike"]
        #
        #   # all conditions using StringEquals, DateEquals, NumericEquals, or Bool
        #   conditions[:is]
        #
        #   # all conditions on the s3:prefix key
        #   conditions["s3:prefix"]
        #
        #   # all conditions on the aws:CurrentTime key
        #   conditions[:current_time]
        #
        # Multiple conditions are ANDed together, so the following
        # are equivalent:
        #
        #   conditions[:s3_prefix][:is]
        #   conditions[:is][:s3_prefix]
        #   conditions[:s3_prefix, :is]
        #
        # @see #add
        # @return [ConditionBlock] A new set of conditions filtered by the
        #   given conditions.
        def [](*args)
          filtered = @conditions
          args.each do |filter|
            type = valid_operator?(filter) ? nil : :key
            filtered = filter_conditions(filtered) do |op, key, value|
              (match, type) = match_triple(filter, type, op, key, value)
              match
            end
          end
          self.class.new(filtered)
        end

        # @return [Array] Returns an array of operators used in this block.
        def operators
          @conditions.keys
        end

        # @return [Array] Returns an array of unique keys used in the block.
        def keys
          @conditions.values.map do |keys|
            keys.keys if keys
          end.compact.flatten.uniq
        end

        # Returns all values used in the block.  Note that the
        # values may not all be from the same condition; for example:
        #
        #   conditions.add(:like, :user_agent, "mozilla", "explorer")
        #   conditions.add(:lt, :s3_max_keys, 12)
        #   conditions.values # => ["mozilla", "explorer", 12]
        #
        # @return [Array] Returns an array of values used in this condition block.
        def values
          @conditions.values.map do |keys|
            keys.values
          end.compact.flatten
        end

        # @api private
        protected
        def match_triple(filter, type, op, key, value)
          value = [value].flatten.first
          if type
            target = (type == :operator ? op : key)
            match = send("match_#{type}", filter, target, value)
          else
            if match_operator(filter, op, value)
              match = true
              type = :operator
            elsif match_key(filter, key)
              match = true
              type = :key
            else
              match = false
            end
          end
          [match, type]
        end

        # @api private
        protected
        def match_operator(filter, op, value)
          # dates are the only values that don't come back as native types in JSON
          # but where we use the type as a cue to the operator translation
          value = Date.today if op =~ /^Date/
          translate_operator(filter, value) == op
        end

        # @api private
        protected
        def match_key(filter, key, value = nil)
          translate_key(filter) == key
        end

        # @api private
        protected
        def filter_conditions(conditions = @conditions)
          conditions.inject({}) do |m, (op, keys)|
            m[op] = keys.inject({}) do |m2, (key, value)|
              m2[key] = value if !block_given? or yield(op, key, value)
              m2
            end
            m.delete(op) if m[op].empty?
            m
          end
        end

        # @api private
        protected
        def translate_key(key)
          if key.kind_of?(Symbol)
            if key.to_s =~ /^s3_(.*)$/
              s3_name = $1
              if s3_name == "version_id" or
                  s3_name == "location_constraint"
                s3_name = Inflection.class_name(s3_name)
              else
                s3_name.tr!('_', '-')
              end
              "s3:#{s3_name}"
            else
              "aws:#{Inflection.class_name(key.to_s)}"
            end
          else
            key
          end
        end

        # @api private
        MODIFIERS = {
          /_ignoring_case$/ => "IgnoreCase",
          /_equals$/ => "Equals"
        }

        # @api private
        protected
        def valid_operator?(operator)
          translate_operator(operator, "")
          true
        rescue ArgumentError => e
          false
        end

        # @api private
        protected
        def translate_operator(operator, example_value)
          return operator if operator.kind_of?(String)

          original_operator = operator
          (operator, opts) = strip_modifiers(operator)

          raise ArgumentError.new("unrecognized operator #{original_operator}") unless
            respond_to?("translate_#{operator}", true)
          send("translate_#{operator}", example_value, opts)
        end

        # @api private
        protected
        def translate_is(example, opts)
          return "Bool" if type_notation(example) == "Bool"
          base_translate(example, "Equals", opts[:ignore_case])
        end

        # @api private
        protected
        def translate_not(example, opts)
          base_translate(example, "NotEquals", opts[:ignore_case])
        end

        # @api private
        protected
        def translate_like(example, opts)
          base_translate(example, "Like")
        end

        # @api private
        protected
        def translate_not_like(example, opts)
          base_translate(example, "NotLike")
        end

        # @api private
        protected
        def translate_less_than(example, opts)
          base_translate(example, "LessThan", opts[:equals])
        end
        alias_method :translate_lt, :translate_less_than

        # @api private
        protected
        def translate_lte(example, opts)
          translate_less_than(example, { :equals => "Equals" })
        end

        # @api private
        protected
        def translate_greater_than(example, opts)
          base_translate(example, "GreaterThan", opts[:equals])
        end
        alias_method :translate_gt, :translate_greater_than

        # @api private
        protected
        def translate_gte(example, opts)
          translate_greater_than(example, { :equals => "Equals" })
        end

        # @api private
        protected
        def translate_is_ip_address(example, opts)
          "IpAddress"
        end

        # @api private
        protected
        def translate_not_ip_address(example, opts)
          "NotIpAddress"
        end

        # @api private
        protected
        def translate_is_arn(example, opts)
          "ArnEquals"
        end

        # @api private
        protected
        def translate_not_arn(example, opts)
          "ArnNotEquals"
        end

        # @api private
        protected
        def translate_is_arn_like(example, opts)
          "ArnLike"
        end

        # @api private
        protected
        def translate_not_arn_like(example, opts)
          "ArnNotLike"
        end

        # @api private
        protected
        def base_translate(example, base_operator, *modifiers)
          "#{type_notation(example)}#{base_operator}#{modifiers.join}"
        end

        # @api private
        protected
        def type_notation(example)
          case example
          when String
            "String"
          when Numeric
            "Numeric"
          when Time, Date
            "Date"
          when true, false
            "Bool"
          end
        end

        # @api private
        protected
        def convert_value(value)
          case value
          when DateTime, Time
            Time.parse(value.to_s).iso8601
          when Date
            value.strftime("%Y-%m-%d")
          else
            value
          end
        end

        # @api private
        protected
        def strip_modifiers(operator)
          opts = {}
          MODIFIERS.each do |(regex, mod)|
            ruby_name = Inflection.ruby_name(mod).to_sym
            opts[ruby_name] = ""
            if operator.to_s =~ regex
              opts[ruby_name] = mod
              operator = operator.to_s.sub(regex, '').to_sym
            end
          end
          [operator, opts]
        end

      end

      # Represents a statement in a policy.
      #
      # @see Policy#allow
      # @see Policy#deny
      class Statement

        # @return [String] Returns the statement id
        attr_accessor :sid

        # @return [String] Returns the statement effect, either "Allow" or
        #   "Deny"
        attr_accessor :effect

        # @return [Array] Returns an array of principals.
        attr_accessor :principals

        # @return [Array] Returns an array of statement actions included
        #   by this policy statement.
        attr_accessor :actions

        # @return [Array] Returns an array of actions excluded by this
        #   policy statement.
        attr_accessor :excluded_actions

        # @return [Array] Returns an array of resources affected by this
        #   policy statement.
        attr_accessor :resources

        # @return [Array] Returns an array of conditions for this policy.
        attr_accessor :conditions

        attr_accessor :excluded_resources

        # Constructs a new statement.
        #
        # @option opts [String] :sid The statement ID.  This is optional; if
        #   omitted, a UUID will be generated for the statement.
        # @option opts [String] :effect The statement effect, which must be either
        #   "Allow" or "Deny".
        #   @see Policy#allow
        #   @see Policy#deny
        # @option opts [String or array of strings] :principals The account(s)
        #   affected by the statement.  These should be AWS account IDs.
        # @option opts :actions The action or actions affected by
        #   the statement.  These can be symbols or strings.  If
        #   they are strings, you can use wildcard character "*"
        #   to match zero or more characters in the action name.
        #   Symbols are expected to match methods of S3::Client.
        # @option opts :excluded_actions Action or actions which are
        #   explicitly not affected by this statement.  As with
        #   `:actions`, these may be symbols or strings.
        # @option opts [String or array of strings] :resources The
        #   resource(s) affected by the statement.  These can be
        #   expressed as ARNs (e.g. `arn:aws:s3:::mybucket/mykey`)
        #   or you may omit the `arn:aws:s3:::` prefix and just give
        #   the path as `bucket_name/key`.  You may use the wildcard
        #   character "*" to match zero or more characters in the
        #   resource name.
        # @option opts [ConditionBlock or Hash] :conditions
        #   Additional conditions that narrow the effect of the
        #   statement.  It's typically more convenient to use the
        #   ConditionBuilder instance returned from Policy#allow or
        #   Policy#deny to add conditions to a statement.
        # @see S3::Client
        def initialize(opts = {})
          self.sid = SecureRandom.uuid.tr('-','')
          self.conditions = ConditionBlock.new

          parse_options(opts)

          yield(self) if block_given?
        end

        # Convenience method to add to the list of actions affected
        # by this statement.
        def include_actions(*actions)
          self.actions ||= []
          self.actions.push(*actions)
        end
        alias_method :include_action, :include_actions

        # Convenience method to add to the list of actions
        # explicitly not affected by this statement.
        def exclude_actions(*actions)
          self.excluded_actions ||= []
          self.excluded_actions.push(*actions)
        end
        alias_method :exclude_action, :exclude_actions

        # @api private
        def to_h
          stmt = {
            "Sid" => sid,
            "Effect" => Inflection.class_name(effect.to_s),
            "Principal" => principals_hash,
            "Resource" => (resource_arns if resource_arns),
            "NotResource" => (excluded_resource_arns if excluded_resource_arns),
            "Condition" => (conditions.to_h if conditions)
          }
          stmt.delete("Condition") if !conditions || conditions.to_h.empty?
          stmt.delete("Principal") unless principals_hash
          stmt.delete("Resource") unless resource_arns
          stmt.delete("NotResource") unless excluded_resource_arns
          if !translated_actions || translated_actions.empty?
            stmt["NotAction"] = translated_excluded_actions
          else
            stmt["Action"] = translated_actions
          end
          stmt
        end

        protected
        def parse_options(options)
          options.each do |name, value|
            name = Inflection.ruby_name(name.to_s)
            name.sub!(/s$/,'')
            send("parse_#{name}_option", value) if
              respond_to?("parse_#{name}_option", true)
          end
        end

        protected
        def parse_effect_option(value)
          self.effect = value
        end

        protected
        def parse_sid_option(value)
          self.sid = value
        end

        protected
        def parse_action_option(value)
          coerce_array_option(:actions, value)
        end

        protected
        def parse_not_action_option(value)
          coerce_array_option(:excluded_actions, value)
        end
        alias_method :parse_excluded_action_option, :parse_not_action_option

        protected
        def parse_principal_option(value)
          if value and value.kind_of?(Hash)
            value = value["AWS"] || []
          end

          coerce_array_option(:principals, value)
        end

        protected
        def parse_resource_option(value)
          coerce_array_option(:resources, value)
        end

        def parse_not_resource_option(value)
          coerce_array_option(:excluded_resources, value)
        end
        alias_method :parse_excluded_resource_option, :parse_not_resource_option

        protected
        def parse_condition_option(value)
          self.conditions = ConditionBlock.new(value)
        end

        protected
        def coerce_array_option(attr, value)
          if value.kind_of?(Array)
            send("#{attr}=", value)
          else
            send("#{attr}=", [value])
          end
        end

        protected
        def principals_hash
          return nil unless principals
          { "AWS" =>
            principals.map do |principal|
              principal == :any ? "*" : principal
            end }
        end

        protected
        def translate_action(action)
          case action
          when String then action
          when :any   then '*'
          when Symbol

            if self.class == Core::Policy::Statement
              msg = 'symbolized action names are only accepted by service ' +
              'specific policies (e.g. AWS::S3::Policy)'
              raise ArgumentError, msg
            end

            unless self.class::ACTION_MAPPING.has_key?(action)
              raise ArgumentError, "unrecognized action: #{action}"
            end

            self.class::ACTION_MAPPING[action]

          end
        end

        protected
        def translated_actions
          return nil unless actions
          actions.map do |action|
            translate_action(action)
          end
        end

        protected
        def translated_excluded_actions
          return nil unless excluded_actions
          excluded_actions.map { |a| translate_action(a) }
        end

        protected
        def resource_arns
          return nil unless resources
          resources.map do |resource|
            case resource
            when :any    then "*"
            else resource_arn(resource)
            end
          end
        end

        protected
        def resource_arn resource
          resource.to_s
        end

        protected
        def excluded_resource_arns
          return nil unless excluded_resources
          excluded_resources.map do |excluded_resource|
            case excluded_resource
            when :any    then "*"
            else excluded_resource_arn(excluded_resource)
            end
          end
        end

        protected
        def excluded_resource_arn excluded_resource
          excluded_resource.to_s
        end

      end

    end
  end
end
