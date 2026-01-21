# Scout API Matchers

## Summary

Create a Scout API custom `expect` with dynamic matchers for API testing and restricted exposure to Playwright's default matchers. This is to assist developers with API-specific assertions and enforce best practices

**Key Features:**

- Custom matchers for API-specific assertions
- Supports both `apiClient` and `kbnClient` response interfaces
- Matchers created at runtime based on asserted object's properties
- Full TypeScript support for dynamically generated matchers
- Partial and exact matching provided
- Asymmetric matchers for flexible assertions
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

// Example response object from apiClient
const response = {
  statusCode: 200,
  statusMessage: 'OK',
  headers: {
    'Content-Type': 'application/json',
    'Set-Cookie': ['session=abc', 'token=xyz'], // array values joined as 'session=abc, token=xyz'
  },
  body: {
    cases: [{ id: 'case-123', title: 'Test Case', version: 'WzEsMV0=' }],
    total: 1,
  },
};

// Status code assertions
expect(response).toHaveStatusCode(200);
expect(response).toHaveStatusCode({ oneOf: [200, 201] });
expect(response).not.toHaveStatusCode(500);

// Payload assertions with partial matching (default)
expect(response).toHavePayload({ total: 1 });
expect(response).toHavePayload({ cases: [{ id: 'case-123' }] });

// Asymmetric matchers for flexible assertions
expect(response).toHavePayload({ cases: expect.toHaveLength() }); // checks length > 0, or pass exact length
expect(response).toHavePayload({ total: expect.toBeGreaterThan(0) });
expect(response).toHavePayload({ cases: [{ version: expect.toBeDefined() }] });

// Payload assertions with exact matching
expect(response).toHavePayload(
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

// Value assertions (restricted)
expect(response.data.cases[0].version).toBeDefined();
```

### Dynamic Matcher Selection

Matchers are dynamically created at runtime based on object properties, with static type inference providing accurate autocomplete and compile-time checking:

```typescript
const response = { statusCode: 200, body: { id: 'abc' } }; // no statusMessage

expect(response).toHaveStatusCode(200); // ✅ available
expect(response).toHavePayload({ id: 'abc' }); // ✅ available
expect(response).toHaveStatusText('OK'); // ❌ type error - statusMessage not in response
```

### Restricted Value Matchers

Default playwright's value matchers are restricted to guide developers toward API-specific assertions and enforce best practices:

```typescript
// Available for checking system-generated values
expect(response.data.version).toBeDefined();

// NOT available: ❌
expect(response.body.cases).toHaveLength(1);
expect(response.body.cases[0].id).toBe(caseId);

// Instead do this: ✅
expect(response).toHavePayload({ cases: { id: caseId } });
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
expect(response).toHavePayload({ owner: caseOwner, status: 'open' });
```

---

## Why `toHavePayload` over `toMatchObject`?

`toHavePayload` is tailored for API testing workflows:

1. **No destructuring needed** - Automatically finds `data` or `body` in the response:

   ```typescript
   // Instead of:
   const { data } = response;
   expect(data).toMatchObject({ id: 1 });

   // Just:
   expect(response).toHavePayload({ id: 1 });
   ```

2. **Partial array matching** - `toMatchObject` requires arrays to match exactly in length and order. `toHavePayload` finds matching items anywhere in the array:

   ```typescript
   // response.data.items = [{ id: 3, title: 'c' }, { id: 1, title: 'a' }, { id: 2, title: 'b' }]

   // ❌ toMatchObject fails (wrong order, wrong length)
   expect(response.data).toMatchObject({ items: [{ id: 1 }] });

   // ✅ toHavePayload passes (finds id:1 somewhere in the array)
   expect(response).toHavePayload({ items: [{ id: 1 }] });
   ```

3. **Existence check** - Call without arguments to verify payload exists:

   ```typescript
   // ❌ Manual check
   expect(response.data).toBeDefined();

   // ✅ Built-in
   expect(response).toHavePayload();
   ```

4. **Asymmetric matchers** - Built-in helpers for common checks:

   ```typescript
   expect(response).toHavePayload({
     count: expect.toBeGreaterThan(0),
     items: expect.toHaveLength(3),
     id: expect.toBeDefined(),
   });
   ```

5. **Exact matching when needed** - Opt-in strict mode:
   ```typescript
   expect(response).toHavePayload({ id: 1 }, { exactMatch: true });
   ```

---

## Notes

- Custom matchers throw Playwright-style errors; stack traces can be trimmed via `skipStackLines` to point directly at the test file
- `toHaveStatusCode` options interface is designed for extensibility (e.g., future `range` option)
