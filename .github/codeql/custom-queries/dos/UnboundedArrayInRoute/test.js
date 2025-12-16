// Test cases for UnboundedArrayInRoute.ql
// Tests detection of schema.arrayOf() without maxSize in route validation
//
// CodeQL Test Annotations:
// - `// $ Alert` marks lines that SHOULD trigger a warning
// - Lines without `// $ Alert` should NOT trigger warnings

import { schema } from '@kbn/config-schema';

// =============================================================================
// BAD: Should be flagged - unbounded arrays (missing maxSize)
// =============================================================================

// BAD: Direct router pattern without maxSize
router.post({
  path: '/api/bad/direct-array',
  validate: {
    body: schema.arrayOf(schema.string()),  // $ Alert
  },
}, handler);

// BAD: Nested in object without maxSize
router.post({
  path: '/api/bad/nested-in-object',
  validate: {
    body: schema.object({
      items: schema.arrayOf(schema.number()),  // $ Alert
    }),
  },
}, handler);

// BAD: Array of objects without maxSize
router.put({
  path: '/api/bad/array-of-objects',
  validate: {
    body: schema.arrayOf(  // $ Alert
      schema.object({
        id: schema.string(),
        value: schema.number(),
      })
    ),
  },
}, handler);

// BAD: Only has minSize, no maxSize
router.post({
  path: '/api/bad/minsize-only',
  validate: {
    body: schema.arrayOf(schema.string(), { minSize: 1 }),  // $ Alert
  },
}, handler);

// BAD: Empty options object (no maxSize)
router.post({
  path: '/api/bad/empty-options',
  validate: {
    body: schema.arrayOf(schema.string(), {}),  // $ Alert
  },
}, handler);

// BAD: Deeply nested array without maxSize
router.post({
  path: '/api/bad/deeply-nested',
  validate: {
    body: schema.object({
      level1: schema.object({
        level2: schema.object({
          items: schema.arrayOf(schema.string()),  // $ Alert
        }),
      }),
    }),
  },
}, handler);

// BAD: Multiple arrays in same body - all should be flagged
router.post({
  path: '/api/bad/multiple-arrays',
  validate: {
    body: schema.object({
      tags: schema.arrayOf(schema.string()),  // $ Alert
      ids: schema.arrayOf(schema.number()),  // $ Alert
      data: schema.arrayOf(schema.any()),  // $ Alert
    }),
  },
}, handler);

// BAD: Nested array (array of arrays) - both levels should be flagged
router.post({
  path: '/api/bad/nested-arrays',
  validate: {
    body: schema.arrayOf(  // $ Alert
      schema.arrayOf(schema.string())  // $ Alert
    ),
  },
}, handler);

// BAD: Mixed - outer has maxSize, inner doesn't
router.post({
  path: '/api/bad/mixed-nested',
  validate: {
    body: schema.arrayOf(
      schema.arrayOf(schema.string()),  // $ Alert
      { maxSize: 10 }
    ),
  },
}, handler);

// BAD: Array with nullable without maxSize
router.post({
  path: '/api/bad/nullable-array',
  validate: {
    body: schema.nullable(schema.arrayOf(schema.string())),  // $ Alert
  },
}, handler);

// BAD: Array with maybe without maxSize
router.post({
  path: '/api/bad/maybe-array',
  validate: {
    body: schema.maybe(schema.arrayOf(schema.string())),  // $ Alert
  },
}, handler);

// BAD: Array in params validation
router.post({
  path: '/api/bad/params-array/{items}',
  validate: {
    params: schema.object({
      items: schema.arrayOf(schema.string()),  // $ Alert
    }),
  },
}, handler);

// BAD: Array in query validation (still needs protection even if URL-bounded)
router.get({
  path: '/api/bad/query-array',
  validate: {
    query: schema.object({
      ids: schema.arrayOf(schema.string()),  // $ Alert
    }),
  },
}, handler);

// BAD: Using versioned route API
router.versioned.post({
  path: '/api/bad/versioned',
  access: 'internal',
}).addVersion({
  version: '1',
  validate: {
    request: {
      body: schema.arrayOf(schema.string()),  // $ Alert
    },
  },
}, handler);

// BAD: Route defined with separate schema variable
const badBodySchema = schema.arrayOf(schema.object({  // $ Alert
  name: schema.string(),
}));
router.post({
  path: '/api/bad/separate-schema',
  validate: {
    body: badBodySchema,
  },
}, handler);

// BAD: Array with defaultValue but no maxSize
router.post({
  path: '/api/bad/with-default',
  validate: {
    body: schema.object({
      items: schema.arrayOf(schema.string(), { defaultValue: [] }),  // $ Alert
    }),
  },
}, handler);

