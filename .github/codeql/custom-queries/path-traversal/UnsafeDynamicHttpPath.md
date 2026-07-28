# UnsafeDynamicHttpPath.ql

- **ID**: `js/kibana/unsafe-dynamic-http-path`
- **Kind**: `path-problem` (data-flow)
- **Severity**: Error (security-severity 7.5)
- **Description**: Detects a dynamically-built string (template literal or concatenation) that flows into the path of a browser `http.*` request without `buildPath()` (`@kbn/core-http-browser`) or `encodeURIComponent()`. Unencoded path parameters allow path traversal / IDOR.

This is the data-flow companion to the `@kbn/eslint/no_unsafe_dynamic_http_path` ESLint rule. The ESLint rule only checks the inline path expression at the call site; this query follows the value across variables, helper-function returns, and files.

- **Fix**: encode path parameters with `buildPath()`:
  ```typescript
  // Before (vulnerable)
  http.delete(`/api/dashboards/${id}`);

  // After (safe)
  http.delete(buildPath('/api/dashboards/{id}', { id }));
  ```
  or wrap each dynamic segment in `encodeURIComponent()`:
  ```typescript
  http.delete('/api/dashboards/' + encodeURIComponent(id));
  ```

- **Suppression**: for a verified false positive (a segment that is genuinely constant / not user-controllable), add on the line above the call:
  ```typescript
  // codeql[js/kibana/unsafe-dynamic-http-path] reason
  ```

## Notes

- Kibana's CodeQL analysis runs with `CODEQL_EXTRACTOR_JAVASCRIPT_OPTION_SKIP_TYPES`, so the `http` receiver and path argument are matched syntactically (identifier `http`, or any property access ending in `.http`), mirroring the ESLint rule.
- `buildPath()` and `encodeURIComponent()` results break the flow and are not reported. Non-`http` receivers (e.g. `client.delete(...)`) are not matched.
