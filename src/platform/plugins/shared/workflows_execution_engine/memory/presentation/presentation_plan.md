# HTML Presentation: CQRS + DataStream — From Flat Indexes to Tiered Execution Storage

## Tone

The presentation tone is **technical and problem-driven**: "Here's our problem, here's why the obvious solutions don't work, and here's what we're building."
- Problem slides: "The current design has concrete scaling limits"
- Rejected alternatives: "We evaluated these — here's why they break"
- Solution slides: "CQRS + tiered storage gives us the properties we need"
- Trade-offs: "This adds complexity in specific, manageable places"

## Approach

Multi-file React + Vite structure at `src/platform/plugins/shared/workflows_execution_engine/memory/presentation/`.
Each slide is a React component composing shared layout components (TitleSlide, ContentSlide, TwoColumns, CodeBlock, FlowDiagram, Card, SlideTable, BulletList, Badge).

**Design system:** Elastic brand colors, Inter font, light theme. Blue title slides, white content slides.

## Source material

All content derived from:
- `rfc_execution_history_hot_cold_storage.md`
- Slack context about uniqueness of workflow engine among Kibana plugins

## Slide Structure

### Slide 1: Title slide
- "CQRS + DataStream"
- Subtitle: "From Flat Indexes to Tiered Execution Storage"
- Meta: "Workflows Execution Engine · Kibana Platform"

### Slide 2: Agenda
1. Why We're Unique
2. The Problem
3. Why Obvious Solutions Fail
4. CQRS + Tiered Storage
5. How It Works
6. Trade-offs

---

### Chapter 1: Why We're Unique

**Slide 3 — Chapter Title:** "Why We're Unique"
- Subtitle: "No other Kibana plugin has this problem"

**Slide 4: "Four Properties No Other Plugin Combines"**
- Source: RFC "Generalization" section + Slack context
- Layout: two-column (left: properties table, right: comparison card)
- Left: table showing the 4 properties (mutable state, long-running execution, high volume, persistent history) and which Kibana systems have which subset:
  - Task Manager: mutable + long-running, but deletes completed tasks (no history)
  - Event Log / Alerting: high volume + history, but writes to data streams from birth (no mutability)
  - Workflow Engine: all four simultaneously
- Right: Card summarizing "Closest external analogies: Temporal.io, AWS Step Functions"
- Key message: The workflow engine is the only Kibana entity needing mutable state AND append-only history at scale.

---

### Chapter 2: The Problem

**Slide 5 — Chapter Title:** "The Problem"
- Subtitle: "What happens when one index does everything"

**Slide 6: "Single Index, All the Pain"**
- Source: RFC Motivation section
- Layout: two-column (left: diagram, right: bullets)
- Left: FlowDiagram showing `.workflows-executions` and `.workflows-step-executions` as single flat indexes receiving all reads AND writes
- Right: BulletList of 4 problems:
  - Unbounded index growth
  - Query performance degrades over time
  - No lifecycle management
  - Conflicting access patterns (mutable vs. immutable)
- Key message: Mixing active and historical execution data in one index creates scaling and operational problems.

**Slide 7: "Conflicting Access Patterns"**
- Source: RFC Motivation + Why Not sections
- Layout: table
- SlideTable contrasting the two access patterns:
  - Active executions: fast reads, updates, deletes, mget, concurrency checks
  - Historical executions: write-once, search, reporting, auditing
- Key message: Active and historical data have fundamentally different storage requirements.

---

### Chapter 3: Why Obvious Solutions Fail

**Slide 8 — Chapter Title:** "Why Obvious Solutions Fail"
- Subtitle: "Data streams only? Event sourcing?"

**Slide 9: "Why Not Data Streams for Everything?"**
- Source: RFC "Why not data streams" section
- Layout: two-column (left: constraints card, right: bullets)
- Left: Card (warn variant) listing data stream constraints: append-only, no updates, no deletes by ID, no mget
- Right: BulletList explaining why the execution engine needs these:
  - Steps change status multiple times (pending → running → completed)
  - `mget` loads full execution tree in O(1), not subject to refresh interval
  - Without mget: search queries = stale state risk during rapid transitions
- Key message: Data streams can't serve mutable runtime state — they break correctness, not just performance.

**Slide 10: "Why Not Event Sourcing?"**
- Source: RFC "Why not event sourcing" section
- Layout: full-width BulletList
- Content:
  - Unbounded events per execution (foreach, retry, sub-workflows emit many transitions)
  - Consumers need materialized objects, not event streams (UI, APIs, pagination)
  - Replaying event log on every read is not viable at execution engine frequency
- Key message: Event sourcing trades simplicity at write-time for complexity at read-time — the wrong trade for a high-frequency execution loop.

---

### Chapter 4: The Solution — CQRS + Tiered Storage

**Slide 11 — Chapter Title:** "CQRS + Tiered Storage"
- Subtitle: "Command side for state, query side for history"

**Slide 12: "Two-Tier Architecture Overview"**
- Source: RFC Design section, tiered storage model
- Layout: full-width FlowDiagram
- FlowDiagram showing:
  - Execution State (regular ES index) → Scheduled Migration → Execution History (data streams)
