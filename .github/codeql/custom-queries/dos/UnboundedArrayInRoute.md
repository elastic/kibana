# Unbounded array in schema validation

## Overview

This query detects calls to `schema.arrayOf()` from the `@kbn/config-schema` library that do not specify a `maxSize` constraint. When array schemas are used to validate untrusted input (such as HTTP request bodies, query parameters, or URL parameters), the absence of a size limit can lead to Denial of Service (DoS) vulnerabilities.

An attacker could exploit unbounded array validation by sending extremely large arrays in their requests. This can cause:

- Excessive memory consumption as the server attempts to parse and store the array
- CPU exhaustion during validation and processing of array elements
- Application crashes due to out-of-memory conditions
- Degraded performance affecting all users of the system

The query specifically targets `schema.arrayOf()` calls that are missing the `maxSize` option in the second argument. It excludes configuration files (`config.ts`) and plugin entry points (`server/index.ts`) as these typically handle trusted internal configuration rather than external user input.

## Recommendation

Always specify a `maxSize` constraint when using `schema.arrayOf()` to validate input from untrusted sources. The `maxSize` value should be set to a reasonable limit based on your business requirements.

### Route as a simple proxy to Elasticsearch API

When a route is used as a simple proxy to Elasticsearch API, the input size is limited by the Elasticsearch API. In this case, the `maxSize` value should be set to the maximum number of items that the Elasticsearch API can handle.

For example, if the Elasticsearch API can handle up to 10,000 items, the `maxSize` value should be set to 10,000.

```javascript
schema.arrayOf(schema.string(), { maxSize: 10000 })
```

### Route with non-trivial processing

This is when "It, Depends". Internal API routes that perform non-trivial processing should have a `maxSize` constraint that is appropriate for the business requirements. Note that the Kibana server is a shared resource with finite CPU and memory.

Routes that power a data grid (e.g. bulk delete) should have a `maxSize` set to the maximum number of items that the data grid can handle in a given page.

Routes with more nuanced use cases should have a good understanding of the resource consumption of their processing and set the `maxSize` accordingly.

### Fixing the issue

To fix this issue, add a second argument to `schema.arrayOf()` containing an object with a `maxSize` property:

```javascript
// Before (vulnerable)
schema.arrayOf(schema.string())

// After (protected)
schema.arrayOf(schema.string(), { maxSize: 100 })
```

When determining an appropriate `maxSize` value, consider:

- The actual business requirement - what is the maximum number of items a user would legitimately need to submit?
- Memory and processing overhead per array element
- The complexity of nested schemas - arrays of complex objects may need smaller limits
- Rate limiting and other complementary security controls in place

For nested arrays (arrays containing arrays), ensure that **both** the outer and inner arrays have appropriate `maxSize` constraints to prevent multiplicative resource consumption.

## Example

The following example shows a route handler that accepts an unbounded array of user IDs. An attacker could send millions of IDs, causing the server to consume excessive memory and processing time:

```javascript
import { schema } from '@kbn/config-schema';

// BAD: No maxSize constraint - vulnerable to DoS
router.post({
  path: '/api/users/batch-lookup',
  validate: {
    body: schema.object({
      userIds: schema.arrayOf(schema.string()),  // Unbounded!
    }),
  },
}, async (context, request, response) => {
  const { userIds } = request.body;
  // Processing millions of IDs could crash the server
  const users = await lookupUsers(userIds);
  return response.ok({ body: { users } });
});
```

The fix is to add a `maxSize` constraint that matches the legitimate use case:

```javascript
import { schema } from '@kbn/config-schema';

// GOOD: maxSize constraint prevents DoS
router.post({
  path: '/api/users/batch-lookup',
  validate: {
    body: schema.object({
      userIds: schema.arrayOf(schema.string(), { maxSize: 100 }),
    }),
  },
}, async (context, request, response) => {
  const { userIds } = request.body;
  // At most 100 IDs - safe and bounded
  const users = await lookupUsers(userIds);
  return response.ok({ body: { users } });
});
```

For more complex scenarios with nested arrays, ensure all levels are bounded:

```javascript
import { schema } from '@kbn/config-schema';

// GOOD: Both outer and inner arrays are bounded
router.post({
  path: '/api/matrix/process',
  validate: {
    body: schema.object({
      matrix: schema.arrayOf(
        schema.arrayOf(schema.number(), { maxSize: 100 }),
        { maxSize: 100 }
      ),
    }),
  },
}, handler);
```

## References

- [OWASP: Denial of Service Attacks](https://owasp.org/www-community/attacks/Denial_of_Service)
- [OWASP: Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
- [CWE-770: Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html)

