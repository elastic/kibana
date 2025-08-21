# Elasticsearch Client in Kibana Plugins

Learn how to access and use the Elasticsearch client in your Kibana plugin for data operations, index management, and search functionality.

## Quick Start

### Plugin Start Lifecycle

```typescript
import type { CoreStart, Plugin } from '@kbn/core/server';

export class MyPlugin implements Plugin {
  public start(core: CoreStart) {
    // Get internal user client for system operations
    const esClient = core.elasticsearch.client.asInternalUser;
    
    // Use client for administrative tasks
    await this.initializeIndex(esClient);
  }
}
```

### Route Handler Context

```typescript
router.get(
  { path: '/api/my-plugin/search', validate: false },
  async (context, request, response) => {
    // Get user-scoped client for user operations
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    
    const result = await esClient.search({
      index: 'my-index',
      body: { query: { match_all: {} } }
    });
    
    return response.ok({ body: result });
  }
);
```

## Client Types

### asCurrentUser vs asInternalUser

| Client | Use Case | Permissions | Example |
|--------|----------|-------------|---------|
| `asCurrentUser` | User-initiated operations | User's permissions | Search, user data access |
| `asInternalUser` | System operations | Full admin access | Index creation, migrations |

> [!IMPORTANT]
> Never use `asInternalUser` in route handlers for user requests - always use `asCurrentUser` to respect permissions.

## Core Patterns

### Basic Search Operation

```typescript
async function searchDocuments(esClient: ElasticsearchClient, query: string) {
  const response = await esClient.search({
    index: 'my-app-data',
    body: {
      query: {
        multi_match: {
          query,
          fields: ['title^2', 'content']
        }
      },
      size: 20,
      sort: [{ created_at: { order: 'desc' } }]
    }
  });
  
  return response.body.hits.hits.map(hit => ({
    id: hit._id,
    score: hit._score,
    ...hit._source
  }));
}
```

### Index Document

```typescript
async function indexDocument(esClient: ElasticsearchClient, doc: any) {
  try {
    const response = await esClient.index({
      index: 'my-app-data',
      body: {
        ...doc,
        timestamp: new Date().toISOString()
      },
      refresh: 'wait_for' // Ensure immediately searchable
    });
    
    return response.body._id;
  } catch (error) {
    if (error.statusCode === 409) {
      throw new Error('Document already exists');
    }
    throw error;
  }
}
```

### Bulk Operations

```typescript
async function bulkIndex(esClient: ElasticsearchClient, documents: any[]) {
  const body = documents.flatMap(doc => [
    { index: { _index: 'my-app-data' } },
    doc
  ]);
  
  const response = await esClient.bulk({
    body,
    refresh: 'wait_for'
  });
  
  if (response.body.errors) {
    const errors = response.body.items
      .filter((item: any) => item.index?.error)
      .map((item: any) => item.index.error);
    throw new Error(`Bulk index errors: ${JSON.stringify(errors)}`);
  }
  
  return response.body.items.map((item: any) => item.index._id);
}
```

## Safe Index Initialization

### Concurrent-Safe Index Creation

For multi-instance environments, use this pattern to safely initialize indices:

```typescript
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

async function ensureIndexReady(
  esClient: ElasticsearchClient, 
  indexName: string, 
  mappings: object
) {
  try {
    // Attempt index creation with long timeout
    await esClient.indices.create(
      {
        index: indexName,
        mappings,
        settings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1' // Works on single and multi-node clusters
        },
        timeout: '300s'
      },
      { requestTimeout: 310_000 }
    );
  } catch (error) {
    // Expected when multiple instances start simultaneously
    if (error?.body?.error?.type !== 'resource_already_exists_exception') {
      throw error;
    }
    // Do NOT log this as error - it's expected behavior
  }

  // Wait for index to be ready (critical for serverless)
  await esClient.cluster.health(
    {
      index: indexName,
      wait_for_status: 'green', // Required for serverless
      timeout: '300s'
    },
    { requestTimeout: 310_000 }
  );
}
```

### Plugin Implementation

```typescript
export class MyPlugin implements Plugin {
  private logger = this.initializerContext.logger.get();

  public start(core: CoreStart) {
    const esClient = core.elasticsearch.client.asInternalUser;
    
    this.initializeIndices(esClient).catch(error => {
      this.logger.error(`Failed to initialize indices: ${error.message}`);
    });
  }

  private async initializeIndices(esClient: ElasticsearchClient) {
    const mappings = {
      properties: {
        title: { type: 'text', analyzer: 'standard' },
        content: { type: 'text' },
        tags: { type: 'keyword' },
        created_at: { type: 'date' },
        user_id: { type: 'keyword' }
      }
    };

    await ensureIndexReady(esClient, 'my-app-documents', mappings);
    await ensureIndexReady(esClient, 'my-app-analytics', {
      properties: {
        event_type: { type: 'keyword' },
        timestamp: { type: 'date' },
        user_data: { type: 'object' }
      }
    });
    
    this.logger.info('All indices initialized successfully');
  }
}
```

## Advanced Operations

### Index Templates

```typescript
async function createIndexTemplate(esClient: ElasticsearchClient) {
  await esClient.indices.putTemplate({
    name: 'my-app-logs-template',
    body: {
      index_patterns: ['my-app-logs-*'],
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          level: { type: 'keyword' },
          message: { type: 'text' },
          service: { type: 'keyword' }
        }
      },
      settings: {
        number_of_shards: 1,
        'index.lifecycle.name': 'my-app-policy'
      }
    }
  });
}
```

### Aggregations

