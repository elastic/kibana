# Saved Object Migrations

This is the system that manages the versioning of saved object indices. It manages changes to the index, including mappings, index templates, and changes to the shape of documents from one version of Kibana to another.

## Source code

Migrations are organized into two folders:

- `kibana_index` - Contains logic that is specific to the Kibana index and which understands Kibana objects such as the kbnServer.
- `core` - The core logic of the migration system, this should always remain index agnostic, and should ideally know nothing about kbnServer, Kibana plugins, etc.


## Testing

Run jest tests: `node scripts/jest --testPathPattern=migrations --watch`
