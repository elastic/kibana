# API Keys API Service

The API Keys service provides methods to manage Elasticsearch/Kibana API keys programmatically in Scout tests.

## Usage

The API Keys service is available through the `apiServices` fixture:

```ts
import { test, expect } from '@kbn/scout';

test.describe('API Keys tests', () => {
  test('create and use an API key', async ({ apiServices }) => {
    // Create an API key
    const { data: apiKey } = await apiServices.apiKeys.create({
      name: 'my-test-key',
      expiration: '1d',
      role_descriptors: {
        my_role: {
          cluster: ['monitor'],
          indices: [
            {
              names: ['logs-*'],
              privileges: ['read'],
            },
          ],
        },
      },
      metadata: {
        application: 'test',
        environment: 'development',
      },
    });

    expect(apiKey.id).toBeDefined();
    expect(apiKey.encoded).toBeDefined();
  });
});
```

## API Reference

### `create(params: CreateAPIKeyParams)`

Create a new API key.

**Parameters:**
- `name` (string): Name of the API key
- `expiration` (string, optional): Expiration time (e.g., '1d', '7d', '90d')
- `role_descriptors` (object, optional): Role descriptors defining privileges
- `metadata` (object, optional): Metadata to associate with the key

**Returns:** `Promise<ApiResponse<CreateAPIKeyResult>>`

**Example:**
```ts
const { data: apiKey } = await apiServices.apiKeys.create({
  name: 'my-api-key',
  expiration: '7d',
  metadata: { created_by: 'test-suite' },
});
```

---

### `update(params: UpdateAPIKeyParams)`

Update an existing API key's role descriptors or metadata.

**Parameters:**
- `id` (string): ID of the API key to update
- `role_descriptors` (object, optional): Updated role descriptors
- `metadata` (object, optional): Updated metadata

**Returns:** `Promise<ApiResponse<UpdateAPIKeyResult>>`

**Example:**
```ts
const { data: result } = await apiServices.apiKeys.update({
  id: 'api-key-id',
  metadata: { updated_at: Date.now() },
});
```

---

### `grant(params: GrantAPIKeyParams)`

Grant an API key on behalf of another user.

**Parameters:**
- `api_key`: API key creation parameters
- `grant_type`: Grant type ('password' or 'access_token')
- `username` (string, optional): Username for password grant
- `password` (string, optional): Password for password grant
- `access_token` (string, optional): Access token for token grant
- `run_as` (string, optional): User to run as

**Returns:** `Promise<ApiResponse<GrantAPIKeyResult>>`

**Example:**
```ts
const { data: apiKey } = await apiServices.apiKeys.grant({
  api_key: {
    name: 'granted-key',
    expiration: '1d',
  },
  grant_type: 'password',
  username: 'elastic',
  password: 'changeme',
  run_as: 'test_user',
});
```

---

### `query(params?: QueryAPIKeyParams)`

Query API keys with filtering and pagination.

**Parameters:**
- `query` (object, optional): Elasticsearch query DSL
- `from` (number, optional): Starting position for pagination
- `size` (number, optional): Number of results to return
- `sort` (array, optional): Sort configuration
- `filters` (object, optional): Filters to apply
  - `usernames` (string[]): Filter by usernames
  - `type` ('rest' | 'managed' | 'cross_cluster'): Filter by type
  - `expired` (boolean): Filter by expiration status

**Returns:** `Promise<ApiResponse<QueryAPIKeyResult>>`

**Example:**
```ts
const { data: results } = await apiServices.apiKeys.query({
  filters: {
    type: 'rest',
    expired: false,
  },
  from: 0,
  size: 100,
});

console.log(`Found ${results.total} API keys`);
results.api_keys.forEach(key => {
  console.log(`- ${key.name} (ID: ${key.id})`);
});
```

---

### `invalidate(params: InvalidateAPIKeyParams)`

Invalidate (delete) one or more API keys.