```typescript
async function getAnalytics(esClient: ElasticsearchClient, dateRange: [string, string]) {
  const response = await esClient.search({
    index: 'my-app-analytics',
    body: {
      query: {
        range: {
          timestamp: {
            gte: dateRange[0],
            lte: dateRange[1]
          }
        }
      },
      aggs: {
        events_over_time: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: '1d'
          }
        },
        popular_events: {
          terms: {
            field: 'event_type',
            size: 10
          }
        },
        unique_users: {
          cardinality: {
            field: 'user_id'
          }
        }
      },
      size: 0 // Only return aggregations
    }
  });
  
  return {
    timeline: response.body.aggregations.events_over_time.buckets,
    topEvents: response.body.aggregations.popular_events.buckets,
    uniqueUsers: response.body.aggregations.unique_users.value
  };
}
```

### Update by Query

```typescript
async function updateUserDocuments(
  esClient: ElasticsearchClient, 
  userId: string, 
  updates: object
) {
  const response = await esClient.updateByQuery({
    index: 'my-app-documents',
    body: {
      query: {
        term: { user_id: userId }
      },
      script: {
        source: Object.entries(updates)
          .map(([key, value]) => `ctx._source.${key} = params.${key}`)
          .join('; '),
        params: updates
      }
    },
    refresh: true,
    conflicts: 'proceed'
  });
  
  return {
    updated: response.body.updated,
    conflicts: response.body.version_conflicts
  };
}
```

## Error Handling

### Robust Error Handling

```typescript
async function safeElasticsearchOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Handle common Elasticsearch errors
    if (error.statusCode === 404) {
      throw new Error(`${operationName}: Resource not found`);
    }
    
    if (error.statusCode === 429) {
      throw new Error(`${operationName}: Rate limit exceeded, try again later`);
    }
    
    if (error.statusCode >= 500) {
      throw new Error(`${operationName}: Elasticsearch server error`);
    }
    
    // Connection issues
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error(`${operationName}: Cannot connect to Elasticsearch`);
    }
    
    throw new Error(`${operationName}: ${error.message}`);
  }
}

// Usage
const results = await safeElasticsearchOperation(
  () => esClient.search({ index: 'my-index', body: { query: { match_all: {} } } }),
  'Search documents'
);
```

### Circuit Breaker Pattern

```typescript
class ElasticsearchService {
  private isHealthy = true;
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000; // 30 seconds

  async performOperation(esClient: ElasticsearchClient, operation: Function) {
    await this.checkHealth(esClient);
    
    if (!this.isHealthy) {
      throw new Error('Elasticsearch is currently unhealthy');
    }
    
    try {
      return await operation();
    } catch (error) {
      if (error.statusCode >= 500) {
        this.isHealthy = false;
      }
      throw error;
    }
  }

  private async checkHealth(esClient: ElasticsearchClient) {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return;
    }

    try {
      await esClient.cluster.health({ timeout: '5s' });
      this.isHealthy = true;
    } catch (error) {
      this.isHealthy = false;
    }
    
    this.lastHealthCheck = now;
  }
}
```

## Security Best Practices

### User Permissions in Routes

```typescript
// ✅ Correct - respects user permissions
router.get('/api/user-data', async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  
  const userDocs = await esClient.search({
    index: 'user-documents',
    body: {
      query: {
        term: { owner: request.auth.credentials.username }
      }
    }
  });
  
  return response.ok({ body: userDocs.body.hits.hits });
});

// ❌ Wrong - bypasses security
router.get('/api/user-data', async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asInternalUser; // Don't do this!
  // ... rest of implementation
});
```

### Data Access Patterns

```typescript
// Safe user data access
async function getUserAccessibleData(
  esClient: ElasticsearchClient, 
  userId: string,
  permissions: string[]
) {
  const mustClauses = [
    { term: { user_id: userId } }
  ];
  
  // Add permission-based filters
  if (!permissions.includes('admin')) {
    mustClauses.push({
      terms: { visibility: ['public', 'shared'] }
    });
  }
  
  return esClient.search({
    index: 'documents',
    body: {
      query: {
        bool: { must: mustClauses }
      }
    }
  });
}
```

## Performance Optimization

### Search Optimization

```typescript
async function optimizedSearch(esClient: ElasticsearchClient, params: SearchParams) {
  return esClient.search({
    index: 'my-index',
    body: {
      query: params.query,
      _source: ['title', 'summary'], // Only return needed fields
      highlight: {
        fields: { content: {} }
      },
      sort: [
        { _score: { order: 'desc' } },
        { created_at: { order: 'desc' } }
      ]
    },
    size: params.size || 10,
    from: params.from || 0,
    timeout: '30s', // Prevent long-running queries
    preference: '_local' // Use local shard copies when possible
  });
}
```

### Connection Pooling

```typescript
// Configure client connection settings in plugin setup
const esClient = core.elasticsearch.client.asInternalUser;

// Use keepAlive for persistent connections
const searchWithKeepAlive = await esClient.search({
  index: 'my-index',
  body: { query: { match_all: {} } }
}, {
  requestTimeout: 30000,
  maxRetries: 3
});
```

## Key Guidelines

1. **Use appropriate client type** - `asCurrentUser` for user operations, `asInternalUser` for system tasks
2. **Handle concurrent initialization** - Use `resource_already_exists_exception` pattern
3. **Wait for green status** - Critical for serverless environments  
4. **Implement error handling** - Network failures, permission errors, rate limits
5. **Optimize queries** - Use `_source` filtering, timeouts, and appropriate indices
6. **Respect security** - Never bypass user permissions with `asInternalUser` in routes

This guide provides production-ready patterns for reliable Elasticsearch integration in Kibana plugins.