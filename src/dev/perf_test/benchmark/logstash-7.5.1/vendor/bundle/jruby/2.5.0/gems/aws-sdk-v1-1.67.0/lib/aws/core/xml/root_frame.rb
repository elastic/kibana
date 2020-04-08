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

      class RootFrame < Frame

        def initialize rules
          @inflected = {}
          @indexes = {}
          setup_indexes(rules)
          super(self, nil, 'XML', rules)
        end

        def build_child_frame element_name
          Frame.new(self, self, element_name, rules)
        end

        def value
          value = @data.values.find{|v| v.is_a?(Hash) }
          value ||= {}
          value.merge(@indexes)
        end

        def add_to_index index_name, key, value
          @indexes[index_name] ||= {}
          @indexes[index_name][key] = value
        end

        # The root frame maintains a cache of inflected element names.
        def inflect element_name
          @inflected[element_name] ||= Inflection.ruby_name(element_name).to_sym
        end

        protected

        # recursively crawls the parser rules and looks for elements
        # that index values.  Adds an empty index for each of these.
        def setup_indexes rules
          if rules[:children]
            rules[:children].each_pair do |child_name,child_rules|
              if index = child_rules[:index]
                @indexes[index[:name]] = {}
              end
              setup_indexes(child_rules)
            end
          end
        end

      end
    end
  end
end
