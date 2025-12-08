// Test cases for UnboundedArrayInRoute.ql
// Tests detection of schema.arrayOf() without maxSize in route validation

import { schema } from '@kbn/config-schema';

// =============================================================================
// BAD: Should be flagged - unbounded arrays in route body validation
// =============================================================================

// BAD: Direct router pattern without maxSize
router.post({
  path: '/api/bad1',
  validate: {
    body: schema.arrayOf(schema.string()),  // $ Alert
  },
}, handler);

// BAD: Nested in object without maxSize
router.post({
  path: '/api/bad2',
  validate: {
    body: schema.object({
      items: schema.arrayOf(schema.number()),  // $ Alert
    }),
  },
}, handler);

// BAD: Array of objects without maxSize
router.put({
  path: '/api/bad3',
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
  path: '/api/bad4',
  validate: {
    body: schema.arrayOf(schema.string(), { minSize: 1 }),  // $ Alert
  },
}, handler);

// =============================================================================
// GOOD: Should NOT be flagged - properly bounded arrays
// =============================================================================

// GOOD: Has maxSize
router.post({
  path: '/api/good1',
  validate: {
    body: schema.arrayOf(schema.string(), { maxSize: 100 }),
  },
}, handler);

// GOOD: Has both minSize and maxSize
router.post({
  path: '/api/good2',
  validate: {
    body: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 50 }),
  },
}, handler);

// GOOD: Nested array with maxSize
router.post({
  path: '/api/good3',
  validate: {
    body: schema.object({
      items: schema.arrayOf(schema.number(), { maxSize: 1000 }),
    }),
  },
}, handler);

// GOOD: In query params (bounded by URL length)
router.get({
  path: '/api/good4',
  validate: {
    query: schema.object({
      ids: schema.arrayOf(schema.string()),
    }),
  },
}, handler);

// GOOD: In response schema (not request validation)
router.post({
  path: '/api/good5',
  validate: {
    body: schema.object({ id: schema.string() }),
    response: {
      200: {
        body: schema.arrayOf(schema.object({ result: schema.string() })),
      },
    },
  },
}, handler);

