# Universal Logs Document Profile

## Purpose

Provides log-optimized document viewer features for individual log documents across all solution contexts.

This is a **companion profile** to `universal_logs_data_source_profile`:
- **Data Source Profile**: Table-level features (cells, rows, columns)
- **Document Profile**: Document-level features (doc viewer)

## Why a Separate Document Profile?

Discover's architecture requires doc viewer features to be implemented at the **document profile level**, not the data source level:

```
Profile Hierarchy: root → data source → document (per result)
```

- **Data source profiles**: Resolve once per query (table features)
- **Document profiles**: Resolve per document (doc viewer features)

The Streams feature and other doc viewer integrations need access to per-document metadata, which is only available at the document profile level.

## Extension Points

### Implemented

1. **getDocViewer** - Log-optimized document viewer
   - Adds "Logs overview" tab to document flyout
   - **Capability-aware**: Features adapt based on available apps
   - Integrates with Streams, APM, and AI features when available

## Capability Detection

| Feature | Requires | With Apps | Without Apps (ES3) |
|---------|----------|-----------|-------------------|
| **Streams integration** | `streams` feature | ✅ Stream name link, "View in Streams" | Hidden |
| **APM integration** | `apm` app | ✅ "View in APM" links | Hidden |
| **AI Assistant** | `observability-logs-ai-assistant` | ✅ AI insights | Hidden |
| **AI Insight** | `observability-logs-ai-insight` | ✅ Automatic insights | Hidden |

All features are checked at runtime - no hard dependencies.

### ES|QL Metadata Requirement

**Important**: For Streams integration to work with ES|QL queries, you must include `METADATA _index`:

```esql
FROM logs-* METADATA _index
```

**Why**: The Streams feature uses `doc.raw._index` to resolve stream names. In DSL/KQL mode, this is always available. In ES|QL mode, you must explicitly request it with `METADATA _index`.

**Without metadata**: Stream section shows "-" (no stream name)  
**With metadata**: Stream section shows clickable stream name link ✅

## Activation Logic

```typescript
resolve: (params) => {
  // Only activate for documents in logs data sources
  if (params.dataSourceContext?.category !== DataSourceCategory.Logs) {
    return { isMatch: false };
  }
  return { isMatch: true };
}
```

The document profile only activates when:
1. The parent data source profile has identified the data as logs
2. Processing an individual document from the results

## Relationship with Data Source Profile

| Profile | Level | Features | Activation |
|---------|-------|----------|------------|
| **Data Source** | Per query | Table rendering (cells, rows, columns) | When data source is logs |
| **Document** | Per document | Doc viewer tabs | When document is from logs data source |

Both profiles must activate together for the complete log UX.

## Relationship with O11y Log Document Profile

| Aspect | Universal Document Profile | O11y Document Profile |
|--------|--------------------------|----------------------|
| **Activation** | All solutions | Observability only |
| **State Management** | Stateless | Uses `logOverviewContext$` |
| **Accordion Control** | No state coordination | Coordinates row controls → doc viewer sections |
| **Precedence** | Lower | Higher (O11y users get this instead) |

**Key Difference**: O11y profile uses a `BehaviorSubject` to coordinate state between row controls and the doc viewer (e.g., clicking "stacktrace" button opens doc viewer to stacktrace section). The universal profile provides the same UI but without this stateful coordination.

## Testing

```bash
yarn test:jest --testPathPattern=universal_logs_document_profile
```

## Related Files

- **Data Source Profile**: `../universal_logs_data_source_profile/`
- **O11y Document Profile**: `../../observability/log_document_profile/`
- **Profile Registration**: `../../register_profile_providers.ts`
