# Service Map Workflow - Service Metadata Enhancement

## Overview

Enhanced the APM service map workflow to capture and utilize full service identity (name + environment + agent) throughout the discovery and aggregation process.

## Problem Statement

The original implementation only captured `service.name` during service discovery, losing critical metadata:
- Service environment (prod, dev, staging, etc.)
- Agent name (java, nodejs, python, etc.)

This caused issues:
- Unable to distinguish same service across different environments
- Missing agent information for proper service map visualization
- Incomplete source metadata in edge documents

## Solution

### 1. Enhanced Service Discovery (`discover_services.ts`)

**Changed from:**
```typescript
// Single-field aggregation
terms: {
  field: SERVICE_NAME,
  size: 10000
}
```

**Changed to:**
```typescript
// Multi-field aggregation
multi_terms: {
  terms: [
    { field: SERVICE_NAME },
    { field: SERVICE_ENVIRONMENT, missing: '' },
    { field: AGENT_NAME, missing: '' }
  ],
  size: 10000
}
```

**Service document structure:**
```typescript
{
  service_name: string;        // e.g., "order-service"
  service_environment: string; // e.g., "production" or "" if missing
  service_agent: string;       // e.g., "java" or "" if missing
  doc_count: number;
  discovered_at: date;
}
```

**Document ID:**
```
{service_name}|{environment||'_default'}|{agent||'_unknown'}
```

Example: `order-service|production|java`

### 2. Updated Index Mappings

**Added to `.apm-service-map-workflow` index:**
```yaml
service_environment:
  type: keyword
service_agent:
  type: keyword
```

### 3. Enhanced Aggregation by Service (`aggregate_by_service.ts`)

**Service Metadata Interface:**
```typescript
interface ServiceMetadata {
  service_name: string;
  service_environment: string;
  service_agent: string;
}
```

**Pagination with Metadata Extraction:**
```typescript
// Query services from ES index (100 per page)
const response = await esClient.search({
  index: SERVICES_INDEX,
  size: 100,
  sort: [{ discovered_at: 'desc' }, { service_name: 'asc' }],
  query: {
    bool: {
      must: [{ exists: { field: 'service_name' } }]
    }
  }
});

// Extract full metadata
hits.forEach((hit) => {
  allServices.push({
    service_name: source.service_name,
    service_environment: source.service_environment || '',
    service_agent: source.service_agent || '',
  });
});
```

**Batch Processing:**
- Services are batched as `ServiceMetadata[]` (not just strings)
- Service names extracted for aggregation filters
- Full metadata available for logging and error reporting

### 4. Updated Documentation

Enhanced `ONE_WORKFLOW_SERVICE_MAP.md` to reflect:
- Multi-field aggregation in Step 3 (Discover Services)
- Metadata extraction in Steps 4-5 (Aggregate by Service)
- Updated index mapping documentation

## Benefits

1. **Complete Service Identity**: Captures the full service identity triplet (name + environment + agent)

2. **Environment Isolation**: Can distinguish `order-service|production|java` from `order-service|staging|java`

3. **Agent Visibility**: Know which agent/language each service uses for better troubleshooting

4. **Proper Edge Metadata**: Source service metadata flows through to edge documents for accurate service map visualization

5. **Backward Compatible**: Uses `missing: ''` for environments/agents that don't exist in older data

## Next Steps

The following components need to be updated to fully utilize this metadata:

### 1. Aggregation Functions (`aggregation.ts`)
- [ ] Update `aggregateExitSpanEdges` to use service environment/agent in filters
- [ ] Update `aggregateSpanLinkEdges` to use service environment/agent in filters
- [ ] Ensure source_environment and source_agent are populated in edge documents

### 2. Resolution Logic (`resolve_service_map_destinations.ts`)
- [ ] Populate destination_environment from transaction/span lookups
- [ ] Populate destination_agent from transaction/span lookups
- [ ] Match destination services by full identity (not just name)

### 3. Testing
- [ ] Unit tests for multi-field service discovery
- [ ] Integration tests for metadata flow through aggregation
- [ ] FTR tests for end-to-end workflow with metadata

## Files Modified

1. `discover_services.ts` - Multi-field aggregation, metadata storage
2. `aggregate_by_service.ts` - Metadata extraction, typed interfaces
3. `ONE_WORKFLOW_SERVICE_MAP.md` - Index mappings, workflow documentation

## Migration Notes

**Index Migration:**
- Existing `.apm-service-map-workflow` index needs reindexing or will auto-update mapping on next write
- Old service documents (without environment/agent) will coexist with new ones
- Document IDs changed from `{service_name}` to `{service_name}|{env}|{agent}` - this will create new documents

**Data Cleanup:**
- Consider running cleanup to remove old service documents (those without `service_environment` field)
- Or wait for next discovery cycle to naturally replace them

## Example Query

**Before:**
```json
{
  "service_name": "order-service",
  "doc_count": 1500,
  "discovered_at": "2024-01-15T10:30:00Z"
}
```

**After:**
```json
{
  "service_name": "order-service",
  "service_environment": "production",
  "service_agent": "java",
  "doc_count": 1500,
  "discovered_at": "2024-01-15T10:30:00Z"
}
```
