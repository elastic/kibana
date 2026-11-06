# Custom CodeQL Queries for Kibana

This directory contains custom CodeQL queries designed to detect potential security issues that are unique to Kibana's codebase and ecosystem.

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
- **ID**: `js/kibana/unbounded-string-in-schema`
- **Severity**: Error (7.5)
- **Description**: Detects `schema.string()` (`@kbn/config-schema`) and `z.string()` (`@kbn/zod` / `zod`) without a maximum-length constraint that flow into a route's request validation
- **Fix**: Add a maximum length to the schema:
  ```typescript
  // Before (vulnerable)
  body: schema.object({ name: schema.string() })

  // After (secure)
  body: schema.object({ name: schema.string({ maxLength: 256 }) })
  ```

### UnsafeDynamicHttpPath.ql
- **ID**: `js/kibana/unsafe-dynamic-http-path`
- **Severity**: Error (7.5)
- **Description**: Detects a dynamically-built string that flows into the path of a browser `http.*` request without `buildPath()` (`@kbn/core-http-browser`) or `encodeURIComponent()`. The data-flow companion to the `@kbn/eslint/no_unsafe_dynamic_http_path` ESLint rule, which only sees the inline call site
- **Fix**: Encode path parameters with `buildPath()`:
  ```typescript
  // Before (vulnerable)
  http.delete(`/api/dashboards/${id}`);

  // After (secure)
  http.delete(buildPath('/api/dashboards/{id}', { id }));
  ```

## Running the Queries

### Via GitHub Actions
These queries are automatically run as part of the CodeQL workflow in `.github/workflows/codeql.yml` and `.github/workflows/codeql-pr.yml`.
