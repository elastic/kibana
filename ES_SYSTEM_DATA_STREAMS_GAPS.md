# Elasticsearch system data stream gaps: codebase verification

This document records the findings from reading the Elasticsearch source code directly against the three gaps documented in `src/platform/packages/private/kbn-data-streams/README.md`. It is intended as an internal working reference for the conversation with the ES team tracked in [kibana-team#3902](https://github.com/elastic/kibana-team/issues/3902).

---

## Gap 1: Backing index protection when a stream is created before its descriptor exists

### What we originally claimed

That backing indices of a system data stream do not carry the `system` flag, allowing direct access without a product-origin header.

### What is actually true

When a stream is created **with** a `SystemDataStreamDescriptor` already registered in ES, backing indices **do** receive `system: true` in their index metadata at creation time. The same applies during rollover — ES re-looks up the descriptor and stamps new backing indices accordingly. A cluster-listener service (`SystemIndexMetadataUpgradeService`) also runs on the master node to retroactively correct any indices whose flag does not match what the descriptor requires. Backing index names are included in the system automaton used for access-control checks, so direct backing-index access is restricted just as the stream itself is.

### The real gap

The protection above only holds when the `SystemDataStreamDescriptor` **exists in ES at the time Kibana creates the stream**. If Kibana boots and creates the stream first — because the descriptor has not shipped in that ES version yet — the initial backing index is created without the system flag. `SystemIndexMetadataUpgradeService` will eventually correct the metadata, but there is a window in which the index has no system protection. On serverless this ordering cannot be guaranteed.

This gap is a downstream consequence of Gap 3 (below). If the descriptor could be registered without owning a template body, ES could ship the descriptor ahead of any Kibana writes and the race disappears.

### Corrected wording for documentation

Gap 1 is not an independent structural flaw in ES. It is an ordering risk created by the template-coupling constraint in Gap 3. Once Gap 3 is resolved, Gap 1 resolves with it.

---

## Gap 2: `.kibana_*` wildcard creates ambiguous classification

### What we originally claimed

That ES silently classifies any `.kibana_*`-named data stream as a system index through wildcard fallthrough even when no `SystemDataStreamDescriptor` exists for it.

### What is actually true

ES does **not** fall through silently. When a stream name matches a `SystemIndexDescriptor` pattern (e.g. `.kibana_*`) but has no matching `SystemDataStreamDescriptor`, ES logs a warning at creation time:

> "creating data stream [x] whose name matches system index pattern [.kibana_*] but which is not registered as a system data stream; its backing indices will not receive system index protections and may be accessible to unauthorized users"

The stream is created anyway — the warning is not surfaced to the Kibana operator and the behaviour is still wrong — but it is not "silent".

More importantly, **the ES Kibana plugin has already narrowed the wildcard patterns to exclude all currently registered data streams**. Instead of `.kibana_*`, the pattern is now `.kibana_~(change_history*)`. Similarly, `.workflows-*` is `.workflows~(-events*|-execution-data-stream-logs*)`. This complement syntax (same as Fleet's approach) means the wildcard index descriptor no longer matches the known data streams.

### The remaining gap

The workaround covers the streams that exist today. Any future Kibana data stream that falls under `.kibana_*` or `.workflows-*` must:

1. Register a `SystemDataStreamDescriptor` in ES (or the Kibana ES plugin), **and**
2. Update the `SystemIndexDescriptor` complement pattern to exclude the new stream name, **and**
3. Do both before or alongside the Kibana code that first writes to that stream.

ES still issues a warning instead of an error when neither condition is met. Tightening this to a hard rejection would require an ES-owned behavior change and has backward-compatibility implications.

---

## Gap 3: `SystemDataStreamDescriptor` requires the index template at construction

### What we originally claimed

That `SystemDataStreamDescriptor` forces a cross-repo ordering dependency because the matching index template must be defined in ES at the time the descriptor is instantiated.

### What is actually true

Confirmed directly from the ES source. The `SystemDataStreamDescriptor` constructor contains:

```java
this.composableIndexTemplate = Objects.requireNonNull(
    composableIndexTemplate, "composableIndexTemplate must be provided");
```

There is no optional path, no lazy resolution, and no lookup mechanism. The full template object must be provided at construction time, which happens during ES plugin load. This is the root cause of the ordering constraint: ES cannot register the descriptor at boot without the template body, and Kibana (which owns the templates) may not have applied them yet.

This is the only gap that requires an ES code change to resolve. The upstream ES issue is [elastic/elasticsearch#149309](https://github.com/elastic/elasticsearch/issues/149309).

### What a fix looks like

Making `composableIndexTemplate` nullable (or accepting a name-only descriptor that defers template lookup) would touch roughly 5-7 files:

- `SystemDataStreamDescriptor.java` — allow null template; add a name-only constructor or factory method
- `MetadataCreateDataStreamService.java` — handle null template when computing stream options and backing index settings
- `MetadataRolloverService.java` — same null check when resolving the template for a new backing index on rollover
- 2-3 test files

The change is self-contained and the ES team already has an open issue requesting exactly this. A draft PR sketching the API shape would be a useful input for the team conversation.

---

## Summary

| Gap | Claim accuracy | ES PR needed | Scope |
|-----|---------------|--------------|-------|
| 1: Backing index flag | Overstated. Flag propagation works when descriptor exists. Real issue is ordering, a side effect of Gap 3. | No independent fix needed | — |
| 2: `.kibana_*` wildcard | Partially overstated. ES warns (not silent). ES has already narrowed patterns for known streams. Future streams still at risk. | Warn-to-error is a behavior change, ES team must own | Low urgency |
| 3: Template coupling | Fully confirmed. Hard `requireNonNull` in constructor. Root cause of the ordering constraint. | Yes — ~5-7 files, open ES issue exists | Medium scope, good draft PR candidate |

The presentation and README documentation should be updated to reflect that Gap 1 and Gap 2 are less severe (and in Gap 2's case, already mitigated for current streams) than originally stated, and that Gap 3 is the root issue worth pushing the ES team on.
