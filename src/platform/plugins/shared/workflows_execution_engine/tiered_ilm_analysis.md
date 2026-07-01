# Analysis: Multi-Tier ILM for Workflow Execution Backing Indexes

## Prompt

I consider to keep my backing indexes for a long time. The idea is the following:

- **hot tier** - currently non-terminal execution metadata
- **warm tier** - all execution metadatas are terminal, not modified, only read
- **cold tier** - all execution metadatas are terminal, not modified, rarely read
- **frozen** - all execution metadatas are terminal, not modified, very rarely read, ready for deletion
- **delete** - remove indexes completely

Does it make sense?

I see one caveat: I need a manual condition to transit from hot to warm, as I have to know if all my workflow executions are complete in the index before marking backing indexes containing them warm. For warm → cold, cold → frozen, frozen → deleted I need them to take action automatically. Can I achieve that?

## Analysis

### Does the tier model make sense?

**Yes, conceptually it maps well to the lifecycle of execution data.** The tiers align with the access pattern:

| Tier | State | Access Pattern | Fits? |
|------|-------|---------------|-------|
| Hot | Non-terminal executions present | Frequent reads + writes | Yes - this is where the mutable execution loop operates |
| Warm | All terminal, recently settled | Read-only, moderate frequency (UI history, debugging) | Yes - no writes, optimized for read |
| Cold | All terminal, aged | Infrequent reads (auditing, compliance) | Yes - cheaper storage, acceptable latency |
| Frozen | All terminal, old | Very rare reads (forensic, regulatory) | Yes - cheapest storage, high latency ok |
| Delete | Past retention | None | Yes - reclaim resources |

**However, this is a significant shift from the current RFC's philosophy.** The rollover index RFC proposes dropping fully-terminal backing indexes as soon as possible (O(1) cleanup). The tiered approach replaces "drop ASAP" with "demote gradually and keep for a long time." These are fundamentally different retention strategies. Make sure you actually need long-term execution history — if you don't, the simpler "drop whole index" approach from the RFC is cheaper and less complex.

### The hot-to-warm caveat: can you do it?

**Yes, but not with standard ILM `min_age` alone.** This is the core tension correctly identified.

ILM phase transitions are triggered by `min_age` (relative to rollover time), index size, or document count. None of these express the semantic condition "all executions in this index are terminal." The hot→warm transition requires **business logic** that ILM doesn't natively support.

**The solution: `_ilm/move` API + application-driven transition.**

Elasticsearch provides `POST /{index}/_ilm/move` which manually advances an index to a specific ILM phase. The approach would be:

1. **Configure the ILM policy with a warm `min_age` set impossibly high** (e.g., `"99999d"`) so ILM never auto-transitions to warm.
2. **The cleanup background task** (the same one described in the RFC's TOBEDEFINED section) checks each old backing index for non-terminal executions.
3. **When all executions are terminal**, instead of dropping the index, call:

```
POST /.workflows-executions-000001/_ilm/move
{
  "current_step": { "phase": "hot", "action": "complete", "name": "complete" },
  "next_step": { "phase": "warm", "action": "...", "name": "..." }
}
```

4. **Once in warm, ILM takes over automatically** for cold→frozen→delete transitions based on `min_age`.

This is a supported and documented pattern. The `_ilm/move` API exists precisely for cases where application logic determines phase readiness.

### Automatic warm → cold → frozen → delete: yes, this works natively

Once an index enters the warm phase (via the manual `_ilm/move`), ILM handles all subsequent transitions automatically. The policy would look like:

```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_age": "1d" }
        }
      },
      "warm": {
        "min_age": "99999d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "shrink": { "number_of_shards": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {}
      },
      "frozen": {
        "min_age": "90d",
        "actions": {}
      },
      "delete": {
        "min_age": "180d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

The warm→cold→frozen→delete transitions trigger automatically based on `min_age`.

### Critical subtlety: `min_age` reference point

**`min_age` is calculated from the index rollover time (or creation time), NOT from the time the index entered its current phase.** This has important implications:

**Scenario:** Index rolled over at T=0, but a long-running execution delays the manual warm transition until T=15d. Cold is set at `min_age: 30d`.

- The index enters warm at T=15d (via `_ilm/move`)
- Cold transition fires at T=30d (15 days after entering warm, not 30)
- If the long-running execution delayed warm until T=45d, the index would transition to cold **immediately** upon entering warm (because 45d > 30d already)

**Is this a problem?** Arguably no — it's actually reasonable. If data is old, it should be on cheaper storage regardless of when it became terminal. But it should be understood. If timers relative to the warm entry time are desired, `_ilm/move` would be needed for each transition (making them all application-driven), which defeats the purpose.

### Risks and concerns

**1. Operational complexity increase.** The current RFC's strength is single-tier simplicity. Adding four tiers means:
- Warm/cold/frozen nodes must exist in the Elasticsearch cluster (or use searchable snapshots for frozen)
- ILM policy tuning across five phases
- Monitoring per-tier index counts
- The `_ilm/move` integration in the cleanup task

**2. Long-running executions have amplified impact.** In the "drop whole index" model, a stuck execution just delays deletion. In the tiered model, it delays the *entire progression chain* — the index stays hot, consuming hot-tier resources (the most expensive tier), while all its terminal sibling executions could be on warm.

**3. Search performance across tiers.** Alias fan-out for search queries (`searchWorkflowExecutions`) now hits indexes across multiple tiers. Cold and frozen tier reads have significantly higher latency. Search results could have unpredictable latency depending on which tiers contain matching documents.

**4. Cluster topology requirement.** Hot/warm/cold/frozen tiers require node role configuration in Elasticsearch (`data_hot`, `data_warm`, `data_cold`, `data_frozen`). If targeting self-managed or single-node clusters, these tiers may not exist. On Elastic Cloud / serverless this is typically pre-configured.

**5. The `_ilm/move` API requires knowledge of the current ILM step.** The exact `current_step` (phase + action + name) must be specified, which means the cleanup task needs to call `GET /{index}/_ilm/explain` first to determine the index's current ILM step before issuing the move. This adds a read-then-write pattern.

### Verdict

| Aspect | Assessment |
|--------|-----------|
| Conceptual model | Sound — tiers match the data lifecycle |
| Manual hot→warm via `_ilm/move` | Viable — supported ES API, correct tool for the job |
| Automatic warm→cold→frozen→delete | Native ILM — works out of the box |
| `min_age` timing | Works but relative to rollover time, not phase entry — acceptable for most cases |
| Complexity vs. current RFC | Significantly higher — five phases, cluster topology requirements, `_ilm/move` integration |
| Worth it? | **Only if long-term execution history is genuinely needed.** If the goal is just to keep indexes bounded and performant, the RFC's "drop fully-terminal indexes" approach is simpler, cheaper, and already solves the core problem. The tiered approach is justified if there are compliance/audit requirements demanding months of execution history with cost-optimized storage. |

**Recommendation:** If proceeding with tiers, consider a hybrid — keep the "drop whole index" approach as the default, and make tiered retention an opt-in configuration for deployments that need long-term history. This way the simple case stays simple, and the complex case is possible.
