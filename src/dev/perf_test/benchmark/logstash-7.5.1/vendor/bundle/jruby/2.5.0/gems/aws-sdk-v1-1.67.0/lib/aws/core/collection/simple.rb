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
    module Collection

      # AWS::Core::Collection::Simple is used by collections that always
      # recieve every matching items in a single response.
      #
      # This means:
      #
      # * Paging methods are simulated
      #
      # * Next tokens are artificial (guessable numeric offsets)
      #
      # AWS services generally return all items only for requests with a
      # small maximum number of results.
      #
      # See {AWS::Core::Collection} for documentation on the available
      # collection methods.
      module Simple

        include Model
        include Enumerable
        include Collection

        protected

        def _each_batch options = {}, &block

          limit = _extract_limit(options)
          next_token = _extract_next_token(options)
          offset = next_token ? next_token.to_i - 1 : 0

          total = 0
          skipped = 0
          simulated_next_token = nil

          batch = []
          _each_item(options.dup) do |item|

            total += 1

            # skip until we reach our offset (derived from the "next token")
            if skipped < offset
              skipped += 1
              next
            end

            if limit
              if batch.size < limit
                batch << item
              else
                simulated_next_token = total
                break
              end
            else
              batch << item
            end

          end

          yield(batch)

          simulated_next_token

        end
      end
    end
  end
end
