# ADR: Error Tagging for ES|QL Validation

**Status:** Pending

## Context

The ES|QL validation system needs to filter semantic errors when required callbacks are not available, to avoid false positives. Previously, this required manually maintaining an `ignoreErrorsMap` that mapped callbacks to error codes.

**Problem:**

```typescript
const ignoreErrorsMap = {
  getColumnsFor: ['unknownColumn', 'wrongArgumentType'],
  getSources: ['unknownIndex'],
  getPolicies: ['unknownPolicy'],
  // Must update this map every time we add:
  // - A new callback
  // - A new error code
  // - A new command that uses existing errors
};
```

This approach didn't scale and was error-prone.

## Decision

Implement **Error Tagging**: errors self-declare their dependencies using metadata fields.

```typescript
// Extend ESQLMessage
interface ESQLMessage {
  errorType?: 'syntax' | 'semantic';
  requiresCallback?: string;
}

// Tag semantic errors where they're created
unknownColumn: (column) =>
  tagSemanticError(
    errors.byId('unknownColumn', ...),
    'getColumnsFor'  // Self-declares dependency
  )

// Filter based on error metadata (in validation.ts)
filteredErrors = allErrors.filter(error => {
  if (error.errorType === 'semantic' && error.requiresCallback) {
    return callbacks?.[error.requiresCallback] !== undefined;
  }
  return true;  // Syntax errors always pass
});
```

## Alternatives Considered

### 1. COMMAND_DEPENDENCIES Map

```typescript
const COMMAND_DEPENDENCIES = {
  where: ['getColumnsFor'],
  enrich: ['getPolicies'],
};
// Skip entire validator if callback missing
```

**Rejected:** Loses syntax validation when callback missing, too coarse-grained.

### 2. Command Registry Metadata

```typescript
export const whereCommand = {
  metadata: {
    requiredCallbacks: ['getColumnsFor']
  }
};
```

**Rejected:** Same issues as COMMAND_DEPENDENCIES, plus requires updating metadata in multiple commands.

### 3. Inline Callback Checks

```typescript
if (callbacks?.getColumnsFor) {
  validateColumns();
}
```

**Rejected:** Lost all validation when callback missing, verbose, no central control.

## Conclusions

**Why Error Tagging wins:**

1. **Locality**: Error knows what it needs where it's created
2. **Granularity**: Per-error filtering, not per-command
3. **Auto-scaling**: New errors tagged once, work everywhere
4. **Preserves syntax validation**: Runs all validators, filters selectively
5. **Zero global config**: No maps to maintain

**Example:**

```typescript
// Query: WHERE unknownField ==
// Missing: getColumnsFor callback

// COMMAND_DEPENDENCIES: Skips validator → loses syntax error "=="
// Error Tagging: Runs validator → shows "==", filters "unknownField"
```

## Consequences

### Positive

- ✅ No manual error-to-callback mappings
- ✅ Adding new callback: tag errors, done
- ✅ Syntax errors always shown (ANTLR + tagged validators)
- ✅ Self-documenting (error declares dependency)
- ✅ Type-safe (TypeScript validates callback names)

### Negative

- ⚠️ Must remember to tag new semantic errors
- ⚠️ Two packages involved (kbn-esql-ast types, validation filtering)

### Neutral

- 📝 Syntax errors don't need tagging (pass by default)
- 📝 Only ~4 semantic error types currently (scalable)

## Implementation Notes

**Tag semantic errors in `errors.ts`:**

**Filtering happens in `validation.ts`:**

- Runs ALL validators (preserves syntax checking)
- Filters only semantic errors without callback
- ANTLR errors (EditorError) bypass filtering entirely

## References

- Initial issue: Manual `ignoreErrorsMap` doesn't scale
