# HTML Presentation: Rolled-Over Workflow Indexes with ILM

## Tone

The presentation tone is **analytical and decision-oriented**: "Here's the problem, the options we evaluated, and why we chose this approach."
- Motivation slides: "This is what's broken and why we need to act"
- Rejected-option slides: "Each approach was considered seriously — here's why it didn't fit"
- Chosen-approach slides: "Here's exactly how rollover indexes work and what we gain"
- Closing: "Open questions for the team"

## Approach

Multi-file React + Vite structure at `./presentation/`.
Each slide is a React component composing shared layout components (TitleSlide, ContentSlide, TwoColumns, CodeBlock, FlowDiagram, Card, SlideTable, BulletList, Badge).

**Design system:** Elastic brand colors, Inter font, light theme. Blue title slides, white content slides.

## Source material

All content derived from:
- `data_streams_rfc.md` — the CQRS tiered-storage approach (rejected option)
- `rollover_index_rfc.md` — the chosen rollover-index approach

## Slide Structure

### Slide 1 — Title slide
- "Rolled-Over Workflow Indexes with ILM"
- Subtitle: "Adopting ILM-managed rollover aliases for workflow execution state"
- Meta: "Workflows Execution Engine · Platform"

### Slide 2 — Agenda
- The motivation for change
- Options considered (and why they were abandoned)
- The chosen approach: rollover indexes with ILM
- Benefits and open questions

---

### Chapter 1: The Motivation for Change

**Slide 3 — Chapter title:** "Why We Need to Change"
- Subtitle: "Problems with flat indexes"

**Slide 4 — "Current State: Two Flat Indexes"**
- Source: `rollover_index_rfc.md` § Motivation; `data_streams_rfc.md` § Motivation
- Layout: two-column
- Left column: diagram/flow showing `.workflows-executions` and `.workflows-step-executions` as two flat indexes with hardcoded names
- Right column: BulletList summarizing current behavior — single index per entity, no lifecycle, everything in one place
- Key message: All active and historical execution data lives in two unbounded flat indexes with no lifecycle management.

**Slide 5 — "Problems at Scale"**
- Source: `rollover_index_rfc.md` § Motivation
- Layout: full-width with cards
- Three cards (warn variant):
  1. **Unbounded growth** — indexes grow indefinitely, no mechanism to remove historical data
  2. **No lifecycle management** — no ILM, no rollover, no automatic aging
  3. **Degrading queries** — active-execution queries slow down as historical data accumulates
- Key message: The current architecture has no path to managing execution data at scale.

---

### Chapter 2: Options Considered

**Slide 6 — Chapter title:** "Options We Evaluated"
- Subtitle: "Data streams, event sourcing, and CQRS"

**Slide 7 — "Option 1: Data Streams for Everything"**
- Source: `data_streams_rfc.md` § "Why not use data streams for everything"; `rollover_index_rfc.md` § "Why not data streams"
- Layout: two-column
- Left column: BulletList of what data streams offer (append-only, ILM-native, time-series optimized)
- Right column: BulletList of why they don't fit (no updates/deletes by doc ID, no `mget`, execution engine requires mutable state — steps change status multiple times, orchestrating steps manage evolving internal state)
- Key message: Data streams are append-only — the execution engine fundamentally requires mutable documents.

**Slide 8 — "Why Not Event Sourcing?"**
- Source: `data_streams_rfc.md` § "Why not event sourcing"; `rollover_index_rfc.md` § "Why not event sourcing"
- Layout: full-width BulletList
- Three reasons:
  1. **Unbounded events per execution** — orchestrating steps (`if`, `foreach`, sub-workflows) emit many transitions; event count is unpredictable
  2. **Consumers need objects, not streams** — UI/APIs expect materialized execution objects; replaying events adds latency and complexity for pagination/filtering
  3. **Runtime state must be fast** — execution loop reads/writes on every step transition; replaying event logs is not viable at that frequency
