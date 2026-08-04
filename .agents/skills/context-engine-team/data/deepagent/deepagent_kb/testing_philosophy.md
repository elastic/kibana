# deepagent Knowledge Base: Testing Philosophy

## Overview

Testing accounts for approximately 5% of deepagent's feedback (~25+ items across ~400 PRs). His testing philosophy centers on test durability -- writing tests that survive refactoring and don't create maintenance burden. He is particularly thoughtful about testing LLM-powered features.

---

## Core Principles

### 1. Black-Box Over White-Box

**PR #235179 - Black-box over white-box testing for LLM tasks (WARNING)**

For LLM-powered features, test observable behavior (inputs and outputs) rather than internal mechanics. White-box tests that mock LLM responses are fragile because:
- They break whenever prompts change
- They couple tests to implementation details
- They don't actually validate that the feature works with a real LLM
- They create a false sense of coverage

```typescript
// BAD - white-box: mocks the LLM response
it('should extract entities', async () => {
  mockLlm.mockReturnValue({
    content: JSON.stringify({ entities: ['foo', 'bar'] }),
  });
  const result = await extractEntities('test input');
  expect(result).toEqual({ entities: ['foo', 'bar'] });
  // This test passes even if the prompt is completely wrong
});

// GOOD - black-box: tests the contract
it('should return extracted entities as an array', async () => {
  const result = await extractEntities('The quick brown fox jumped over the lazy dog');
  expect(result.entities).toBeInstanceOf(Array);
  expect(result.entities.length).toBeGreaterThan(0);
  // Tests the actual behavior, survives prompt changes
});
```

**When white-box testing is acceptable:**
- Unit testing pure functions within the pipeline (not the LLM call itself)
- Testing error handling for specific LLM error responses
- Testing retry logic and timeout behavior

### 2. Separate Wait/Retry From Assertions

**PR #237357 - Separate wait/retry from assertions in FTR (WARNING)**

In Functional Test Runner (FTR) tests, waiting and asserting are separate concerns. Embedding assertions inside retry loops creates confusing failures -- you can't tell if the assertion failed or the condition was never met.

```typescript
// BAD - assertion inside retry
await retry.try(async () => {
  const text = await testSubjects.getVisibleText('tool-name');
  expect(text).to.be('My Tool');
});
// If this fails, you don't know if the element never appeared
// or if it had the wrong text

// GOOD - separate wait from assertion
await retry.waitFor('tool name to appear', async () => {
  const text = await testSubjects.getVisibleText('tool-name');
  return text === 'My Tool';
});
// Now the wait is explicit about what it's waiting for
const text = await testSubjects.getVisibleText('tool-name');
expect(text).to.be('My Tool');
// And the assertion is clear about what's being verified
```

### 3. PageObject Patterns

**PR #237357 - PageObject patterns for FTR (WARNING)**

FTR tests should use the PageObject pattern to encapsulate UI interactions:

```typescript
// BAD - raw selectors in test
it('should display tool results', async () => {
  await testSubjects.click('run-tool-button');
  await retry.waitFor('results', async () => {
    return await testSubjects.exists('tool-results-panel');
  });
  const text = await testSubjects.getVisibleText('tool-results-content');
  expect(text).to.contain('Success');
});

// GOOD - PageObject encapsulates interactions
// In page_objects/tool_page.ts
class ToolPage {
  async runTool() {
    await testSubjects.click('run-tool-button');
  }
  async waitForResults() {
    await retry.waitFor('tool results to appear', async () => {
      return await testSubjects.exists('tool-results-panel');
    });
  }
  async getResultText() {
    return await testSubjects.getVisibleText('tool-results-content');
  }
}

// In test
it('should display tool results', async () => {
  await toolPage.runTool();
  await toolPage.waitForResults();
  const text = await toolPage.getResultText();
  expect(text).to.contain('Success');
});
```

**Benefits of PageObject:**
- Encapsulates selector knowledge in one place
- Tests read like user stories
- Selector changes only require updating the PageObject
- Reusable across tests

