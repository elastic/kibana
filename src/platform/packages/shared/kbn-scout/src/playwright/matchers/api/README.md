# Scout API Matchers

## Summary

Scout exposes a custom API `expect` object with custom and default matchers for API testing. To enforce best practices, Playwright's default matchers are restricted.

```typescript
import { expect } from '@kbn/scout/api';
```

---

## Custom Response Matchers

Scout-specific matchers for API response assertions. These support both `apiClient` and `kbnClient` response interfaces.

### toHaveStatusCode

Asserts response has the expected HTTP status code. Checks `status` or `statusCode` property.

```typescript
expect(response).toHaveStatusCode(200);
expect(response).toHaveStatusCode({ oneOf: [200, 201] });
```

### toHaveStatusText

Asserts response has the expected status text. Checks `statusText` or `statusMessage` property.

```typescript
expect(response).toHaveStatusText('OK');
```

### toHaveHeaders

Asserts response contains the expected headers (partial match). Checks `headers` property. Case-insensitive keys. Response header arrays are joined with `, ` before comparison.

```typescript
expect(response).toHaveHeaders({ 'content-type': 'application/json' });
expect(response).toHaveHeaders({ 'set-cookie': 'session=abc, token=xyz' });
```

---

## Custom Asymmetric Matchers

Custom asymmetric matchers for use with `toMatchObject`:

- **`expect.toBeGreaterThan(n)`** - Matches if value > n
- **`expect.toBeLessThan(n)`** - Matches if value < n

```typescript
expect(response).toMatchObject({
  body: {
    count: expect.toBeGreaterThan(0),
    limit: expect.toBeLessThan(100),
  },
});
```

---

## Supported Playwright Matchers

The following [Playwright matchers](https://playwright.dev/docs/api/class-genericassertions) are available:

**Matchers:**

- `toBe(expected)` - compares using `Object.is`, use for primitive literals
- `toBeDefined()` - value is not `undefined`
- `toBeUndefined()` - value is `undefined`
- `toContain(expected)` - string contains substring, or Array/Set contains item
- `toHaveLength(n)` - value has `.length` property equal to n
- `toStrictEqual(expected)` - deep equality with type checking
- `toBeGreaterThan(n)` - value > n
- `toBeLessThan(n)` - value < n
- `toMatchObject(expected)` - partial object matching

**Asymmetric matchers:**

- `expect.arrayContaining(array)` - array contains all expected elements
- `expect.objectContaining(object)` - object contains expected properties

---

## Restricted Matchers

To enforce best practices, some Playwright matchers are restricted. Use these alternatives:

```typescript
expect({ name: 'Alice', metadata: undefined }).toEqual({ name: 'Alice' }); // ❌ would pass even if extra keys exist
expect({ name: 'Alice', metadata: undefined }).toStrictEqual({ name: 'Alice' }); // ✅ fails if extra/missing keys exist

expect(response).toHaveProperty('apiKey'); // ❌ passes even if apiKey is undefined
expect(response.apiKey).toBeDefined(); // ✅ it will fail if undefined

expect(exists).toBeTruthy(); // ❌ too loose
expect(exists).toBe(true); // ✅ be explicit

expect(response.apiKey).not.toBeDefined(); // ❌ not available
expect(response.apiKey).toBeUndefined(); // ✅ preferred by playwright
```

**UI-specific matchers** like `toBeVisible`, `toBeEnabled`, `toHaveAttribute`, etc. are not available for API tests.

## Notes

- Custom matchers throw Playwright-style errors
- Stack traces can be trimmed via `skipStackLines` to point directly at the test file
- `toHaveStatusCode` options interface is designed for extensibility (e.g., future `range` option)
