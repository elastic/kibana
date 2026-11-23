# Custom CodeQL Queries for Kibana

This directory contains custom CodeQL queries designed to detect potential security issues that are unique to Kibana's codebase and ecosystem.

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