- Key message: Event sourcing trades write simplicity for read complexity — the wrong trade-off for an execution engine.

**Slide 9 — "Option 2: CQRS with Tiered Storage"**
- Source: `data_streams_rfc.md` § Design, § TLDR
- Layout: full-width with a FlowDiagram
- FlowDiagram: Execution State Index (mutable) → Scheduled Migration Task → Data Streams (append-only history)
- Below: brief description — mutable state index for active executions, data streams for completed history, connected by a daily migration task
- Key message: CQRS separates active state from history, using a regular index for writes and data streams for reads.

**Slide 10 — "CQRS: Query Complexity"**
- Source: `data_streams_rfc.md` § "Querying Across Both Tiers"
- Layout: two-column
- Left column: CodeBlock (pseudocode) showing the waterfall get-by-id pattern (check state index → fall back to history)
- Right column: BulletList of complexity introduced:
  - Every read queries two tiers with dedup
  - Search spans both tiers with field collapsing
  - Pagination totals inflated during overlap window
  - Get-by-id needs waterfall with fallback
- Key message: Two-tier queries add deduplication logic and edge cases to every read path.

**Slide 11 — "CQRS: Migration Overhead"**
- Source: `data_streams_rfc.md` § "Automated Migration"; `rollover_index_rfc.md` § "Why not data streams (CQRS)"
- Layout: full-width with cards
- Three cards (info variant):
  1. **Scheduled Task** — Task Manager task must periodically reindex terminal executions, then clean up after a safety gap
  2. **Additional Infrastructure** — two data streams + state index + migration task = increased operational surface
  3. **Tuning Required** — migration/cleanup thresholds must be balanced; overlap windows between migration and cleanup introduce transient inconsistencies
- Key message: CQRS introduces a background migration process that must be monitored, configured, and debugged.

**Slide 12 — "Why We Moved Past CQRS"**
- Source: `rollover_index_rfc.md` § "Why not data streams (CQRS)"
- Layout: full-width SlideTable
- Table: comparison of CQRS concerns vs. what rollover aliases eliminate

| Concern | CQRS Approach | Rollover Aliases |
|---------|---------------|------------------|
| Query complexity | Two-tier with dedup | Single alias, fan-out |
| Migration task | Required (reindex + cleanup) | Not needed |
| Dedup logic | Field collapsing, waterfall | None |
| Mutability | Only in state index | All backing indexes |
| Infrastructure | 3+ components | ILM policy + alias |

- Key message: Rollover aliases solve the same problems with less operational overhead and no migration machinery.

---

### Chapter 3: The Chosen Approach — Rollover Indexes with ILM

**Slide 13 — Chapter title:** "Rollover Indexes with ILM"
- Subtitle: "Full mutability, automatic lifecycle, zero migration tasks"

**Slide 14 — "Nothing Changes in the Execution Flow"**
- Layout: full-width with BulletList
- Content: Reassure the audience that the core execution logic stays the same:
  - Still upsert documents when steps transition state
  - Same workflow/step index approaches (separate indexes for workflows and steps)
  - The change is only in how indexes are managed underneath — ILM + rollover aliases instead of flat indexes
- Key message: The execution engine's write patterns are unchanged; only the index infrastructure evolves.

**Slide 15 — "How Rollover Aliases Work"**
- Source: `rollover_index_rfc.md` § "Rollover Alias Architecture"
- Layout: full-width with a diagram (coded in JSX: boxes for backing indexes behind an alias, arrow showing ILM rollover)
- Show: alias `.workflows-executions` → backing indexes `-000001` (old, warm phase), `-000002` (old, hot phase), `-000003` (write index). ILM rolls over based on `max_age`.
- Below diagram: note that besides the 1d time-based rollover, we could also add a `max_docs` threshold. Performance tests needed to confirm if it's necessary. Rough estimate: ~30 backing indexes per month.
- Key message: An alias points to a series of numbered backing indexes; ILM automatically creates new ones on a configurable cadence.

