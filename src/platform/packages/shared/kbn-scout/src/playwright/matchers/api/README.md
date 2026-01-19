# Scout API Matchers Enhancement

## Summary

Create a Scout API custom `expect` with dynamic matchers for API testing and restricted exposure to Playwright’s default matchers. This is to assist developers with API-specific assertions and enforce best practices

**Key Features:**

- Custom matchers for API-specific assertions
- Matchers created at runtime based on asserted object's properties
- Full TypeScript support for dynamically generated matchers
- Partial and exact matching provided
- Error format identical to Playwright's for consistent developer experience
- Restricted Playwright matchers exposure
- Supports `not` for all matchers
- Exports from `@kbn/scout/api`, retaining the familiar `expect` name while also providing API-related matchers

---

## Changes

### New API Matchers

Custom `expect` function that provides type-safe, API-focused matchers based on response object properties:

```typescript
import { expect } from '@kbn/scout/api';

// Example response object from an API call
const response = {
  status: 200,
  statusText: 'OK',
  headers: {
    'Content-Type': 'application/json',
    'Set-Cookie': ['session=abc', 'token=xyz'], // array values joined as 'session=abc, token=xyz'
  },
  data: {
    cases: [{ id: 'case-123', title: 'Test Case', version: 'WzEsMV0=' }],
    total: 1,
  },
};

// Status code assertions
expect(response).toHaveStatusCode(200);
expect(response).toHaveStatusCode({ oneOf: [200, 201] });
expect(response).not.toHaveStatusCode(500);

// Data assertions with partial matching (default)
expect(response).toHaveData({ total: 1 });
expect(response).toHaveData({ cases: [{ id: 'case-123' }] });
expect(response).toHaveData({ cases: [{}] }); // nested array has at least one item

// Data assertions with exact matching
expect(response).toHaveData(
  {
    total: 1,
    cases: [
      {
        id: 'case-123',
        title: 'Test Case',
        version: 'WzEsMV0=',
      },
    ],
  },
  { exactMatch: true }
);

// Headers
expect(response).toHaveHeaders({ 'content-type': 'application/json' }); // case-insensitive
expect(response).toHaveHeaders({ 'set-cookie': 'session=abc, token=xyz' }); // arrays joined

// Status text
expect(response).toHaveStatusText('OK');

// Value assertions (restricted to toBeDefined only)
expect(response.data.cases[0].version).toBeDefined();
```

### Dynamic Matcher Selection

Matchers are dynamically created at runtime based on object properties, with static type inference providing accurate autocomplete and compile-time checking:

```typescript
const response = { status: 200, data: { id: 'abc' } }; // no statusText

expect(response).toHaveStatusCode(200); // ✅ available
expect(response).toHaveData({ id: 'abc' }); // ✅ available
expect(response).toHaveStatusText('OK'); // ❌ type error - statusText not in response
```

### Restricted Value Matchers

`ValueMatchers` only exposes `toBeDefined()` to guide developers toward API-specific assertions and enforce best practices:

```typescript
// Available for checking system-generated values
expect(response.data.version).toBeDefined();

// NOT available: ❌
expect(response.data.cases).toHaveLength(1);
expect(response.data.cases[0].id).toBe(caseId);

// Instead do this: ✅
expect(response).toHaveData({ cases: { id: caseId } });
```

---

## Before & After

Real example from `cases.spec.ts`:

```typescript
// ❌ Before: Playwright's expect with destructuring and multiple assertions
const { data, status } = await apiServices.cases.create({ ... });
expect(status).toBe(200);
expect(data.owner).toBe(caseOwner);
expect(data.status).toBe('open');

// ✅ After: Scout API expect with partial matching
const response = await apiServices.cases.create({ ... });
expect(response).toHaveStatusCode(200);
expect(response).toHaveData({ owner: caseOwner, status: 'open' });
```

---

## Notes

- Custom matchers throw errors identical to Playwright's format for consistent developer experience
- `toHaveStatusCode` options interface is designed for extensibility (e.g., future `range` option)
