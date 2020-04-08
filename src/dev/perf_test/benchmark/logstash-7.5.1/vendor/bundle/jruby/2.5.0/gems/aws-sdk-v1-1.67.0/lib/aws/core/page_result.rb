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
    class PageResult < Array

      # @return [Collection] Returns the collection that was used to
      #   populated this page of results.
      attr_reader :collection

      # @return [Integer] Returns the maximum number of results per page.
      #   The final page in a collection may return fewer than `:per_page`
      #   items (e.g. `:per_page` is 10 and there are only 7 items).
      attr_reader :per_page

      # @return [String] An opaque token that can be passed the #page method
      #   of the collection that returned this page of results.  This next
      #   token behaves as a pseudo offset.  If `next_token` is `nil` then
      #   there are no more results for the collection.
      attr_reader :next_token

      # @param [Collection] collection The collection that was used to
      #   request this page of results.  The collection should respond to
      #   #page and accept a :next_token option.
      #
      # @param [Array] items An array of result items that represent a
      #   page of results.
      #
      # @param [Integer] per_page The number of requested items for this
      #   page of results.  If the count of items is smaller than `per_page`
      #   then this is the last page of results.
      #
      # @param [String] next_token (nil) A token that can be passed to the
      #
      def initialize collection, items, per_page, next_token
        @collection = collection
        @per_page = per_page
        @next_token = next_token
        super(items)
      end

      # @return [PageResult]
      # @raise [RuntimeError] Raises a runtime error when called against
      #   a collection that has no more results (i.e. #last_page? == true).
      def next_page
        if last_page?
          raise 'unable to get the next page, already at the last page'
        end
        collection.page(:per_page => per_page, :next_token => next_token)
      end

      # @return [Boolean] Returns `true` if this is the last page of results.
      def last_page?
        next_token.nil?
      end

      # @return [Boolean] Returns `true` if there are more pages of results.
      def more?
        !!next_token
      end

    end
  end
end
