# POC: Source Fallback for Resource Fields

## Overview

This POC demonstrates how to extract resource fields from `_source` when they're not available as mapped fields. This is useful for OpenTelemetry data where resource attributes might be nested under `attributes.*` or `resource.attributes.*` prefixes but not properly mapped to ECS fields.

## Example Data

Here's an example document that has resource information in `_source` but not as mapped fields:

```json
{
  "@timestamp": "2026-01-21T08:53:36.043Z",
  "body.text": "...",
  "host.name": "host-0",
  "message": "...",
  "resource.attributes.host.name": "host-0",
  "stream.name": "logs",
  "_source": {
    "@timestamp": 1768985616043,
    "resource": {
      "attributes": {
        "host.name": "host-0"
      }
    },
    "stream.name": "logs",
    "attributes": {
      "process.id": 1194,
      "filepath": "Proxifier.log",
      "kubernetes.namespace": "default",
      "user.name": "user396",
      "kubernetes.pod.name": "pod-113"
    },
    "body": {
      "text": "..."
    }
  }
}
```

In this case, `attributes.kubernetes.pod.name` and `attributes.kubernetes.namespace` exist in `_source` but are not mapped fields.

## Implementation

### 1. New Function: `getAvailableResourceFieldsWithSourceFallback`

Located in: `kbn-discover-utils/src/data_types/logs/utils/get_available_resource_fields.ts`

This function:
- First checks for mapped fields (ECS, OTel aliases) - these are filterable
- Falls back to checking `_source` for fields with `attributes.*` or `resource.attributes.*` prefixes
- Returns metadata indicating whether each field is from `_source` (not filterable) or mapped (filterable)

```typescript
export interface ResourceFieldResult {
  fieldName: string;
  isFromSource: boolean; // true = not filterable, false = filterable
}

export const getAvailableResourceFieldsWithSourceFallback = (
  resourceDoc: Record<string, unknown>,
  source?: Record<string, unknown>
): ResourceFieldResult[]
```

### 2. New Function: `createResourceFieldsWithSourceFallback`

Located in: `kbn-discover-contextual-components/src/data_types/logs/components/summary_column/utils.tsx`

This function creates resource field descriptors with the `isFromSource` metadata, which is used to:
- Disable filter actions for non-mapped fields
- Show a visual indicator (eye icon) that the field is not filterable

### 3. Visual Indicators

When a resource field comes from `_source`:
- The filter actions are **disabled** (clicking the badge won't show filter options)
- An **eyeClosed icon** is shown on the badge to indicate it's view-only

## Usage

To enable the POC in the summary column, replace the call to `createResourceFieldsWithOtelFallback` with `createResourceFieldsWithSourceFallback`:

### Option 1: Replace in summary_column.tsx (Line ~92)

```typescript
// Before (current implementation):
const resourceFields = createResourceFieldsWithOtelFallback({
  row,
  dataView,
  core,
  share,
  fieldFormats,
});

// After (POC with source fallback):
const resourceFields = createResourceFieldsWithSourceFallback({
  row,
  dataView,
  core,
  share,
  fieldFormats,
});
```

### Option 2: Add as a feature flag or configuration option

```typescript
// Example with feature flag
const useSourceFallback = core.uiSettings.get('logs:useSourceFallbackForResourceFields', false);

const resourceFields = useSourceFallback
  ? createResourceFieldsWithSourceFallback({
      row,
      dataView,
      core,
      share,
      fieldFormats,
    })
  : createResourceFieldsWithOtelFallback({
      row,
      dataView,
      core,
      share,
      fieldFormats,
    });
```

### Complete Example

Here's how the data flows through the system:

```typescript
// 1. Input document with _source containing unmapped fields
const document = {
  flattened: {
    'service.name': 'my-service',
    'host.name': 'my-host',
  },
  raw: {
    _source: {
      'service.name': 'my-service',
      attributes: {
        'kubernetes.pod.name': 'pod-113',
        'kubernetes.namespace': 'default',
      },
    },
  },
};

// 2. Get available fields with source fallback
const fieldsWithMetadata = getAvailableResourceFieldsWithSourceFallback(
  document.flattened,
  document.raw._source
);
// Returns:
// [
//   { fieldName: 'service.name', isFromSource: false },
//   { fieldName: 'host.name', isFromSource: false },
//   { fieldName: 'attributes.kubernetes.namespace', isFromSource: true },
//   { fieldName: 'attributes.kubernetes.pod.name', isFromSource: true },
// ]

// 3. Create resource field descriptors
const resourceFields = createResourceFieldsWithSourceFallback({
  row: document,
  dataView,
  core,
  share,
  fieldFormats,
});
// Each descriptor includes:
// {
//   name: 'attributes.kubernetes.pod.name',
//   value: 'pod-113',
//   rawValue: 'pod-113',
//   isFromSource: true, // <-- This field is not filterable
//   ResourceBadge: Component,
//   Icon: undefined,
// }

// 4. Render badges with appropriate behavior
// Badges with isFromSource=true will:
// - Show an eye icon indicating view-only
// - Have onFilter disabled (no filter actions available)
```

## Testing

Run the tests:

```bash
yarn test:jest kbn-discover-utils/src/data_types/logs/utils/get_available_resource_fields.test.ts
```

## Key Features

✅ **Fallback-only**: Mapped fields are always preferred over `_source` fields  
✅ **Metadata tracking**: Each field includes `isFromSource` to indicate filterability  
✅ **Visual indicators**: Non-filterable fields show an eye icon and disable filter actions  
✅ **Nested flattening**: Properly handles nested `_source` structure  
✅ **Prefix support**: Checks both `attributes.*` and `resource.attributes.*` prefixes  

## Limitations

- Fields from `_source` are **not filterable** because they're not mapped in Elasticsearch
- Only checks for known resource field patterns (kubernetes.*, host.name, service.name, etc.)
- Requires `_source` to be available in the document

## Next Steps

To make this production-ready:

1. Add configuration to enable/disable the fallback behavior
2. Consider adding a tooltip explaining why some fields aren't filterable
3. Test performance impact of flattening large `_source` objects
4. Consider caching flattened `_source` if accessed multiple times
5. Add telemetry to track usage of source-based fields
