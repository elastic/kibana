# Native OTLP for @kbn/evals Design

**Date:** 2026-02-25  
**Status:** Approved  
**Goal:** Enable native Elasticsearch OTLP endpoints for @kbn/evals, eliminating EDOT collector Docker dependency

## Problem Statement

Currently, `@kbn/evals` requires developers to run EDOT collector via Docker (`node scripts/edot_collector.js`) to capture traces during evaluation runs. With Elasticsearch 9.x+ native OTLP support at `/_otlp/v1/{traces,metrics,logs}`, this Docker dependency should be eliminated for improved developer experience.

## Architecture

### Current Flow
```
Kibana → HTTP exporter → EDOT collector (Docker) → Elasticsearch
```

### New Flow  
```
Kibana → Elasticsearch exporter → ES native OTLP (direct) + HTTP fallback
```

## Design Approach

**Selected: Approach 1 - Update Default Scout Config**

Update the existing `evals_tracing` Scout configuration to prioritize native Elasticsearch OTLP endpoints while maintaining backward compatibility through fallback exporters.

### Benefits
- Zero breaking changes for existing workflows
- Eliminates Docker dependency for ES 9.x+ users
- Leverages existing native OTLP infrastructure
- Graceful degradation for older ES versions

## Components & Configuration

### Exporter Priority Order
```javascript
const exporters = [
  {
    elasticsearch: {
      endpoint: 'http://localhost:9200',
      username: 'elastic', 
      password: 'changeme'
    }
  },
  {
    http: {
      url: 'http://localhost:4318/v1/traces'  // EDOT fallback
    }
  },
  {
    phoenix: {
      base_url: 'http://localhost:6006',
      public_url: 'http://localhost:6006', 
      project_name: 'kibana-evals'
    }
  }
]
```

### Configuration Changes
1. **Update `evals_tracing` Scout config** - Add elasticsearch exporter as primary
2. **Preserve fallback behavior** - Keep http exporter for ES 8.x compatibility  
3. **Maintain environment overrides** - Support existing TRACING_EXPORTERS customization

## Error Handling & Fallback

### Failure Scenarios
- **ES 8.x clusters:** Elasticsearch exporter fails silently, http exporter handles traces
- **Network issues:** Both exporters attempt delivery, ensuring trace preservation
- **Auth problems:** Clear error messages guide credential configuration

### User Experience by Environment
- **ES 9.x+ users:** Zero setup required, traces flow directly to Elasticsearch
- **ES 8.x users:** Existing workflow unchanged (still requires EDOT collector)
- **Mixed environments:** Automatic detection and appropriate routing

## Implementation Plan

### Phase 1: Configuration Update
1. Update default `evals_tracing` Scout config to match `evals_tracing_native` pattern
2. Implement elasticsearch-first exporter array with http fallback
3. Preserve custom port handling and environment variable support

### Phase 2: Documentation & Migration  
1. Update `@kbn/evals` README with simplified workflow (remove EDOT collector requirement)
2. Add ES version compatibility matrix and troubleshooting guide
3. Reclassify EDOT collector as "optional for ES 8.x" rather than required

### Phase 3: Validation & Testing
1. Unit tests for exporter configuration generation
2. Integration tests covering ES 9.x+ native and ES 8.x fallback scenarios  
3. End-to-end evals workflow validation ensuring traces reach Elasticsearch
4. Backward compatibility verification for existing setups

## Migration Impact

### For Users
- **ES 9.x+:** Immediate simplification - no Docker setup required
- **ES 8.x:** No changes required - existing workflows continue working
- **Mixed teams:** Gradual adoption possible, no forced migration

### For Codebase  
- **Zero breaking changes** to public APIs or command interfaces
- **Additive configuration** - new exporter priority, existing fallbacks preserved
- **Documentation updates** to reflect simplified recommended workflow

## Success Criteria

1. **Simplified workflow:** ES 9.x+ users can run evals without EDOT collector
2. **Backward compatibility:** All existing workflows continue functioning
3. **Graceful degradation:** Automatic fallback for unsupported ES versions
4. **Clear documentation:** Users understand when to use which approach
5. **Robust testing:** Both native and fallback paths validated in CI

## Future Considerations

- **EDOT collector deprecation timeline:** Consider phasing out after ES 9.x adoption
- **Performance monitoring:** Compare native vs collector throughput and latency
- **Advanced features:** Leverage ES native OTLP capabilities (sampling, filtering)