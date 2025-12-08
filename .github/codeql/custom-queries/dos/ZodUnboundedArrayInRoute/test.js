// Test cases for ZodUnboundedArrayInRoute.ql
// Tests detection of z.array() without .max() constraint in route validation

import { z } from '@kbn/zod';
import { createServerRouteFactory } from '@kbn/server-route-repository';

const createRoute = createServerRouteFactory();

// =============================================================================
// BAD: Should be flagged - unbounded Zod arrays in route body
// =============================================================================

// BAD: Simple array without max
const badRoute1 = createRoute({
  endpoint: 'POST /internal/bad1',
  params: z.object({
    body: z.object({
      items: z.array(z.string()),  // $ Alert
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// BAD: Nested array without max
const badRoute2 = createRoute({
  endpoint: 'POST /internal/bad2',
  params: z.object({
    body: z.object({
      data: z.object({
        values: z.array(z.number()),  // $ Alert
      }),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// BAD: Array with only .min() constraint
const badRoute3 = createRoute({
  endpoint: 'PUT /internal/bad3',
  params: z.object({
    body: z.object({
      items: z.array(z.string()).min(1),  // $ Alert - has min but no max
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// BAD: Array of objects without max
const badRoute4 = createRoute({
  endpoint: 'POST /internal/bad4',
  params: z.object({
    body: z.array(  // $ Alert
      z.object({
        id: z.string(),
        value: z.number(),
      })
    ),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// =============================================================================
// GOOD: Should NOT be flagged - properly bounded arrays
// =============================================================================

// GOOD: Has .max() constraint
const goodRoute1 = createRoute({
  endpoint: 'POST /internal/good1',
  params: z.object({
    body: z.object({
      items: z.array(z.string()).max(100),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Has both .min() and .max()
const goodRoute2 = createRoute({
  endpoint: 'POST /internal/good2',
  params: z.object({
    body: z.object({
      items: z.array(z.string()).min(1).max(50),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Has .length() constraint (exact length)
const goodRoute3 = createRoute({
  endpoint: 'POST /internal/good3',
  params: z.object({
    body: z.object({
      coordinates: z.array(z.number()).length(2),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Has .nonempty() (implies at least some constraint)
const goodRoute4 = createRoute({
  endpoint: 'POST /internal/good4',
  params: z.object({
    body: z.object({
      items: z.array(z.string()).nonempty().max(10),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Array in query params (bounded by URL length)
const goodRoute5 = createRoute({
  endpoint: 'GET /internal/good5',
  params: z.object({
    query: z.object({
      ids: z.array(z.string()),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Has .refine() with size check
const goodRoute6 = createRoute({
  endpoint: 'POST /internal/good6',
  params: z.object({
    body: z.object({
      items: z.array(z.string()).refine((arr) => arr.length <= 100),
    }),
  }),
  handler: async () => ({}),
  security: { authz: { enabled: false, reason: '' } },
});

// GOOD: Not in route context
const nonRouteArray = z.array(z.string());

