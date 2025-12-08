# Custom CodeQL Queries for Kibana

This directory contains custom CodeQL queries designed to detect security vulnerabilities specific to Kibana's codebase, with a particular focus on Denial of Service (DoS) vulnerabilities in API route validation.

## Background

Kibana uses three main validation libraries for API routes:

1. **`@kbn/config-schema`** - The primary validation library with `schema.*` methods
2. **io-ts** - Used in the server-route-repository pattern with `t.*` methods
3. **Zod** - Also used in server-route-repository with `z.*` methods

## DoS Vulnerability Queries

### UnboundedArrayInRoute.ql
- **ID**: `js/kibana/unbounded-array-in-route`
- **Severity**: Warning (6.5)
- **Description**: Detects `schema.arrayOf()` calls without `maxSize` constraint
- **Fix**: Add `{ maxSize: N }` as the second argument:
  ```typescript
  // Before (vulnerable)
  body: schema.arrayOf(schema.string())
  
  // After (secure)
  body: schema.arrayOf(schema.string(), { maxSize: 10 })
  ```

### UnboundedStringInRoute.ql
- **ID**: `js/kibana/unbounded-string-in-route`
- **Severity**: Warning (6.0)
- **Description**: Detects `schema.string()` in request bodies without `maxLength`
- **Fix**: Add `{ maxLength: N }` option:
  ```typescript
  // Before (vulnerable)
  body: schema.object({ content: schema.string() })
  
  // After (secure)
  body: schema.object({ content: schema.string({ maxLength: 1000 }) })
  ```

### IoTsUnboundedArrayInRoute.ql
- **ID**: `js/kibana/iots-unbounded-array-in-route`
- **Severity**: Warning (6.5)
- **Description**: Detects `t.array()` calls without size validation
- **Fix**: Use `t.refinement()` to add size limits:
  ```typescript
  // Before (vulnerable)
  params: t.type({ body: t.type({ items: t.array(t.string) }) })
  
  // After (secure)
  const boundedArray = t.refinement(
    t.array(t.string),
    (arr) => arr.length <= 10,
    'BoundedArray'
  );
  params: t.type({ body: t.type({ items: boundedArray }) })
  ```

### ZodUnboundedArrayInRoute.ql
- **ID**: `js/kibana/zod-unbounded-array-in-route`
- **Severity**: Warning (6.5)
- **Description**: Detects `z.array()` calls without `.max()` constraint
- **Fix**: Chain `.max(N)`:
  ```typescript
  // Before (vulnerable)
  params: z.object({ body: z.object({ items: z.array(z.string()) }) })
  
  // After (secure)
  params: z.object({ body: z.object({ items: z.array(z.string()).max(10) }) })
  ```

### SchemaAnyInRouteBody.ql
- **ID**: `js/kibana/schema-any-in-route-body`
- **Severity**: Error (7.5)
- **Description**: Detects `schema.any()` in request body validation
- **Fix**: Replace with specific schema types:
  ```typescript
  // Before (vulnerable)
  body: schema.object({ data: schema.any() })
  
  // After (secure)
  body: schema.object({
    data: schema.object({
      field1: schema.string({ maxLength: 1000 }),
      field2: schema.number()
    })
  })
  ```

### UnboundedRecordInRoute.ql
- **ID**: `js/kibana/unbounded-record-in-route`
- **Severity**: Warning (6.0)
- **Description**: Detects `schema.recordOf()`, `t.record()`, or `t.unknown` in body validation
- **Fix**: Use `schema.object()` with defined properties or add custom validation:
  ```typescript
  // Before (vulnerable)
  body: schema.recordOf(schema.string(), schema.string())
  
  // After (secure)
  body: schema.object({
    knownKey1: schema.string(),
    knownKey2: schema.string(),
  })
  // Or with custom validation
  body: schema.recordOf(
    schema.string(),
    schema.string(),
    {
      validate: (record) => {
        if (Object.keys(record).length > 50) {
          return 'Too many keys';
        }
      }
    }
  )
  ```

## Running the Queries

### Via GitHub Actions
These queries are automatically run as part of the CodeQL workflow in `.github/workflows/codeql.yml`.

### Locally
```bash
# Install CodeQL CLI
# https://codeql.github.com/docs/codeql-cli/getting-started-with-the-codeql-cli/

# Create database
codeql database create kibana-db --language=javascript

# Run custom queries
codeql database analyze kibana-db \
  .github/codeql/custom-queries/dos/ \
  --format=sarif-latest \
  --output=results.sarif

# Or run a specific query
codeql database analyze kibana-db \
  .github/codeql/custom-queries/dos/UnboundedArrayInRoute.ql \
  --format=sarif-latest \
  --output=results.sarif
```

## Adding New Queries

1. Create a new `.ql` file in the appropriate subdirectory
2. Include required metadata:
   - `@name` - Human-readable name
   - `@description` - Detailed description
   - `@kind` - Query kind (usually `problem` or `path-problem`)
   - `@problem.severity` - `error`, `warning`, or `recommendation`
   - `@security-severity` - CVSS-like score (0.0-10.0)
   - `@id` - Unique identifier (use `js/kibana/` prefix)
   - `@tags` - Include `security` and relevant categories

## Best Practices for Route Validation

1. **Always set size limits on arrays**: Use `maxSize` for `schema.arrayOf()`, `.max()` for Zod arrays, or refinements for io-ts
2. **Limit string lengths in request bodies**: Use `maxLength` for strings that accept user content
3. **Avoid `schema.any()`**: Always use typed schemas for request validation
4. **Use explicit object schemas**: Prefer `schema.object()` over `schema.recordOf()` when keys are known
5. **Set request body limits**: Use route `options.body.maxBytes` for additional protection
6. **Validate nested structures**: Apply limits at all levels of nested arrays/objects

## References

- [@kbn/config-schema README](../../../packages/kbn-config-schema/README.md)
- [CodeQL for JavaScript](https://codeql.github.com/docs/codeql-language-guides/codeql-for-javascript/)

