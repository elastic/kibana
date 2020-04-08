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

      # # Collection::WithNextToken
      #
      # When making a request to list elements from one of these
      # collections, the response may return a next token.  This indicates
      # there are more results than were returned.  You can not control
      # the number of elements returned with each response.
      #
      # See {AWS::Core::Collection} for documentation on the available
      # collection methods.
      #
      module WithNextToken

        include Model
        include Enumerable
        include Collection

        protected

        def _each_batch options = {}, &block

          limit = _extract_limit(options)

          next_token, skip_count = _extract_next_token(options)

          skipped = 0
          collected = 0

          begin

            offset = 0
            batch = []

            next_token = _each_item(next_token, options.dup) do |item|

              if skipped < skip_count
                skipped += 1
                next
              end

              if limit
                if collected < limit
                  batch << item
                  collected += 1
                else
                  yield(batch)
                  simulated_next_token = {}
                  simulated_next_token[:token] = next_token if next_token
                  simulated_next_token[:offset] = offset + skipped
                  return simulated_next_token
                end
              else
                batch << item
                collected += 1
              end

              offset += 1

            end # _each_item

            yield(batch)

          end until next_token.nil? or (limit and limit == collected)

          next_token.nil? ? nil : { :token => next_token }

        end

        def _extract_next_token options
          next_token = super
          case next_token
          when nil   then [nil, 0]
          when Hash  then [next_token[:token], next_token[:offset] || 0]
          else [next_token, 0]
          end
        end

      end
    end
  end
end
