# CONN-008: Normalized bulk-ready connector page action — Design decision

## Context

Each connector's ingest action returns data in its own format. Workflow authors
must write per-connector `foreach` + `elasticsearch.index` mappings. This ticket
evaluates whether a standardized `page` action returning bulk-ready lines is worth it.

## Decision: Implement as optional pattern, not mandatory

**Status:** Accepted for POC. Not recommended as a platform default.

## Rationale

### When normalized actions help
- High-volume catalog connectors (GitHub, Jira) where the workflow is pure
  fetch → index with no transformation
- Package authors who want thinner workflow YAML

### When stock `elasticsearch.index` loop is better
- Any transformation is needed (field mapping, enrichment, filtering)
- Low-volume connectors where the overhead isn't justified
- Cross-source joins where uniformity doesn't help

### Cost/benefit

| Aspect | Normalized action | Stock index loop |
|--------|------------------|-------------------|
| Workflow YAML length | Shorter (1 step vs 2) | Longer (fetch + foreach index) |
| Connector coupling | Higher (connector knows about ES) | Lower (connector is ES-agnostic) |
| Flexibility | Lower (fixed _id, no transform) | Higher (full control) |
| Maintenance | Connector author maintains | Workflow author maintains |

## Recommendation

1. **Do not** add a mandatory `page` action to all connectors
2. **Do** document the normalized pattern as optional for high-volume connectors
3. **Do** provide a helper utility `toBulkLines(items, idField)` that connectors
   can call internally if they choose to implement a normalized action

## Example: optional normalized action

\`\`\`ts
// A connector may optionally implement this:
async function getProjectV2PageNormalized(ctx, input) {
  const result = await getProjectV2Page(ctx, input);
  return {
    items: result.nodes,
    cursor: result.pageInfo.endCursor,
    hasMore: result.pageInfo.hasNextPage,
  };
}
\`\`\`

The workflow then uses `elasticsearch.bulk` with `id_field` directly:

\`\`\`yaml
- id: fetch-and-index
  connector.github.getProjectV2PageNormalized:
    cursor: "${checkpoint.cursor}"
  elasticsearch.bulk:
    id_field: id
    operations: "${fetch-and-index.items}"
\`\`\`

## Conclusion

The trade-off favors keeping connectors ES-agnostic. The `id_field` parameter
added in WF-004 already solves the idempotency problem. Package authors can
normalize in the workflow's `foreach` step. A platform-level normalized action
would add coupling without sufficient benefit.
