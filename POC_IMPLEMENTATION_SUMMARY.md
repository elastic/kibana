# POC Implementation Summary

## Files Modified

### 1. Core Logic (kbn-discover-utils)

#### `src/platform/packages/shared/kbn-discover-utils/src/data_types/logs/utils/get_available_resource_fields.ts`
- ✅ Added `ResourceFieldResult` interface to track field metadata
- ✅ Added `flattenSourceObject()` helper to flatten nested `_source` objects
- ✅ Added `checkSourceForResourceField()` to search `_source` with prefixes
- ✅ Added `getAvailableResourceFieldsWithSourceFallback()` main POC function
- ✅ Keeps original `getAvailableResourceFields()` unchanged for backward compatibility

#### `src/platform/packages/shared/kbn-discover-utils/src/data_types/logs/utils/get_available_resource_fields.test.ts`
- ✅ Added 7 new test cases for POC functionality
- ✅ Tests cover: mapped fields, source fallback, preferences, mixed scenarios
- ✅ All 17 tests passing

### 2. UI Components (kbn-discover-contextual-components)

#### `src/platform/packages/shared/kbn-discover-contextual-components/src/data_types/logs/components/summary_column/utils.tsx`
- ✅ Added `isFromSource?: boolean` to `ResourceFieldDescriptor` interface
- ✅ Imported `getAvailableResourceFieldsWithSourceFallback`
- ✅ Added `createResourceFieldsWithSourceFallback()` POC function
- ✅ Handles value extraction from both flattened and `_source`
- ✅ Keeps original `createResourceFieldsWithOtelFallback()` unchanged

#### `src/platform/packages/shared/kbn-discover-contextual-components/src/data_types/logs/components/summary_column/resource.tsx`
- ✅ Updated to pass `isFromSource` to badges
- ✅ Disables `onFilter` for source-based fields (not filterable)
- ✅ Shows `eyeClosed` icon for non-filterable fields

#### `src/platform/packages/shared/kbn-discover-contextual-components/src/data_types/logs/components/cell_actions_popover.tsx`
- ✅ Added `iconType` prop to `FieldBadgeWithActionsProps`
- ✅ Updated `FieldBadgeWithActions` to use `iconType` or `icon`
- ✅ Supports showing visual indicators for special field states

### 3. Documentation

#### `POC_SOURCE_FALLBACK_RESOURCE_FIELDS.md`
- ✅ Complete POC documentation
- ✅ Example data showing the problem
- ✅ Implementation details
- ✅ Usage examples with code
- ✅ Key features and limitations
- ✅ Next steps for production

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        Document Input                            │
│  flattened: { 'service.name': 'svc', 'host.name': 'host-0' }   │
│  _source: {                                                      │
│    attributes: {                                                 │
│      'kubernetes.pod.name': 'pod-113',                          │
│      'kubernetes.namespace': 'default'                          │
│    }                                                             │
│  }                                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│   getAvailableResourceFieldsWithSourceFallback()                │
│   1. Check flattened for ECS/OTel fields (PREFERRED)           │
│   2. Flatten _source and check for attributes.* fields          │
│   3. Check for resource.attributes.* fields                     │
│   4. Return field names + isFromSource metadata                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│   createResourceFieldsWithSourceFallback()                      │
│   1. Get fields with metadata                                   │
│   2. Extract values from flattened or _source                   │
│   3. Format values for display                                  │
│   4. Create ResourceFieldDescriptor with isFromSource flag      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│   Resource Component                                             │
│   1. Render badges for each field                               │
│   2. If isFromSource=true:                                      │
│      - Disable onFilter (no filter actions)                     │
│      - Show eyeClosed icon (visual indicator)                   │
│   3. If isFromSource=false:                                     │
│      - Enable filtering                                          │
│      - Show normal icon (agent, etc.)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### ✅ Fallback-First Approach
Mapped fields are ALWAYS preferred over `_source` fields. This ensures:
- Best performance (mapped fields are optimized)
- Correct filtering behavior
- Backward compatibility

### ✅ Metadata Tracking
Every field carries `isFromSource` metadata through the entire pipeline, enabling:
- Smart UI decisions (disable filtering for unmapped fields)
- Clear visual indicators for users
- Future enhancements (tooltips, warnings, etc.)

### ✅ Non-Breaking Changes
All original functions remain unchanged:
- `getAvailableResourceFields()` - still works as before
- `createResourceFieldsWithOtelFallback()` - still works as before
- New POC functions are additive only

### ✅ Visual Clarity
Users can immediately see which fields are filterable:
- Normal badges = filterable (standard behavior)
- Eye icon badges = view-only (no filtering)

## Testing

All tests pass:
```bash
yarn test:jest src/platform/packages/shared/kbn-discover-utils/src/data_types/logs/utils/get_available_resource_fields.test.ts
```

Result: ✅ 17 tests passed

## Next Steps to Enable

### Quick Test
In `summary_column.tsx` line ~92, replace:
```typescript
createResourceFieldsWithOtelFallback({
```
with:
```typescript
createResourceFieldsWithSourceFallback({
```

### Production Considerations
1. Add feature flag for gradual rollout
2. Add telemetry to track source-field usage
3. Consider performance impact on large documents
4. Add user-facing tooltips explaining non-filterable fields
5. Add configuration to enable/disable per data view

## Example Output

With the example document from the requirements:
- `service.name` → 🟢 Filterable badge (mapped field)
- `host.name` → 🟢 Filterable badge (mapped field)  
- `attributes.kubernetes.namespace: default` → 👁️ View-only badge (from _source)
- `attributes.kubernetes.pod.name: pod-113` → 👁️ View-only badge (from _source)
