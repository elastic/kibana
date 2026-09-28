# Unbounded string in schema validation

## Overview

This query detects calls to `schema.string()` from `@kbn/config-schema` and `z.string()` from Zod (`@kbn/zod`, `@kbn/zod/v4`, or plain `zod`) that do not specify a maximum length constraint. When string schemas are used to validate untrusted input (such as HTTP request bodies, query parameters, or URL parameters), the absence of a length limit can lead to Denial of Service (DoS) vulnerabilities.

An attacker could exploit unbounded string validation by sending extremely large string values in their requests. This can cause:

- Excessive memory consumption as the server allocates storage for oversized strings
- CPU exhaustion during regex validation or downstream processing of long strings
- Database field overflow or storage exhaustion when persisting unbounded values
- Application crashes due to out-of-memory conditions
- Degraded performance affecting all users of the system

The query targets:

- `schema.string()` calls missing the `maxLength` option in the first argument
- `z.string()` calls without a `.max()` in the method chain

It uses a shared exclusion list (defined in `KibanaDoSExclusions.qll`) to skip files whose schemas are known to never validate HTTP request payloads, such as saved-object attribute schemas, plugin configuration, UI settings definitions, content-management layer schemas, and similar structural/data-at-rest categories. See that file for the full set of excluded path patterns.

## Recommendation

Always specify a maximum length constraint when using string schemas to validate input from untrusted sources. The maximum length should be set to a reasonable limit based on your business requirements.

### Choosing a max length

Consider these common categories:

| Use case | Suggested max length |
|----------|---------------------|
| Identifiers (IDs, keys, slugs) | 100-256 |
| Names, titles | 256-512 |
| Descriptions, comments | 1,000-10,000 |
| Search queries, filters | 256-1,024 |
| Free-text body content | 10,000-100,000 |
| URLs | 2,048-4,096 |

### Route as a simple proxy to Elasticsearch API

When a route passes the string directly to an Elasticsearch API, the max length should match the Elasticsearch field limit. For example, keyword fields default to 32,766 bytes.

### Route with regex validation

If the string undergoes regex validation, a strict max length is critical. Long strings can trigger catastrophic backtracking in poorly written patterns, causing the event loop to block for seconds or minutes.

### Fixing the issue

**`@kbn/config-schema`** — add `maxLength` to the options object:

```javascript
// Before (vulnerable)
schema.string()

// After (protected)
schema.string({ maxLength: 256 })
```

**Zod** (`@kbn/zod`, `@kbn/zod/v4`, or plain `zod`) — chain `.max()` on the string schema:

```javascript
// Before (vulnerable)
z.string()

// After (protected)
z.string().max(256)
```

When determining an appropriate maximum length, consider:

- The actual business requirement — what is the longest string a user would legitimately submit?
- Memory overhead of storing and processing the string
- Whether the string undergoes regex validation (long strings amplify backtracking)
- Database column size limits for persisted values
- Rate limiting and other complementary security controls in place

## Example

The following example shows a route handler that accepts an unbounded search query. An attacker could send a multi-megabyte string, causing excessive memory usage and potential regex backtracking:

```javascript
import { schema } from '@kbn/config-schema';

// BAD: No maxLength constraint - vulnerable to DoS
router.post({
  path: '/api/search',
  validate: {
    body: schema.object({
      query: schema.string(),  // Unbounded!
      filter: schema.string(), // Also unbounded!
    }),
  },
}, async (context, request, response) => {
  const { query, filter } = request.body;
  const results = await performSearch(query, filter);
  return response.ok({ body: { results } });
});
```

The fix is to add a `maxLength` constraint that matches the legitimate use case:

```javascript
import { schema } from '@kbn/config-schema';

// GOOD: maxLength constraints prevent DoS
router.post({
  path: '/api/search',
  validate: {
    body: schema.object({
      query: schema.string({ maxLength: 256 }),
      filter: schema.string({ maxLength: 1024 }),
    }),
  },
}, async (context, request, response) => {
  const { query, filter } = request.body;
  const results = await performSearch(query, filter);
  return response.ok({ body: { results } });
});
```

The equivalent using Zod (applies to `@kbn/zod`, `@kbn/zod/v4`, or plain `zod`):

```javascript
import { z } from '@kbn/zod';

// BAD: No .max() constraint - vulnerable to DoS
const badSchema = z.object({
  query: z.string(),
  filter: z.string(),
});

// GOOD: .max() constraints prevent DoS
const goodSchema = z.object({
  query: z.string().max(256),
  filter: z.string().max(1024),
});
```

## False positives and suppression

This query intentionally casts a wide net — it flags all unbounded `schema.string()` and `z.string()` calls except those in file paths that are clearly non-payload contexts. Some findings will be in schemas that validate route **responses**, saved-object attributes in shared files, or other non-request-payload contexts. These are expected false positives.

To suppress a legitimate false positive, add a `codeql[...]` comment on the line above the flagged call:

```javascript
// codeql[js/kibana/unbounded-string-in-schema] response schema — not user input
schema.string()
```

The exclusion list in `KibanaDoSExclusions.qll` is maintained conservatively and may be updated as new non-payload schema patterns are identified. If you encounter a false positive that affects an entire file category (not a one-off), consider proposing an addition to the shared exclusion library rather than adding per-line suppressions.

## References

- [OWASP: Denial of Service Attacks](https://owasp.org/www-community/attacks/Denial_of_Service)
- [OWASP: Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
- [CWE-770: Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html)