**Parameters:**
- `apiKeys` (array): Array of API keys to invalidate (each with `id` and `name`)
- `isAdmin` (boolean, optional): Whether to invalidate as admin

**Returns:** `Promise<ApiResponse<InvalidateAPIKeyResult>>`

**Example:**
```ts
const { data: result } = await apiServices.apiKeys.invalidate({
  apiKeys: [
    { id: 'key-id-1', name: 'key-1' },
    { id: 'key-id-2', name: 'key-2' },
  ],
  isAdmin: true,
});

console.log(`Invalidated ${result.itemsInvalidated.length} keys`);
if (result.errors.length > 0) {
  console.log(`Errors: ${result.errors.length}`);
}
```

---

## Cleanup Utilities

The API Keys service provides cleanup utilities for managing API keys in tests:

### `cleanup.deleteAll()`

Delete all API keys in the cluster.

**Returns:** `Promise<ApiStatusResponse>`

**Example:**
```ts
test.afterAll(async ({ apiServices }) => {
  await apiServices.apiKeys.cleanup.deleteAll();
});
```

---

### `cleanup.deleteByName(namePattern: string)`

Delete API keys by name pattern (supports wildcards).

**Parameters:**
- `namePattern` (string): Name or pattern to match

**Returns:** `Promise<ApiStatusResponse>`

**Example:**
```ts
test.afterAll(async ({ apiServices }) => {
  // Delete all keys starting with 'test-'
  await apiServices.apiKeys.cleanup.deleteByName('test-*');
});
```

---

### `cleanup.deleteByIds(ids: string[])`

Delete API keys by their IDs.

**Parameters:**
- `ids` (string[]): Array of API key IDs

**Returns:** `Promise<ApiStatusResponse>`

**Example:**
```ts
test.afterAll(async ({ apiServices }) => {
  await apiServices.apiKeys.cleanup.deleteByIds(['id1', 'id2', 'id3']);
});
```

---

## Common Patterns

### Test Setup and Teardown

```ts
test.describe('My feature', () => {
  let apiKeyId: string;

  test.beforeAll(async ({ apiServices }) => {
    // Clean up any existing test keys
    await apiServices.apiKeys.cleanup.deleteByName('test-*');
    
    // Create a test key
    const { data: apiKey } = await apiServices.apiKeys.create({
      name: 'test-key',
      expiration: '1d',
    });
    apiKeyId = apiKey.id;
  });

  test.afterAll(async ({ apiServices }) => {
    // Clean up
    await apiServices.apiKeys.cleanup.deleteByIds([apiKeyId]);
  });

  test('my test', async ({ apiServices }) => {
    // Use the API key
  });
});
```

### Creating Cross-Cluster API Keys

```ts
const { data: apiKey } = await apiServices.apiKeys.create({
  name: 'cross-cluster-key',
  expiration: '7d',
  access: {
    search: [
      {
        names: ['logs-*', 'metrics-*'],
        allow_restricted_indices: false,
      },
    ],
    replication: [
      {
        names: ['*'],
      },
    ],
  },
});
```

### Querying with Filters

```ts
// Get all active REST API keys
const { data: activeKeys } = await apiServices.apiKeys.query({
  filters: {
    type: 'rest',
    expired: false,
  },
});

// Get API keys for specific users
const { data: userKeys } = await apiServices.apiKeys.query({
  filters: {
    usernames: ['user1', 'user2'],
  },
});
```

## Error Handling

All methods return an `ApiResponse` with status information. Handle errors appropriately:

```ts
try {
  const { data, status } = await apiServices.apiKeys.create({
    name: 'my-key',
  });
  
  if (status === 200 || status === 201) {
    console.log('API key created successfully');
  }
} catch (error) {
  console.error('Failed to create API key:', error);
}
```

## Related Documentation

- [Elasticsearch API Keys Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-create-api-key.html)
- [Kibana Security API](https://www.elastic.co/guide/en/kibana/current/api-keys.html)
- [Scout API Services](../../README.md)

