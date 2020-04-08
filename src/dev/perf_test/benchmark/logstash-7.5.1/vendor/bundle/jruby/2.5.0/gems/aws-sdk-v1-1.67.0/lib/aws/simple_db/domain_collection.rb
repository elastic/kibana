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
  class SimpleDB

    # An Enumerable collection representing all your domains in SimpleDB.
    #
    # Use a DomainCollection to create, get and list domains.
    #
    # @example Creating a domain in SimpleDB
    #
    #   sdb = SimpleDB.new
    #   domain = sdb.domains.create('mydomain')
    #
    # @example Getting a domain with indifferent access
    #
    #   domain = sdb.domains[:mydomain]
    #   domain = sdb.domains['mydomain']
    #
    # @example Enumerating domains
    #
    #   sdb.domains.each do |domain|
    #     puts domain.name
    #   end
    #
    # @see Core::Collection
    #
    class DomainCollection

      include Core::Collection::WithLimitAndNextToken

      # Creates a domain in SimpleDB and returns a domain object.
      #
      # @note This operation might take 10 or more seconds to complete.
      # @note Creating a domain in SimpleDB is an idempotent operation;
      #   running it multiple times using the same domain name will not
      #   result in an error.
      # @note You can create up to 250 domains per account.
      # @param [String] domain_name
      # @return [Domain] Returns a new domain with the given name.
      def create(domain_name)
        client.create_domain(:domain_name => domain_name)
        self[domain_name]
      end

      # Returns a domain object with the given name.
      #
      # @note This does not attempt to create the domain if it does not
      #   already exist in SimpleDB.  Use {#create} to add a domain to SDB.
      #
      # @param [String] domain_name The name of the domain to return.
      # @return [Domain] Returns the domain with the given name.
      def [] domain_name
        Domain.new(domain_name.to_s, :config => config)
      end

      protected

      def _each_item next_token, limit, options = {}

        options[:next_token] = next_token if next_token
        options[:max_number_of_domains] = limit if limit

        resp = client.list_domains(options)
        resp.data[:domain_names].each do |name|
          yield(self[name])
        end

        resp.data[:next_token]

      end

    end
  end
end
