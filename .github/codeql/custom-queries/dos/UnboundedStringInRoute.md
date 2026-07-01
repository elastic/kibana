# Unbounded string in route request validation
This query detects calls to `schema.string()` from `@kbn/config-schema` and `z.string()` from Zod (`@kbn/zod`, `@kbn/zod/v4`, or plain `zod`) that do not specify a maximum length constraint. When string schemas are used to validate untrusted input (such as HTTP request bodies, query parameters, or URL parameters), the absence of a length limit can lead to Denial of Service (DoS) vulnerabilities.

An attacker could exploit unbounded string validation by sending extremely large string values in their requests. This can cause:

* Excessive memory consumption as the server allocates storage for oversized strings
* CPU exhaustion during validation, regex processing, or downstream operations on long strings
* Database field overflow or storage exhaustion when persisting unbounded values
* Application crashes due to out-of-memory conditions
* Degraded performance affecting all users of the system
The query only reports a string when it can be shown, via data flow, to reach a route's **request** validation &mdash; the `body`, `query`, `params`, or `path` fields of a `validate` block (including the versioned router's `validate: { request: ... }`), route-factory configs such as `@kbn/server-route-repository`'s `createServerRoute`, and the `buildRouteValidationWithZod` wrapper. Schemas that validate route **responses**, saved-object attributes, plugin configuration, UI settings, content-management/embeddable layers, telemetry, and other data-at-rest categories are not reported, because they do not reach a request-validation sink. A shared exclusion list (defined in `KibanaDoSExclusions.qll`) additionally skips browser (`public/`) code.

Because reporting is scoped to request-reachable strings, false positives are rare. A schema assembled through deep cross-file composition may occasionally be missed rather than mis-reported. To suppress a legitimate false positive, add a `codeql[js/kibana/unbounded-string-in-schema]` comment on the line above the flagged call.


## Recommendation
Always specify a maximum length constraint when using string schemas to validate input from untrusted sources.

For `@kbn/config-schema`, add a `maxLength` option:

```javascript

// Before (vulnerable)
schema.string()

// After (protected)
schema.string({ maxLength: 1024 })

```
For Zod (`@kbn/zod`, `@kbn/zod/v4`, or plain `zod`), chain a `.max()` call:

```javascript

// Before (vulnerable)
z.string()

// After (protected)
z.string().max(1024)

```
When determining an appropriate maximum length, consider:

* The actual business requirement - what is the longest string a user would legitimately submit?
* Memory overhead of storing and processing the string
* Whether the string undergoes regex validation (long strings amplify backtracking)
* Database column size limits for persisted values
* Rate limiting and other complementary security controls in place

## Example
The following example shows a route handler that accepts an unbounded string for a search query. An attacker could send a multi-megabyte string, causing excessive memory usage and potential regex backtracking:

```javascript

import { schema } from '@kbn/config-schema';

// BAD: No maxLength constraint - vulnerable to DoS
router.post({
  path: '/api/search',
  validate: {
    body: schema.object({
      query: schema.string(),  // Unbounded!
    }),
  },
}, async (context, request, response) => {
  const { query } = request.body;
  const results = await performSearch(query);
  return response.ok({ body: { results } });
});

```
The fix is to add a `maxLength` constraint that matches the legitimate use case:

```javascript

import { schema } from '@kbn/config-schema';

// GOOD: maxLength constraint prevents DoS
router.post({
  path: '/api/search',
  validate: {
    body: schema.object({
      query: schema.string({ maxLength: 256 }),
    }),
  },
}, async (context, request, response) => {
  const { query } = request.body;
  const results = await performSearch(query);
  return response.ok({ body: { results } });
});

```
The equivalent fix using Zod (applies to `@kbn/zod`, `@kbn/zod/v4`, or plain `zod`):

```javascript

import { z } from '@kbn/zod';

// BAD: No .max() constraint
const badSchema = z.object({
  query: z.string(),
});

// GOOD: .max() constraint prevents DoS
const goodSchema = z.object({
  query: z.string().max(256),
});

```

## References
* [OWASP: Denial of Service Attacks](https://owasp.org/www-community/attacks/Denial_of_Service)
* [OWASP: Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
* [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
* [CWE-770: Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html)
* Kibana `@kbn/config-schema` documentation for `schema.string()` options
* Zod documentation for `z.string().max()`