**Slide 16 — "Pin Executions to Backing Indexes"**
- Source: `rollover_index_rfc.md` § "Per-Execution Index Pinning"
- Layout: two-column
- Left column: FlowDiagram showing workflow start → resolve write index → store pinned index on execution doc → all subsequent writes target pinned index
- Right column: BulletList:
  - Write index resolved once when execution begins
  - All documents for one execution live in the same backing index
  - Even if ILM rolls over mid-execution, updates continue targeting the pinned index
  - Race-free: resolved from alias metadata
- Key message: Pinning ensures an execution's documents never split across backing indexes, even during rollover.

**Slide 17 — "Encoded Execution IDs"**
- Source: `rollover_index_rfc.md` § "Encoded Execution IDs"
- Layout: two-column
- Left column: CodeBlock showing encoding example:
  ```
  indexSuffix: "000003"
  uuid: "a1b2c3d4e5f6..."
  decoded: "000003_a1b2c3d4e5f6..."
  encoded: base64url → "MDAwMDAzX2ExYj..."
  ```
- Right column: BulletList:
  - Workflow ID: `{indexSuffix}_{uuidHex}` (optionally base64url-encoded)
  - Step ID: `{indexSuffix}_{sha256(executionId_scopePath_stepId)}` (optionally base64url-encoded)
  - Any caller can decode/parse the ID to resolve the backing index
  - Enables O(1) direct GET without alias fan-out
  - Base64 encoding is optional — makes IDs look like opaque tokens, but we may stick with raw composed IDs for debuggability
- Key message: Execution IDs encode the backing index suffix, enabling direct document lookups without searching. Base64 is optional — raw IDs are also an option.

**Slide 18 — "Retrieve Documents During Execution"**
- Source: `rollover_index_rfc.md` § "Dual-Mode Read/Write Pattern", § "Read Performance Characteristics"
- Layout: two-column
- Left column: heading "Writes" with BulletList:
  - New executions → write to alias (routes to write index)
  - Existing executions → write to pinned backing index
- Right column: heading "Reads" with BulletList:
  - Get by ID → decode ID, direct GET on specific backing index (O(1), not subject to refresh interval)
  - Get step executions → `mget` on pinned index using `stepExecutionIds` manifest
  - All step docs live in same backing index due to pinning
- Key message: The execution engine reads and writes directly to pinned backing indexes — no search queries on the hot path.

**Slide 19 — "Retrieve Documents via UI"**
- Source: `rollover_index_rfc.md` § "Dual-Mode Read/Write Pattern" (search), § "Read Performance Characteristics"
- Layout: two-column
- Left column: heading "Get by ID (UI polling)" with BulletList:
  - Decode encoded ID → extract backing index suffix
  - Direct `esClient.mget()` on specific backing index
  - O(1), real-time, no refresh interval dependency
- Right column: heading "Search (execution history)" with BulletList:
  - Query the alias → fans out across all backing indexes
  - Transparent: no application-level coordination
  - Later-phase indexes (cold) may have higher read latency
- Key message: UI polling uses direct GET for speed; history browsing uses alias fan-out for completeness.

**Slide 20 — "ILM Lifecycle Phases"**
- Source: `rollover_index_rfc.md` § "Tiered Lifecycle Progression", § "ILM Policy"
- Layout: SlideTable
- Table:

| Phase | Contents | Access Pattern | Actions |
|-------|----------|----------------|---------|
| Hot | Active writes, recent executions | Frequent reads/writes | Rollover (`max_age: 1d`) |
| Warm | Rolled-over, settling | Read-only, moderate | Forcemerge + Shrink |
| Cold | Aged executions | Infrequent reads | — |
| Delete | Past retention (~30d) | Removed | Delete |

