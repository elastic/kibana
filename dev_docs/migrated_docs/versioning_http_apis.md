# Versioning HTTP APIs in Kibana

Learn how to create maintainable, versionable HTTP APIs that support backward compatibility and graceful evolution over time.

## Quick Start

### Versioned Route Example

```typescript
router.versioned
  .post({
    access: 'public',
    path: '/api/my-app/documents/{id?}',
    options: { timeout: { payload: 60000 } }
  })
  .addVersion(
    {
      version: '2023-10-31',
      validate: {
        request: {
          params: schema.object({
            id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 }))
          }),
          body: schema.object({ 
            title: schema.string({ minLength: 1, maxLength: 100 }),
            content: schema.string()
          })
        },
        response: {
          200: {
            body: schema.object({ 
              id: schema.string(),
              title: schema.string(),
              created_at: schema.string()
            })
          }
        }
      }
    },
    async (ctx, req, res) => {
      const document = await ctx.documentService.create(req.body);
      return res.ok({ body: document });
    }
  );
```

### Client Usage

```typescript
// Browser client usage
core.http.post('/api/my-app/documents', {
  version: '2023-10-31',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ 
    title: 'My Document',
    content: 'Document content here'
  })
});
```

## API Design Principles

### 1. Don't Expose Persistence Schemas

> [!WARNING]
> Never directly expose your database or saved object schemas in HTTP responses.

```typescript
// ❌ Bad - directly exposes saved object attributes
router.get('/api/documents/{id}', (ctx, req, res) => {
  const doc = await savedObjects.client.get('document', req.params.id);
  return res.ok({ body: { ...doc.attributes } }); // Direct exposure!
});

// ✅ Good - explicit HTTP interface
interface GetDocumentResponse {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

router.get('/api/documents/{id}', (ctx, req, res) => {
  const doc = await savedObjects.client.get('document', req.params.id);
  
  // Explicit mapping creates translation layer
  const response: GetDocumentResponse = {
    id: doc.id,
    title: doc.attributes.title,
    content: doc.attributes.content,
    createdAt: doc.attributes.created_at
  };
  
  return res.ok({ body: response });
});
```

### 2. Strict Input Validation

```typescript
// ❌ Too permissive
const badSchema = schema.object({
  name: schema.string(), // Any string
  duration: schema.number() // Any number
});

// ✅ Specific validation rules
const goodSchema = schema.object({
  name: schema.string({
    minLength: 3,
    maxLength: 100,
    validate: (name) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return 'Name must contain only alphanumeric characters, underscores, and hyphens';
      }
    }
  }),
  duration: schema.number({ 
    min: 0, 
    max: 86400000 // Max 24 hours in milliseconds
  })
});
```

### 3. Keep Interfaces Narrow

```typescript
// ❌ Too broad - accepts any sort field
const broadSchema = schema.object({
  sortBy: schema.string() // Could be anything!
});

// ✅ Narrow - known set of values
const narrowSchema = schema.object({
  sortBy: schema.oneOf([
    schema.literal('created_at'),
    schema.literal('title'),
    schema.literal('popularity')
  ])
});

router.get('/api/documents/search', {
  validate: { query: narrowSchema }
}, async (ctx, req, res) => {
  // Map HTTP sort field to internal field
  const sortFieldMap = {
    created_at: 'attributes.createdAt',
    title: 'attributes.title',
    popularity: 'attributes.views'
  };
  
  const results = await savedObjects.client.find({
    type: 'document',
    sortField: sortFieldMap[req.query.sortBy]
  });
  
  return res.ok({ body: results });
});
```

## Version Management

### Public vs Internal APIs

| Type | Audience | Versioning | Stability |
|------|----------|------------|-----------|
| **Public** | External integrations | Required | High - breaking changes need major version |
| **Internal** | Kibana plugins | Optional | Medium - can evolve with coordination |

> [!NOTE]
> **Internal vs Public HTTP APIs**: HTTP APIs may be intended for **internal** or **public** use. Different levels of rigour are appropriate when designing and managing changes for each. However, in both cases we must support some minimal set of past HTTP APIs.

### Version Formats

**Public APIs**: Use date format `YYYY-MM-DD`
```typescript
version: '2023-10-31' // Release date
```

**Internal APIs**: Use simple integer versioning
```typescript
version: '1' // Major version only
```

### Managing Multiple Versions

