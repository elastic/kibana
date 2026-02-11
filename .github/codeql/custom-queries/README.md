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

## Running the Queries

### Via GitHub Actions
These queries are automatically run as part of the CodeQL workflow in `.github/workflows/codeql.yml` and `.github/workflows/codeql-pr.yml`.