- Below: two Cards side-by-side:
  - Left card (info): "Execution State" — mutable, mget, updates, deletes, active executions
  - Right card (success): "Execution History" — append-only, data streams, ILM, search, reporting
- Key message: CQRS separates the "command" side (fast mutable state) from the "query" side (scalable history).

**Slide 13: "Unified Execution State Index"**
- Source: RFC "Unified Execution State" + "Why a Single Index" sections
- Layout: two-column (left: bullets, right: info card)
- Left: BulletList of benefits:
  - Workflows & steps in one index (same lifecycle, same fields)
  - Single `bulkUpsert` for all state flushes
  - Single `deleteByQuery` for cleanup
  - All reads via `mget` with known IDs — no search needed
- Right: Card showing the deterministic ID scheme summary (workflow = UUID, step = SHA-256 hash of execution+scope+stepId)
- Key message: A single index with deterministic IDs enables O(1) state loading via mget.

**Slide 14: "How mget Eliminates Search"**
- Source: RFC "Deterministic ID Scheme" + "UI polling" sections
- Layout: full-width FlowDiagram
- FlowDiagram showing two access patterns:
  1. Execution resume: mget(workflowId + stepExecutionIds) → full state in 1 call
  2. UI polling: mget(workflowId) → get stepExecutionIds → mget(stepIds) → 2 calls total
- Key message: Known IDs + mget = O(1) state loading, immune to refresh interval lag.

---

### Chapter 5: How It Works

**Slide 15 — Chapter Title:** "How It Works"
- Subtitle: "Querying, migration, and failure recovery"

**Slide 16: "Execution Path — Engine Reads & Writes"**
- Source: RFC "Unified Execution State" + "Deterministic ID Scheme" sections
- Layout: two-column (left: FlowDiagram, right: bullets)
- Left: FlowDiagram showing execution loop cycle: Read state (mget) → Run step → Flush state (bulkUpsert) → repeat
- Right: BulletList:
  - All reads/writes target execution state index only — no data streams involved
  - Resume: mget(workflowId + stepExecutionIds) → full state in 1 call
  - Flush: bulkUpsert writes workflow + all step updates in a single bulk call
  - Concurrency checks & cancellation polling: query execution state index only
  - Zero dependency on refresh interval — mget always returns latest version
- Key message: The execution engine never touches data streams — it operates entirely on the mutable state index.

**Slide 17: "UI Path — Reading Across Both Tiers"**
- Source: RFC "Querying Across Both Tiers" section
- Layout: full-width with 3 query patterns as compact Cards
- Three patterns:
  1. Get workflow by ID: waterfall — mget from state index first, fallback to history data stream search (only if already migrated)
  2. Get steps for a workflow: fan-out — mget workflow → read stepExecutionIds manifest → mget all steps; fallback to history search
  3. Search/list executions: parallel multi-index search spanning state index + history data stream, with `collapse` dedup to handle overlap window
- Key message: UI queries transparently span both tiers; active executions are always served from the fast state index.

**Slide 18: "Automated Migration & Cleanup"**
- Source: RFC "Automated Migration" section
- Layout: two-column (left: FlowDiagram of the lifecycle, right: bullets)
- Left: FlowDiagram showing timeline: 0 → 1×interval (migrate) → 2×interval (cleanup)
- Right: BulletList:
  - Single Task Manager task (daily by default)
  - Reindex terminal executions older than 1× interval
  - Cleanup from state index after 2× interval
  - Idempotent: `op_type: create` + `conflicts: proceed`
  - Only deletes when ALL docs in a workflow run are terminal
- Key message: The 2x multiplier between migrate and cleanup is a hardcoded safety invariant.

**Slide 19: "Failure Recovery & Safety"**
- Source: RFC "Failure Recovery" + "Multi-Node Safety" sections
- Layout: full-width BulletList
- Content:
  - Reindex is idempotent — re-running skips already-migrated docs
  - Cleanup is independent — won't delete un-migrated data (2x threshold gap)
  - No transactional coupling — partial failure leaves consistent state
  - Task Manager guarantees single-node execution across cluster
  - Space isolation preserved through all operations
- Key message: Every operation is idempotent and safe to retry.

---

### Chapter 6: Trade-offs

**Slide 20 — Chapter Title:** "Benefits & Trade-offs"
- Subtitle: "What we gain, what we pay"

**Slide 21: "Benefits vs. Trade-offs"**
- Source: RFC "Benefits and Trade-offs" section
- Layout: two-column (left: benefits, right: trade-offs)
- Left (benefits — success Cards or green-tinted list):
  - Bounded execution state index
  - O(1) state loading via mget
  - Automatic ILM for history
  - Unified type model
  - Idempotent, safe migration
  - Configurable retention
- Right (trade-offs — warn Cards or orange-tinted list):
  - Increased query complexity (two-tier reads)
  - Eventual consistency for history (default 1-day delay)
  - More operational surface (2 data streams + task + index)
  - Mapping discipline required (dynamic: false)
  - Temporary storage duplication during overlap window
- Key message: The complexity is bounded and well-understood; the scaling benefits are fundamental.

---

### Slide 22: Discussion
- "Let's discuss."
- Subtitle: "Questions, concerns, alternative ideas?"
