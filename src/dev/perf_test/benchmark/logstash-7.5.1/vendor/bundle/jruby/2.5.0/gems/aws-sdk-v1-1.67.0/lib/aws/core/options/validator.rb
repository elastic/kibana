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
  module Core
    module Options

      # Given a hash of validation rules, a validator validate request
      # options.  Validations support:
      #
      #   * rejecting unknown options
      #   * ensuring presence of required options
      #   * validating expected option types (e.g. hash, array, string,
      #     integer, etc).
      #
      # After validating, a hash of request options is returned with
      # with normalized values (with converted types).
      class Validator

        # @param [Hash] rules A hash of option rules to validate against.
        def initialize rules
          @rules = rules
        end

        # @return [Hash]
        attr_reader :rules

        # @overload validate!(request_options)
        #   @param [Hash] request_options The hash of options to validate.
        #   @raise [ArgumentError] Raised when the options do not validate.
        #   @return [Hash]
        def validate! request_options, rules = @rules

          # Verify all required options are present.
          rules.each_pair do |opt_name, opt_rules|
            if opt_rules[:required]
              unless request_options.key?(opt_name)
                raise ArgumentError, "missing required option #{opt_name.inspect}"
              end
            end
          end

          request_options.inject({}) do |options, (opt_name, value)|

            # Ensure this is a valid/accepted option
            unless rules.key?(opt_name)
              raise ArgumentError, "unexpected option #{opt_name.inspect}"
            end

            # Validate and convert the value
            valid_value = validate_value(rules[opt_name], value, opt_name)

            options.merge(opt_name => valid_value)

          end
        end

        protected

        # Proxies calls to the correct validation method based on the
        # rules[:type].
        def validate_value *args
          send("validate_#{args.first[:type]}", *args)
        end

        # Ensures the value is a hash and validates the hash context.
        def validate_hash rules, value, opt_name, context = nil
          unless value.respond_to?(:to_hash)
            format_error('hash value', opt_name, context)
          end
          validate!(value.to_hash, rules[:members])
        end

        def validate_map rules, value, opt_name, context = nil
          unless value.respond_to?(:to_hash)
            format_error('hash value', opt_name, context)
          end
          value.inject({}) do |values,(k,v)|
            context = "member #{k.inspect} of :#{opt_name}"
            values[k] = validate_value(rules[:members], v, opt_name, context)
            values
          end
        end

        # Ensures the value is an array (or at least enumerable) and
        # that the yielded values are valid.
        def validate_array rules, value, opt_name, context = nil
          unless value.respond_to?(:each)
            format_error('enumerable value', opt_name, context)
          end
          values = []
          value.each do |v|
            context = "member #{values.size} of :#{opt_name}"
            values << validate_value(rules[:members], v, opt_name, context)
          end
          values
        end

        # Ensures the value is a string.
        def validate_string rules, value, opt_name, context = nil

          unless value.respond_to?(:to_str)
            format_error('string value', opt_name, context)
          end

          rules[:lstrip] ?
            value.to_str.sub(/^#{rules[:lstrip]}/, '') :
            value.to_str
        end

        # Ensures the value is a boolean.
        def validate_boolean rules, value, opt_name, context = nil
          unless [true, false].include?(value)
            format_error('true or false', opt_name, context)
          end
          value
        end

        # Ensures the value is an integer.
        def validate_integer rules, value, opt_name, context = nil
          unless value.respond_to?(:to_int)
            format_error('integer value', opt_name, context)
          end
          value.to_int
        end

        # Ensures the value is a timestamp.
        def validate_timestamp rules, value, opt_name, context = nil
          # TODO : add validation to timestamps values
          value.to_s
        end

        def validate_blob rules, value, opt_name, context = nil
          value
        end

        def format_error description, opt_name, context
          context = context || "option :#{opt_name}"
          raise ArgumentError, "expected #{description} for #{context}"
        end

      end
    end
  end
end
