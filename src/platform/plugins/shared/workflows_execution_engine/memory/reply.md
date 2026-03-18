# Our Approach: Rollover Indexes with ILM

## What We're Doing Instead

**ILM-managed rollover aliases** — the same pattern used by alerting, APM, and security indexes in Kibana.

The key ideas:

1. **Rollover alias** — an alias (`.workflows-executions`) points to a series of numbered backing indexes (`-000001`, `-000002`, …). ILM automatically creates new ones based on `max_age` (default: 1 day).

2. **Pin each execution to its backing index** — when a workflow starts, we resolve the current write index and store it on the execution document. All subsequent writes for that execution target the pinned index, even if ILM rolls over in the meantime. No cross-index splitting.

3. **Encoded execution IDs** — the execution ID encodes the backing index suffix, so any caller can decode it and do a direct O(1) GET on the right index. No alias fan-out, no search needed for by-ID lookups.

4. **ILM lifecycle phases** — once all executions in a backing index reach a terminal state, the application advances it from hot → warm (forcemerge + shrink). From there, ILM handles warm → cold → frozen → delete automatically. No `delete_by_query`, no migration task, no manual cleanup.

## Why This Is Better Than CQRS

| | CQRS | Rollover Indexes |
|---|---|---|
| Query complexity | Two tiers + dedup | Single alias fan-out |
| Migration task | Required | Not needed |
| Mutability | Only in state index | All backing indexes |
| Infrastructure | 3+ components | Alias + ILM policy |
| Get by ID | Waterfall with fallback | O(1) direct GET |

**Bottom line:** rollover aliases give us bounded indexes, automatic lifecycle, and full mutability — with less complexity than CQRS and no migration machinery.