```typescript
router.versioned
  .get({
    access: 'public',
    path: '/api/documents/{id}',
    summary: 'Get document by ID'
  })
  // Version 1 - original format
  .addVersion({
    version: '2023-10-31',
    validate: {
      request: {
        params: schema.object({
          id: schema.string()
        })
      },
      response: {
        200: {
          body: schema.object({
            title: schema.string(),
            content: schema.string()
          })
        }
      }
    }
  }, async (ctx, req, res) => {
    const doc = await getDocument(req.params.id);
    return res.ok({
      body: { title: doc.title, content: doc.content }
    });
  })
  // Version 2 - added metadata
  .addVersion({
    version: '2024-03-15',
    validate: {
      request: {
        params: schema.object({
          id: schema.string()
        })
      },
      response: {
        200: {
          body: schema.object({
            title: schema.string(),
            content: schema.string(),
            metadata: schema.object({
              createdAt: schema.string(),
              author: schema.string(),
              tags: schema.arrayOf(schema.string())
            })
          })
        }
      }
    }
  }, async (ctx, req, res) => {
    const doc = await getDocument(req.params.id);
    return res.ok({
      body: {
        title: doc.title,
        content: doc.content,
        metadata: {
          createdAt: doc.createdAt,
          author: doc.author,
          tags: doc.tags
        }
      }
    });
  });
```

## Real-World Examples

### Creating a Document API

```typescript
// Define HTTP interfaces separately from persistence
interface CreateDocumentRequest {
  title: string;
  content: string;
  tags?: string[];
}

interface CreateDocumentResponse {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

// Persistence layer (separate from HTTP)
interface DocumentAttributes {
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  author_id: string;
}

router.versioned
  .post({
    access: 'public',
    path: '/api/documents',
    summary: 'Create a new document'
  })
  .addVersion({
    version: '2023-10-31',
    validate: {
      request: {
        body: schema.object({
          title: schema.string({ 
            minLength: 1, 
            maxLength: 200 
          }),
          content: schema.string({ 
            maxLength: 1000000 // 1MB limit
          }),
          tags: schema.maybe(schema.arrayOf(
            schema.string({ maxLength: 50 }),
            { maxSize: 10 }
          ))
        })
      },
      response: {
        201: {
          body: schema.object({
            id: schema.string(),
            title: schema.string(),
            content: schema.string(),
            createdAt: schema.string()
          })
        }
      }
    }
  }, async (ctx, req, res) => {
    const { core } = await ctx.core;
    const request = req.body as CreateDocumentRequest;
    
    // Business logic validation
    if (request.content.length === 0) {
      return res.badRequest({
        body: { message: 'Content cannot be empty' }
      });
    }
    
    // Transform HTTP request to persistence model
    const documentAttrs: DocumentAttributes = {
      title: request.title,
      content: request.content,
      tags: request.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_id: req.auth.credentials.username
    };
    
    // Persist to storage
    const savedDoc = await core.savedObjects.client.create(
      'document',
      documentAttrs
    );
    
    // Transform persistence model to HTTP response
    const response: CreateDocumentResponse = {
      id: savedDoc.id,
      title: savedDoc.attributes.title,
      content: savedDoc.attributes.content,
      createdAt: savedDoc.attributes.created_at
    };
    
    return res.created({ body: response });
  });
```

### Search API with Pagination

```typescript
interface SearchDocumentsRequest {
  query?: string;
  tags?: string[];
  sortBy?: 'relevance' | 'created_at' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

interface SearchDocumentsResponse {
  documents: Array<{
    id: string;
    title: string;
    excerpt: string;
    tags: string[];
    createdAt: string;
  }>;
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

router.versioned
  .get({
    access: 'public',
    path: '/api/documents/search'
  })
  .addVersion({
    version: '2023-10-31',
    validate: {
      request: {
        query: schema.object({
          query: schema.maybe(schema.string({ maxLength: 200 })),
          tags: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10 })),
          sortBy: schema.maybe(schema.oneOf([
            schema.literal('relevance'),
            schema.literal('created_at'),
            schema.literal('title')
          ])),
          sortOrder: schema.maybe(schema.oneOf([
            schema.literal('asc'),
            schema.literal('desc')
          ])),
          page: schema.maybe(schema.number({ min: 1, max: 1000 })),
          perPage: schema.maybe(schema.number({ min: 1, max: 100 }))
        })
      }
    }
  }, async (ctx, req, res) => {
    const { core } = await ctx.core;
    const {
      query = '',
      tags = [],
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      perPage = 20
    } = req.query as SearchDocumentsRequest;
    
    // Build Elasticsearch query
    const must: any[] = [];
    
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^2', 'content']
        }
      });
    }
    
    if (tags.length > 0) {
      must.push({
        terms: { 'tags.keyword': tags }
      });
    }
    
    // Map sort fields
    const sortMap = {
      relevance: [{ _score: { order: sortOrder } }],
      created_at: [{ created_at: { order: sortOrder } }],
      title: [{ 'title.keyword': { order: sortOrder } }]
    };
    
    const searchResult = await core.elasticsearch.client.asCurrentUser.search({
      index: 'documents',
      body: {
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
        sort: sortMap[sortBy],
        highlight: {
          fields: { content: { fragment_size: 150 } }
        },
        from: (page - 1) * perPage,
        size: perPage
      }
    });
    
    // Transform results
    const response: SearchDocumentsResponse = {
      documents: searchResult.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        title: hit._source.title,
        excerpt: hit.highlight?.content?.[0] || hit._source.content.substring(0, 150),
        tags: hit._source.tags,
        createdAt: hit._source.created_at
      })),
      pagination: {
        page,
        perPage,
        total: searchResult.body.hits.total.value,
        totalPages: Math.ceil(searchResult.body.hits.total.value / perPage)
      }
    };
    
    return res.ok({ body: response });
  });
```

