require 'elasticsearch'
require 'hashie'

# Connect to the ElasticSearch cluster
client = Elasticsearch::Client.new

# Get all the users and map them to an array
resp = Hashie::Mash.new client.search index: "logstash-*",
  body: {
    size: 0,
    facets: { users: { terms: { field: 'user' } } }
  }
users = resp.facets.users.terms.to_a.map { |f| f.term }

# Get a list of all the indexes and aliases
aliases = Hashie::Mash.new client.indices.get_aliases
aliases.each_pair do |index,aliases| 
  # Match the all the Logstash indexes and get the Logstash
  # date stamp from the index name.
  matches = /logstash-(\d{4}.\d{2}.\d{2})/.match index
  if matches 
    # Loop through each user and check to see if the index exists
    # if it doesn't then create the new alias and add a term filter.
    users.each do |user|
      aliasName = "#{user}-#{matches[1]}"
      unless aliases.aliases[aliasName]
        puts "Creating alias #{aliasName} for #{index}"
        client.indices.put_alias index: index, name: aliasName,
          body: {
            filter: { term: { user: user } }
          }
      end
    end
  end
end
