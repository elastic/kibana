# Content management

The content management plugin provides functionality to manage content in Kibana.

## API Methods

The Content Management plugin provides the following methods for managing content:

### Core CRUD Operations

- `get()` - Retrieve a single content item
- `bulkGet()` - Retrieve multiple content items
- `create()` - Create a new content item
- `update()` - Update an existing content item
- `delete()` - Delete a content item
- `search()` - Search for content items
- `mSearch()` - Multi-type search across content

### Access Control

- `changeAccessMode()` - Change the access mode for content items

**Note**: `changeAccessMode` is implemented as a dedicated service (similar to `mSearch`) rather than a CRUD operation, since it operates across multiple content types and doesn't fit the traditional Create/Read/Update/Delete paradigm.

## Testing

Many parts of the Content Management service are implemented *in-memory*, hence it
is possible to test big chunks of the Content Management plugin using Jest
tests.

### Elasticsearch Integration tests

Some functionality of the Content Management plugin can be tested using *Kibana
Integration Tests*, which execute tests against a real Elasticsearch instance.

Run integrations tests with:

```bash
yarn test:jest_integration src/platform/plugins/shared/content_management
```
