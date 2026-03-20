# RFC: Extract Entity Extraction as Standalone Package

**RFC ID**: SEC-2026-003
**Author**: Patryk Kopycinski
**Status**: Draft
**Created**: 2026-03-20
**Team**: @elastic/security-generative-ai

---

## Summary

Extract the ECS-to-Observable entity extraction module from the Alert Investigation Pipeline spike into a standalone package: `@kbn/entity-extraction`.

**Current Location**: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline/entity_extraction/`
**Proposed Location**: `x-pack/solutions/security/packages/kbn-entity-extraction/`

**Reusability Score**: ⭐⭐⭐⭐ (Medium-High)
**Extraction Effort**: 5 days
**Dependencies**: ECS field definitions (security-specific)

---

## Summary

This RFC proposes extracting entity extraction from the pipeline as a security-scoped package that maps ECS alert fields to structured observable types (IP, hostname, user, file hash, etc.).

**Why Extract?**
- Reusable by any security feature needing entity extraction (correlation, threat intel, entity analytics)
- Centralizes ECS → Observable mapping logic
- Reduces duplication across security plugins

**Scope**: Security solution only (not platform-level due to ECS dependency)

---

## Technical Design

### Package Structure

```
x-pack/solutions/security/packages/kbn-entity-extraction/
├── src/
│   ├── ecs_field_mappings.ts      # 30+ ECS field → observable type mappings
│   ├── extract_entities.ts        # Main extraction logic
│   └── types.ts                   # Observable types
└── __tests__/
    └── extract_entities.test.ts   # 156 tests
```

### Observable Types

```typescript
export type ObservableType =
  | 'ipv4' | 'ipv6' | 'hostname' | 'user' | 'file_hash'
  | 'process' | 'registry' | 'url' | 'domain' | 'service'
  | 'mac_address' | 'email' | 'certificate';

export interface ExtractedEntity {
  type: ObservableType;
  value: string;
  sourceField: string;  // ECS field path
}
```

### API

```typescript
export function extractEntities(alerts: Array<{ _source: unknown }>): ExtractedEntity[];
```

---

## Use Cases

| Feature | How It Uses Entity Extraction |
|---------|------------------------------|
| **Alert Pipeline** | Extract entities for case matching |
| **Correlation** | Extract groupBy entities for correlation queries |
| **Threat Intel** | Match extracted IPs/domains against threat feeds |
| **Entity Analytics** | Build entity graphs from alert entities |

---

## Decision

**Recommendation**: Extract to **security-scoped package** (not platform)

**Rationale**:
- ECS dependency makes it security-specific
- Primary consumers are all security features
- Smaller scope = faster extraction (5 days vs. 7+ for full generalization)

---

## Next Steps

1. Get approval from @security-generative-ai team
2. Create tracking issue
3. Coordinate with correlation and threat intel teams (potential consumers)

---

**Status**: Draft → awaiting team review