- Below table: notes
  - ILM fully controls all phase transitions — no application-driven task needed
  - Workflow and step executions share the same ILM policy and progression
  - Long-running executions spanning beyond the hot phase are fine — hot/warm/cold all accept updates when you write to a specific backing index by name
  - In the future, users may configure how long executions stay in the cold phase. Hot/warm phases are controlled by us.
- Key message: ILM manages the full lifecycle automatically — no custom tasks, no `delete_by_query`.

**Slide 21 — "Migration from Flat Indexes"**
- Layout: full-width with FlowDiagram + BulletList
- FlowDiagram: `.workflows-executions` (flat) → Reindex → Rollover alias. Same for `.workflows-step-executions`.
- BulletList:
  - Reindex from current flat indexes into the new rollover aliases
  - Done for both workflow executions and step executions
  - After reindex, rename flat indexes to `-legacy` (not delete) for rollback safety
  - Straightforward one-time migration on upgrade
- Key message: Migration is simple — reindex from flat indexes to rollover aliases. Old indexes renamed, not deleted.

**Slide 22 — "Benefits"**
- Source: `rollover_index_rfc.md` § Benefits
- Layout: full-width with cards
- Five cards (success variant):
  1. **Bounded hot-phase indexes** — hot tier stays small and fast
  2. **ILM-managed lifecycle** — no `delete_by_query`, no tombstones, no segment merges
  3. **Preserved mutability** — `update`, `mget`, `doc_as_upsert` all work
  4. **O(1) lookups** — encoded IDs enable direct GET without alias fan-out
  5. **Transparent search** — alias handles fan-out automatically
- Key message: Rollover aliases give us bounded indexes, automatic lifecycle, and full mutability — with less complexity than CQRS.

**Slide 23 — "CQRS vs Rollover: Side-by-Side Comparison"**
- Layout: full-width SlideTable
- Table comparing execution paths, infrastructure, and trade-offs:

| Aspect | CQRS (Tiered Storage) | Rollover Indexes with ILM |
|--------|----------------------|---------------------------|
| Write path | Upserts to mutable state index | Upserts to pinned backing index |
| Get by ID (execution) | Waterfall: state index → fall back to history | O(1) direct GET via encoded ID |
| Get steps (execution) | mget on state index → fall back to search history | mget on pinned backing index |
| Search (UI) | Multi-index with field collapsing for dedup | Single alias fan-out, no dedup needed |
| Lifecycle mgmt | Scheduled migration task + cleanup | ILM fully automatic |
| Data duplication | Overlap window: same doc in both tiers | None |
| Infrastructure | State index + 2 data streams + migration task | Alias + backing indexes + ILM policy |
| Mutability | State index only; data streams are append-only | All backing indexes support updates |
| Complexity | Higher: two-tier queries, dedup, migration tuning | Lower: single alias, encoded IDs |

- Key message: Rollover indexes match CQRS on every execution path while eliminating the migration task, dedup logic, and two-tier query complexity. The key benefit: no reindexes — data is already in the right place once ingested.

**Slide 24 — "Open Questions"**
- Source: `rollover_index_rfc.md` § "Risks and Open Questions"
- Layout: full-width BulletList
- Questions:
  1. Tuning `rolloverMaxAge` (default 1d) — does the team have data on execution volume to inform this?
  2. Cold-phase retention — should we expose a user-configurable setting for how long executions stay in cold before deletion?
  3. Encoded IDs are not human-readable — impact on debugging and external integrations?
  4. Is the proposed ILM policy acceptable for the product? To be confirmed with Tinsae Erkailo.
  5. Validate the overall rollover index approach with someone having deeper ES index expertise — Brandon Kobel or Yuliia Naumenko.
- Key message: The core design is validated; these are the decisions we need the team's input on.

---

### Slide 25 — Discussion
- "Let's discuss."
- Subtitle: "Questions, concerns, and next steps"
