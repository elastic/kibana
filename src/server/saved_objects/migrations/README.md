# Saved Object Migrations

This is the system that manages the versioning of saved object indices. It manages changes to index mappings, and will eventually contain logic to upgrade documents and indices from one Kibana version to another.


## Source organization

It is broken into two sub folders:

- `kibana_index` - Contains logic that is specific to the Kibana index and which understands Kibana objects such as the kbnServer.
- `core` - The core logic of the migration system, this should always remain index agnostic, and should ideally know nothing about kbnServer, Kibana plugins, etc.
