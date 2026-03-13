# Migration Example: APM Filters (Real Production Code)

**File**: `x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/filters.ts`  
**Complexity**: Low  
**Lines of Code**: 72  
**Estimated Migration Time**: 10 minutes  
**Risk Level**: Low

---

## Current Implementation (@kbn/esql-composer)

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { where } from '@kbn/esql-composer';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';

export const filterByKuery = (kuery: string) => {
  return where(
    `KQL("${kuery.trim().replaceAll('"', '\\"').replaceAll(/\s+/g, ' ').replaceAll(/\n+/g, ' ')}")`
  );
};

export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByErrorGroupId = (errorGroupId: string) => {
  return where(`${ERROR_GROUP_ID} == ?errorGroupId`, { errorGroupId });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

export const filterByTransactionNameOrSpanName = (
  transactionName: string | undefined,
  spanName: string | undefined
) => {
  return where(`??nameField == ?name`, {
    nameField: transactionName ? TRANSACTION_NAME : SPAN_NAME,
    name: (transactionName ?? spanName) as string,
  });
};

export const filterByTransactionType = (transactionType: string) => {
  return where(`${TRANSACTION_TYPE} == ?transactionType`, { transactionType });
};

export const filterByDependencyName = (dependencyName: string) => {
  return where(`${SPAN_DESTINATION_SERVICE_RESOURCE} == ?dependencyName`, { dependencyName });
};

export const filterBySpanId = (spanId: string) => {
  return where(`${SPAN_ID} == ?spanId`, { spanId });
};

export const filterBySampleRange = (
  sampleRangeFrom: number,
  sampleRangeTo: number,
  transactionName: string | undefined
) => {
  return where(`??durationField >= ?sampleRangeFrom AND ??durationField <= ?sampleRangeTo`, {
    durationField: transactionName ? TRANSACTION_DURATION : SPAN_DURATION,
    sampleRangeFrom,
    sampleRangeTo,
  });
};
```

---

## Migrated Implementation (@kbn/esql-ast)

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { where } from '@kbn/esql-ast';  // ← ONLY CHANGE!
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';

export const filterByKuery = (kuery: string) => {
  return where(
    `KQL("${kuery.trim().replaceAll('"', '\\"').replaceAll(/\s+/g, ' ').replaceAll(/\n+/g, ' ')}")`
  );
};

export const filterByServiceName = (serviceName: string) => {
  return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
};

export const filterByErrorGroupId = (errorGroupId: string) => {
  return where(`${ERROR_GROUP_ID} == ?errorGroupId`, { errorGroupId });
};

export const filterByEnvironment = (environment: string) => {
  return where(`${SERVICE_ENVIRONMENT} == ?environment`, { environment });
};

export const filterByTransactionNameOrSpanName = (
  transactionName: string | undefined,
  spanName: string | undefined
) => {
  return where(`??nameField == ?name`, {
    nameField: transactionName ? TRANSACTION_NAME : SPAN_NAME,
    name: (transactionName ?? spanName) as string,
  });
};

export const filterByTransactionType = (transactionType: string) => {
  return where(`${TRANSACTION_TYPE} == ?transactionType`, { transactionType });
};

export const filterByDependencyName = (dependencyName: string) => {
  return where(`${SPAN_DESTINATION_SERVICE_RESOURCE} == ?dependencyName`, { dependencyName });
};

export const filterBySpanId = (spanId: string) => {
  return where(`${SPAN_ID} == ?spanId`, { spanId });
};

export const filterBySampleRange = (
  sampleRangeFrom: number,
  sampleRangeTo: number,
  transactionName: string | undefined
) => {
  return where(`??durationField >= ?sampleRangeFrom AND ??durationField <= ?sampleRangeTo`, {
    durationField: transactionName ? TRANSACTION_DURATION : SPAN_DURATION,
    sampleRangeFrom,
    sampleRangeTo,
  });
};
```

---

## Diff View

```diff
- import { where } from '@kbn/esql-composer';
+ import { where } from '@kbn/esql-ast';
  import {
    ERROR_GROUP_ID,
    SERVICE_ENVIRONMENT,
    SERVICE_NAME,
    SPAN_DESTINATION_SERVICE_RESOURCE,
    SPAN_DURATION,
    SPAN_ID,
    SPAN_NAME,
    TRANSACTION_DURATION,
    TRANSACTION_NAME,
    TRANSACTION_TYPE,
  } from '@kbn/apm-types';

  export const filterByKuery = (kuery: string) => {
    return where(
      `KQL("${kuery.trim().replaceAll('"', '\\"').replaceAll(/\s+/g, ' ').replaceAll(/\n+/g, ' ')}")`
    );
  };

  export const filterByServiceName = (serviceName: string) => {
    return where(`${SERVICE_NAME} == ?serviceName`, { serviceName });
  };

  // ... rest identical
```

**Total Changes**: 1 line (the import statement)

---

## Files That Use These Filters

These files also need migration, but they're just as simple:

### 1. `open_span_in_discover_link.tsx`

**Before:**
```typescript
import { from } from '@kbn/esql-composer';
import { filterByServiceName, filterBySpanId } from './filters';

const query = from('traces-*')
  .pipe(
    filterByServiceName(serviceName),
    filterBySpanId(spanId)
  )
  .toString();
```

**After:**
```typescript
import { esql } from '@kbn/esql-ast';  // ← Changed
import { filterByServiceName, filterBySpanId } from './filters';

const query = esql.from('traces-*')  // ← Changed
  .pipe(
    filterByServiceName(serviceName),
    filterBySpanId(spanId)
  )
  .print();  // ← Changed
```

**Changes**: 3 lines (import, `from` → `esql.from`, `.toString()` → `.print()`)

---

### 2. `open_in_discover_button.tsx`

**Before:**
```typescript
import { from } from '@kbn/esql-composer';
import {
  filterByServiceName,
  filterByEnvironment,
  filterByTransactionType,
  filterByTransactionNameOrSpanName,
} from './filters';

const query = from('traces-*')
  .pipe(
    filterByServiceName(serviceName),
    environment ? filterByEnvironment(environment) : (q) => q,
    transactionType ? filterByTransactionType(transactionType) : (q) => q,
    filterByTransactionNameOrSpanName(transactionName, spanName)
  )
  .toString();
```

**After:**
```typescript
import { esql, identity } from '@kbn/esql-ast';  // ← Changed
import {
  filterByServiceName,
  filterByEnvironment,
  filterByTransactionType,
  filterByTransactionNameOrSpanName,
} from './filters';

const query = esql.from('traces-*')  // ← Changed
  .pipe(
    filterByServiceName(serviceName),
    environment ? filterByEnvironment(environment) : identity,  // ← Changed
    transactionType ? filterByTransactionType(transactionType) : identity,  // ← Changed
    filterByTransactionNameOrSpanName(transactionName, spanName)
  )
  .print();  // ← Changed
```

**Changes**: 
- Import: Add `identity` from `@kbn/esql-ast`
- Source: `from` → `esql.from`
- Conditionals: `(q) => q` → `identity`
- Output: `.toString()` → `.print()`

---

### 3. `open_error_in_discover_button.tsx`

Similar pattern to above.

---

## Testing Strategy

### Unit Tests

The test file `filters.test.ts` needs minimal updates:

**Before:**
```typescript
import { from } from '@kbn/esql-composer';
import { filterByServiceName, filterByEnvironment } from './filters';

describe('filters', () => {
  describe('filterByServiceName', () => {
    it('creates correct WHERE clause', () => {
      const query = from('traces')
        .pipe(filterByServiceName('my-service'))
        .toString();
      
      expect(query).toContain('service.name == ?serviceName');
    });
  });
});
```

**After:**
```typescript
import { esql } from '@kbn/esql-ast';  // ← Changed
import { filterByServiceName, filterByEnvironment } from './filters';

describe('filters', () => {
  describe('filterByServiceName', () => {
    it('creates correct WHERE clause', () => {
      const query = esql.from('traces')  // ← Changed
        .pipe(filterByServiceName('my-service'))
        .print();  // ← Changed
      
      expect(query).toContain('service.name == ?serviceName');
    });
  });
});
```

### Integration Tests

Run APM functional tests to verify Discover links still work:

```bash
node scripts/functional_tests --config x-pack/test/apm_api_integration/basic/config.ts
```

---

## Migration Steps

### Step 1: Update `filters.ts` (2 minutes)
```bash
# Open file
code x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/filters.ts

# Change line 7
- import { where } from '@kbn/esql-composer';
+ import { where } from '@kbn/esql-ast';

# Save and verify TypeScript compiles
```

### Step 2: Update Usage Files (5 minutes each)
For each of:
- `open_span_in_discover_link.tsx`
- `open_in_discover_button.tsx`
- `open_error_in_discover_button.tsx`

```bash
# Update imports
- import { from } from '@kbn/esql-composer';
+ import { esql, identity } from '@kbn/esql-ast';

# Update source command
- from('traces-*')
+ esql.from('traces-*')

# Update conditionals
- (q) => q
+ identity

# Update output
- .toString()
+ .print()
```

### Step 3: Update Tests (3 minutes)
```bash
# Update test imports and methods
- import { from } from '@kbn/esql-composer';
+ import { esql } from '@kbn/esql-ast';

- from('traces').pipe(...).toString()
+ esql.from('traces').pipe(...).print()
```

### Step 4: Run Tests (5 minutes)
```bash
# Unit tests
node scripts/jest x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links

# TypeScript
node scripts/type_check --project x-pack/solutions/observability/plugins/apm/tsconfig.json

# Linting
node scripts/eslint x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links
```

### Step 5: Manual Testing (10 minutes)
1. Start Kibana in dev mode
2. Navigate to APM
3. Click "Open in Discover" links
4. Verify queries are correct
5. Verify results match expectations

---

## Verification Checklist

- [ ] TypeScript compiles without errors
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Linting passes
- [ ] Manual testing shows identical behavior
- [ ] Query output matches character-for-character (or semantically)
- [ ] No console errors in browser
- [ ] Performance is similar (no regressions)

---

## Rollback

If issues arise, rollback is trivial:

```bash
git checkout HEAD -- x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/
```

Then investigate and fix issues before re-attempting.

---

## Estimated Effort Summary

| Task | Time |
|------|------|
| Update `filters.ts` | 2 min |
| Update 3 usage files | 15 min |
| Update tests | 3 min |
| Run tests | 5 min |
| Manual testing | 10 min |
| **Total** | **35 min** |

**Risk**: Low (only import changes, all logic identical)

---

## Key Takeaways

1. ✅ **Minimal Changes**: Only imports and method names
2. ✅ **Logic Identical**: Filter functions don't change
3. ✅ **Type Safe**: TypeScript catches any issues
4. ✅ **Testable**: Unit tests verify correctness
5. ✅ **Low Risk**: Easy rollback if needed

This is an ideal "first migration" to build confidence before tackling more complex files.

---

## Next Steps

After this migration succeeds:
1. ✅ Document lessons learned
2. ✅ Update migration guide if needed
3. ✅ Move to next file (suggest: `unified_doc_viewer` traces)
4. ✅ Build momentum with quick wins

---

**Migration Example Version**: 1.0  
**File Complexity**: Low  
**Recommended For**: First migration / Learning exercise

