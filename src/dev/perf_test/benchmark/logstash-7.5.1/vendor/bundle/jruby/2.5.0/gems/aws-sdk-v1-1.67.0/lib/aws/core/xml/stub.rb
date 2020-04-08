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
    module XML

      # This class takes the rules from an XML parser and then
      # returns a stubbed reponse.  This response has placeholder
      # values based on the grammar, e.g.
      #
      # * Lists are stubbed with empty arrays
      # * Indexes become empty hashes
      # * Numeric types are returned as 0
      # * etc
      #
      # This is used primarily to help with the AWS.stub! utility.
      #
      class Stub

        # @param [Hash] rules
        def initialize rules
          @rules = rules
        end

        # @return [Hash]
        attr_reader :rules

        # Returns a hash with stubbed values as if it had parsed
        # an empty xml document.
        # @return [Hash]
        def simulate
          if rules[:children]
            data = stub_data_for(rules)
            apply_empty_indexes(rules, data)
            data
          else
            {}
          end
        end

        # Returns a hash with stubbed values as if it had parsed
        # an empty xml document.
        # @param [Hash] rules An XML::Parser rule set.
        # @return [Hash]
        def self.simulate rules
          stub = Stub.new(rules)
          stub.simulate
        end

        protected
        def stub_data_for rules, data = {}
          rules[:children].each_pair do |name,child_rules|

            # skip ignored elements
            if child_rules[:ignore]
              stub_data_for(child_rules, data) if child_rules[:children]
              next
            end

            orig_data = data
            if wrapper = child_rules[:wrap]
              data[wrapper] ||= {}
              data = data[wrapper]
            end

            ruby_name = child_rules[:rename] ||
              Inflection.ruby_name(name.to_s).to_sym

            if child_rules[:list]
              data[ruby_name] = []
            elsif child_rules[:map]
              data[ruby_name] = {}
            elsif child_rules[:children] and !child_rules[:children].empty?
              data[ruby_name] = stub_data_for(child_rules)
            else
              data[ruby_name] = case child_rules[:type]
                when :integer  then 0
                when :float    then 0.0
                when :time     then Time.now
                when :datetime then Date.parse(Time.now.to_s)
                when :boolean  then false
                else nil
              end
            end

            # restore data incase it was redirected for wrapping
            data = orig_data

          end

          data

        end

        protected
        def apply_empty_indexes rules, data

          return unless rules[:children]

          rules[:children].each_pair do |name,child_rules|
            if index = child_rules[:index]
              data[index[:name]] = {}
            end
            apply_empty_indexes(child_rules, data)
          end

        end

      end
    end
  end
end
