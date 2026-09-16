# deepagent Knowledge Base: Code Reuse

## Overview

Code reuse feedback accounts for approximately 3% of deepagent's feedback (~15+ items across ~400 PRs). His perspective is simple: before writing new code, check if the platform already provides the functionality. Custom implementations of existing utilities create maintenance burden, miss edge cases, and don't benefit from platform improvements.

---

## Core Principle: Use Existing Platform Utilities

### Why Custom Implementations Are Problematic

1. **Maintenance burden**: Two implementations of the same logic means two places to update
2. **Edge cases**: Platform utilities have been battle-tested; custom code may miss edge cases
3. **Security**: Platform utilities handle security concerns; custom code may not
4. **Consistency**: Using the same utility across the codebase ensures consistent behavior
5. **Upgrades**: Platform utility improvements benefit all consumers automatically

---

## Known Platform Utilities to Use

### Space-Scoped Path Building

**PR #240955 - Use addSpaceIdToPath from @kbn/spaces-plugin/common (WARNING)**

Don't manually construct space-scoped URL paths. The platform provides a utility.

```typescript
// BAD - manual path construction
function buildSpacePath(basePath: string, spaceId: string): string {
  if (spaceId === 'default') return basePath;
  return `/s/${spaceId}${basePath}`;
}

// GOOD - platform utility
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';

const path = addSpaceIdToPath(basePath, spaceId);
```

**Why the platform utility is better:**
- Handles the "default" space correctly
- Handles edge cases in path normalization
- Consistent with how the rest of Kibana builds paths
- Updated if the space URL scheme ever changes

### Internal URL Validation

**PR #252140 - Use http.externalUrl.isInternalUrl (WARNING)**

Don't write custom URL validation logic. Kibana's HTTP service provides built-in URL validation.

```typescript
// BAD - custom URL validation
function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

// GOOD - platform utility
const isInternal = http.externalUrl.isInternalUrl(url);
```

**Why the platform utility is better:**
- Handles all internal hostname patterns (not just localhost)
- Respects the server's configured public base URL
- Handles protocol-relative URLs
- Handles Kibana-specific URL patterns

### LRU Cache

**PR #251209 - Use lru-cache package over custom implementation (WARNING)**

Don't implement your own LRU (Least Recently Used) cache. The `lru-cache` package is already a dependency in the Kibana repository.

```typescript
// BAD - custom LRU implementation
class MyLRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recent)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }
}

// GOOD - use the existing package
import LRUCache from 'lru-cache';

const cache = new LRUCache<string, SearchResult>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutes
});
```

**Why the package is better:**
- Handles TTL (time-to-live) expiration
- Supports size-based eviction (not just count)
- Has been optimized for performance
- Handles edge cases (concurrent access, etc.)
- Well-tested and maintained

### XML Tree Generation

**PR #248211 - Use generateXmlTree utility (NIT)**

When generating XML tree structures (e.g., for tool descriptions or data formatting), use the existing `generateXmlTree` utility rather than building XML strings manually.

```typescript
// BAD - manual XML string building
function buildXml(data: Record<string, string>): string {
  let xml = '<root>';
  for (const [key, value] of Object.entries(data)) {
    xml += `<${key}>${escapeXml(value)}</${key}>`;
  }
  xml += '</root>';
  return xml;
}

// GOOD - use utility
import { generateXmlTree } from '@kbn/...';

const xml = generateXmlTree(data);
```

---

## How to Find Existing Utilities

### Search Strategies

Before writing new utility code:

1. **Search packages**: Look in `packages/` for `@kbn/` packages related to your need
2. **Search core**: Check `src/core/` for platform-provided utilities
3. **Search the codebase**: Look for existing implementations of similar functionality
4. **Check plugin common exports**: Platform plugins often export utilities from their `common/` directory

### Common Utility Locations

| Need | Where to Look |
|------|--------------|
| URL manipulation | `@kbn/std`, `core.http` |
| Path building | `@kbn/spaces-plugin/common` |
| Data validation | `@kbn/config-schema` |
| String utilities | `@kbn/std` |
| Async utilities | `@kbn/std` |
| Testing utilities | `@kbn/test-jest-helpers` |
| Type utilities | Various `@kbn/` packages |
| Logging | `core.logging` |
| Caching | `lru-cache` package |

---

## Package vs Plugin for Utility Code

When you find that no existing utility meets your need and you must write new code, put it in the right place:

### Use a Package When:
- The code is a pure function (no side effects, no plugin dependencies)
- The code is useful across multiple plugins
- The code does not require plugin lifecycle hooks
- The code is a type definition or constant

### Use a Plugin When:
- The code requires access to core services (Elasticsearch, saved objects, etc.)
- The code needs lifecycle management (setup/start/stop)
- The code registers routes or saved object types
- The code depends on other plugins

**PR #251858 - Utility code in packages not plugins (WARNING)**

If code is purely utility, it must live in a `@kbn/` package:

```
// Utility function -> Package
packages/@kbn/agent-builder-utils/
  src/
    xml_builder.ts
    schema_validator.ts

// Service requiring lifecycle -> Plugin
x-pack/platform/plugins/ai_infra/agent_builder/
  server/
    services/
      tool_manager.ts
```

---

## When Custom Code Is Acceptable

Custom implementations are acceptable when:

1. **No existing utility exists**: After thorough search, nothing meets the need
2. **Existing utility is too heavyweight**: The utility pulls in excessive dependencies
3. **Different requirements**: The existing utility doesn't handle the specific use case
4. **Performance critical path**: The generic utility has overhead that matters in this context

In these cases, document why the custom implementation exists:

```typescript
/**
 * Custom cache implementation for tool schemas.
 * We can't use lru-cache here because we need synchronous
 * size-based eviction based on schema complexity, not entry count.
 */
class SchemaCache { ... }
```

---

## Common Anti-patterns

### 1. Reimplementing Path Utilities
Already covered. Use `addSpaceIdToPath`.

### 2. Reimplementing URL Validation
Already covered. Use `http.externalUrl.isInternalUrl`.

### 3. Reimplementing Caching
Already covered. Use `lru-cache`.

### 4. Reimplementing XML Generation
Already covered. Use `generateXmlTree`.

### 5. Copy-Pasting from Other Plugins
Instead of copying utility code from another plugin, extract it into a shared package:

```
// BAD - copied from plugin A to plugin B
// x-pack/plugins/plugin_a/server/utils/format_date.ts
// x-pack/plugins/plugin_b/server/utils/format_date.ts  (copy!)

// GOOD - extracted to shared package
// packages/@kbn/date-utils/src/format_date.ts
```

### 6. Utility Code in Plugins
Already covered. Use packages for utility code.

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| Custom implementation of platform utility | WARNING |
| Utility code in plugin instead of package | WARNING |
| Copy-pasting utility across plugins | WARNING |
| Not checking for existing utilities | NIT |
| Missing documentation for justified custom code | NIT |