// BAD: oneOf containing unbounded array
router.post({
  path: '/api/bad/oneof-array',
  validate: {
    body: schema.oneOf([
      schema.arrayOf(schema.string()),  // $ Alert
      schema.string(),
    ]),
  },
}, handler);

// =============================================================================
// GOOD: Should NOT be flagged - properly bounded arrays
// =============================================================================

// GOOD: Has maxSize
router.post({
  path: '/api/good/with-maxsize',
  validate: {
    body: schema.arrayOf(schema.string(), { maxSize: 100 }),
  },
}, handler);

// GOOD: Has both minSize and maxSize
router.post({
  path: '/api/good/min-and-max',
  validate: {
    body: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 50 }),
  },
}, handler);

// GOOD: Nested array with maxSize
router.post({
  path: '/api/good/nested-with-maxsize',
  validate: {
    body: schema.object({
      items: schema.arrayOf(schema.number(), { maxSize: 1000 }),
    }),
  },
}, handler);

// GOOD: Array of objects with maxSize
router.put({
  path: '/api/good/objects-with-maxsize',
  validate: {
    body: schema.arrayOf(
      schema.object({
        id: schema.string(),
        value: schema.number(),
      }),
      { maxSize: 100 }
    ),
  },
}, handler);

// GOOD: Nested arrays - both bounded
router.post({
  path: '/api/good/nested-both-bounded',
  validate: {
    body: schema.arrayOf(
      schema.arrayOf(schema.string(), { maxSize: 10 }),
      { maxSize: 10 }
    ),
  },
}, handler);

// GOOD: Multiple arrays - all bounded
router.post({
  path: '/api/good/multiple-all-bounded',
  validate: {
    body: schema.object({
      tags: schema.arrayOf(schema.string(), { maxSize: 10 }),
      ids: schema.arrayOf(schema.number(), { maxSize: 100 }),
    }),
  },
}, handler);

// GOOD: Versioned route with maxSize
router.versioned.post({
  path: '/api/good/versioned-bounded',
  access: 'internal',
}).addVersion({
  version: '1',
  validate: {
    request: {
      body: schema.arrayOf(schema.string(), { maxSize: 50 }),
    },
  },
}, handler);

// GOOD: Separate schema variable with maxSize
const goodBodySchema = schema.arrayOf(schema.object({
  name: schema.string(),
}), { maxSize: 100 });
router.post({
  path: '/api/good/separate-bounded',
  validate: {
    body: goodBodySchema,
  },
}, handler);

// GOOD: maxSize with other options
router.post({
  path: '/api/good/maxsize-with-others',
  validate: {
    body: schema.arrayOf(schema.string(), {
      minSize: 0,
      maxSize: 25,
      defaultValue: [],
    }),
  },
}, handler);

// =============================================================================
// EDGE CASES: Special scenarios
// =============================================================================

// EDGE: Schema reused in multiple contexts - defined once, used in body
const reusableSchema = schema.arrayOf(schema.object({  // $ Alert
  id: schema.string(),
  name: schema.string(),
}));

// EDGE: Dynamic maxSize via variable (should still be detected as bounded)
const MAX_ITEMS = 100;
router.post({
  path: '/api/edge/variable-maxsize',
  validate: {
    body: schema.arrayOf(schema.string(), { maxSize: MAX_ITEMS }),
  },
}, handler);

// EDGE: Computed maxSize (should still be detected as bounded)
router.post({
  path: '/api/edge/computed-maxsize',
  validate: {
    body: schema.arrayOf(schema.string(), { maxSize: 10 * 10 }),
  },
}, handler);

// EDGE: Very small maxSize is still valid
router.post({
  path: '/api/edge/small-maxsize',
  validate: {
    body: schema.arrayOf(schema.string(), { maxSize: 1 }),
  },
}, handler);

// EDGE: maxSize of 0 (arguably useless but syntactically bounded)
router.post({
  path: '/api/edge/zero-maxsize',
  validate: {
    body: schema.arrayOf(schema.string(), { maxSize: 0 }),
  },
}, handler);

// EDGE: Array inside conditional (should still be flagged)
const useArray = true;
router.post({
  path: '/api/edge/conditional',
  validate: {
    body: useArray ? schema.arrayOf(schema.string()) : schema.string(),  // $ Alert
  },
}, handler);

// EDGE: IIFE returning schema (should still be flagged)
router.post({
  path: '/api/edge/iife',
  validate: {
    body: (() => schema.arrayOf(schema.number()))(),  // $ Alert
  },
}, handler);

// EDGE: Function returning schema
function createArraySchema() {
  return schema.arrayOf(schema.string());  // $ Alert
}

// EDGE: Class method returning schema
class SchemaBuilder {
  buildArray() {
    return schema.arrayOf(schema.boolean());  // $ Alert
  }
}
