// Test cases for IoTsUnboundedArrayInRoute.ql
// Tests detection of t.array() without size constraints in route validation

import * as t from 'io-ts';
import { createServerRouteFactory } from '@kbn/server-route-repository';

const createRoute = createServerRouteFactory();

// =============================================================================
// BAD: Should be flagged - unbounded io-ts arrays in route body
// =============================================================================

// BAD: Simple array without size limit
const badRoute1 = createRoute({
  endpoint: 'POST /internal/bad1',
  params: t.type({
    body: t.type({
      items: t.array(t.string),  // $ Alert
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// BAD: Nested array without size limit
const badRoute2 = createRoute({
  endpoint: 'POST /internal/bad2',
  params: t.type({
    body: t.type({
      data: t.type({
        values: t.array(t.number),  // $ Alert
      }),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// BAD: Array of objects without size limit
const badRoute3 = createRoute({
  endpoint: 'PUT /internal/bad3',
  params: t.type({
    body: t.array(  // $ Alert
      t.type({
        id: t.string,
        value: t.number,
      })
    ),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// =============================================================================
// GOOD: Should NOT be flagged - properly bounded arrays
// =============================================================================

// GOOD: Array directly passed to t.refinement
const goodRoute1 = createRoute({
  endpoint: 'POST /internal/good1',
  params: t.type({
    body: t.type({
      items: t.refinement(
        t.array(t.string),
        (arr) => arr.length <= 100,
        'BoundedStringArray'
      ),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Array passed to t.brand
const goodRoute2 = createRoute({
  endpoint: 'POST /internal/good2',
  params: t.type({
    body: t.type({
      items: t.brand(
        t.array(t.string),
        (arr) => arr.length <= 50,
        'BrandedArray'
      ),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Array in query params (bounded by URL length)
const goodRoute3 = createRoute({
  endpoint: 'GET /internal/good3',
  params: t.type({
    query: t.type({
      ids: t.array(t.string),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Not in route context
const nonRouteArray = t.array(t.string);