---

## Test Data & Fixtures

### Fixtures Should Match Schema Types

**PR #237357 - Test data fixtures should match schema types (NIT)**

Test fixtures and mock data should be typed with the same types used in production code. This ensures:
- Test data is valid according to the domain model
- Schema changes surface in tests (compile errors)
- Tests don't silently test with invalid data

```typescript
// BAD - untyped fixture
const mockTool = {
  id: 'test-tool',
  name: 'Test Tool',
  description: 'A test',
  // Missing required fields? Extra fields? No compile-time check.
};

// GOOD - typed fixture
const mockTool: Tool = {
  id: 'test-tool',
  name: 'Test Tool',
  description: 'A test tool for testing',
  schema: { type: 'object', properties: {} },
  handler: jest.fn(),
};
```

---

## LLM Test Fragility

### Mocked LLM Responses Are Fragile

**PR #234985 - Concerns about mocked LLM test fragility (WARNING)**

Tests that mock specific LLM responses create a fragile coupling between the test and the prompt format. If the prompt changes slightly:
- Mock responses may no longer be realistic
- Tests pass with unrealistic data
- Developers waste time updating mocks instead of improving prompts

**Preferred approaches for LLM testing:**

1. **Contract tests**: Verify that the function returns the expected shape, regardless of content
2. **Integration tests**: Test against a real or sandboxed LLM endpoint
3. **Snapshot tests**: Capture actual LLM responses and use them as reference (with explicit update process)
4. **Property-based tests**: Verify structural properties of the output

### Testing Error Handling Separately

Error handling for LLM calls can be unit-tested with mocks because the error shapes are well-defined:

```typescript
// OK to mock - testing error handling
it('should handle rate limit errors', async () => {
  mockLlm.mockRejectedValue(new RateLimitError('Too many requests'));
  await expect(processQuery('test')).rejects.toThrow('Rate limit exceeded');
});

// OK to mock - testing retry logic
it('should retry on transient errors', async () => {
  mockLlm
    .mockRejectedValueOnce(new TransientError())
    .mockResolvedValueOnce({ content: 'success' });
  const result = await processQuery('test');
  expect(result).toBe('success');
  expect(mockLlm).toHaveBeenCalledTimes(2);
});
```

---

## Test Organization

### Test Files Location

- Unit tests: Same directory as the source file, named `*.test.ts` or `*.test.tsx`
- Integration tests: In `__tests__/` directory or with `*.integration.test.ts` suffix
- FTR tests: In the plugin's `test/` or FTR config directory

### Test Structure

Follow Arrange-Act-Assert pattern:

```typescript
it('should register a tool with the registry', () => {
  // Arrange
  const registry = createToolRegistry();
  const tool: Tool = { id: 'my-tool', name: 'My Tool', ... };

  // Act
  registry.register(tool);

  // Assert
  expect(registry.get('my-tool')).toEqual(tool);
});
```

---

## Common Anti-patterns

### 1. White-Box Tests for LLM Features
Already covered. Test behavior, not implementation.

### 2. Assertions Inside Retry Loops
Already covered. Separate wait from assert.

### 3. Raw Selectors in Tests
Already covered. Use PageObject pattern.

### 4. Untyped Test Fixtures
Already covered. Type fixtures with production types.

### 5. Over-Mocking
Mocking too many dependencies makes tests fragile and unrealistic. Prefer:
- Real implementations when possible
- Thin mocks that implement the full interface
- Factory functions that create valid domain objects

```typescript
// BAD - mock that doesn't implement full interface
const mockClient = { search: jest.fn() } as any;

// GOOD - mock that satisfies the interface
const mockClient: jest.Mocked<SearchClient> = {
  search: jest.fn(),
  get: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
};
```

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| White-box testing of LLM behavior | WARNING |
| Assertions inside retry loops | WARNING |
| Missing PageObject pattern in FTR | WARNING |
| Mocked LLM test fragility | WARNING |
| Untyped test fixtures | NIT |
| Over-mocking | NIT |
