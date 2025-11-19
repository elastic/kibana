# @kbn/cps

## Holds CPS related logic

### API Routes

#### GET /internal/cps/projects_tags

Retrieves project tags from Elasticsearch using the `/_project/tags` endpoint.

**Route Details:**
- **Path:** `/internal/cps/projects_tags`
- **Authorization:** Handled by the scoped Elasticsearch client
- **Response Format:**
```typescript
{
  [key: string]: Record<string, string>;
}
```

**Features:**
- Delegates authorization to the scoped Elasticsearch client
- Proxies requests to the Elasticsearch `/_project/tags` API
- Returns project tag mappings as key-value pairs