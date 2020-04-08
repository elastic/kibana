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

      # # Collection::WithLimitAndNextToken
      #
      # This module is used by collections where the service may truncate
      # responses but that also accept a upper limit of results to
      # return in a single request.
      #
      # See {AWS::Core::Collection} for documentation on the available
      # methods.
      #
      module WithLimitAndNextToken

        include Model
        include Collection
        include Enumerable

        protected

        def _each_batch options = {}, &block

          limit = _extract_limit(options)
          batch_size = _extract_batch_size(options)
          next_token = _extract_next_token(options)

          total = 0  # count of items yeilded across all batches

          begin

            max = nil
            if limit or batch_size
              max = []
              max << (limit - total) if limit
              max << batch_size if batch_size
              max = max.min
            end

            batch = []
            next_token = _each_item(next_token, max, options.dup) do |item|

              total += 1
              batch << item

            end

            yield(batch)

          end until next_token.nil? or (limit and limit == total)

          next_token

        end
      end
    end
  end
end