### Breaking Change Evolution

```typescript
// Version 1: Simple document update
.addVersion({
  version: '2023-10-31',
  validate: {
    request: {
      body: schema.object({
        title: schema.string(),
        content: schema.string()
      })
    }
  }
}, async (ctx, req, res) => {
  // V1 implementation
  const updated = await updateDocument(req.params.id, req.body);
  return res.ok({ body: { success: true } });
})

// Version 2: Added validation and conflict handling
.addVersion({
  version: '2024-01-15',
  validate: {
    request: {
      body: schema.object({
        title: schema.string({ minLength: 1, maxLength: 200 }),
        content: schema.string(),
        version: schema.number() // Added optimistic locking
      })
    },
    response: {
      200: {
        body: schema.object({
          id: schema.string(),
          version: schema.number(),
          updatedAt: schema.string()
        })
      },
      409: {
        body: schema.object({
          error: schema.string(),
          currentVersion: schema.number()
        })
      }
    }
  }
}, async (ctx, req, res) => {
  try {
    const updated = await updateDocumentWithVersion(
      req.params.id, 
      req.body,
      req.body.version
    );
    
    return res.ok({
      body: {
        id: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    if (error.name === 'VersionConflictError') {
      return res.conflict({
        body: {
          error: 'Document has been modified by another user',
          currentVersion: error.currentVersion
        }
      });
    }
    throw error;
  }
});
```

## Best Practices

### Security in Versioned APIs

```typescript
// Always validate and sanitize input
const sanitizeContent = (content: string) => {
  // Remove potentially dangerous HTML/scripts
  return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// Rate limiting per version
.addVersion({
  version: '2023-10-31',
  options: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  }
}, handler);
```

### Performance Considerations

```typescript
// Optimize responses for each version
.addVersion({
  version: '2023-10-31',
  validate: {
    response: {
      200: {
        body: schema.object({
          // Only essential fields in v1
          id: schema.string(),
          title: schema.string()
        })
      }
    }
  }
}, async (ctx, req, res) => {
  // Fetch only needed fields for v1 clients
  const doc = await getDocumentFields(req.params.id, ['id', 'title']);
  return res.ok({ body: doc });
})
.addVersion({
  version: '2024-01-15',
  validate: {
    response: {
      200: {
        body: schema.object({
          // Extended fields in v2
          id: schema.string(),
          title: schema.string(),
          content: schema.string(),
          metadata: schema.object({
            tags: schema.arrayOf(schema.string()),
            stats: schema.object({
              views: schema.number(),
              likes: schema.number()
            })
          })
        })
      }
    }
  }
}, async (ctx, req, res) => {
  // Fetch all fields for v2 clients
  const doc = await getDocumentWithMetadata(req.params.id);
  return res.ok({ body: doc });
});
```

### Error Handling Across Versions

```typescript
// Consistent error format across versions
interface APIError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

const handleAPIError = (error: any, version: string): APIError => {
  const baseError: APIError = {
    error: error.name || 'UnknownError',
    message: error.message,
    statusCode: error.statusCode || 500
  };
  
  // Version-specific error details
  if (version >= '2024-01-15') {
    baseError.details = {
      timestamp: new Date().toISOString(),
      requestId: error.requestId
    };
  }
  
  return baseError;
};
```

## Migration Strategies

### Deprecation Timeline

1. **Announce deprecation** - Add deprecation headers and documentation
2. **Provide migration guide** - Document breaking changes and upgrade path
3. **Sunset period** - Allow time for consumers to migrate
4. **Remove old version** - Clean up deprecated endpoints

```typescript
// Mark version as deprecated
.addVersion({
  version: '2023-10-31',
  deprecated: true, // Adds deprecation headers
  validate: { /* ... */ }
}, async (ctx, req, res) => {
  // Add deprecation warning to response
  res.set('Deprecation', 'true');
  res.set('Sunset', 'Wed, 01 Jan 2025 00:00:00 GMT');
  res.set('Link', '</api/docs/migration>; rel="alternate"');
  
  // Implementation continues normally
  return res.ok({ body: result });
});
```

## Key Guidelines

1. **Design for evolution** - Don't expose internal schemas directly
2. **Validate strictly** - Use narrow, specific validation rules
3. **Version appropriately** - Public APIs need careful versioning
4. **Handle errors gracefully** - Provide clear, actionable error messages
5. **Document changes** - Maintain migration guides for breaking changes
6. **Monitor usage** - Track version adoption and plan deprecations

This approach ensures your HTTP APIs can evolve safely while maintaining backward compatibility for existing consumers.