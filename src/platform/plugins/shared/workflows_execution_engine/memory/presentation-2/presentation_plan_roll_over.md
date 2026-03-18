# HTML Presentation: Rolled-Over Execution Indexes with ILM — Deep Dive

## Tone

The presentation tone is **technical and explanatory**: "Here's exactly how rollover indexes work and why every design choice was made."
- Motivation slides: brief reminder of the problem (audience already knows the alternatives were rejected)
- Architecture slides: visual, step-by-step walkthrough of the rollover alias machinery, index pinning, and encoded IDs
- Read/write pattern slides: concrete pseudocode and flow diagrams showing every execution path
- Lifecycle slides: ILM phases and how execution data ages
- Closing: open questions and discussion

## Approach

Multi-file React + Vite structure at `./presentation-2/`.
Each slide is a React component composing shared layout components (TitleSlide, ContentSlide, TwoColumns, CodeBlock, FlowDiagram, Card, SlideTable, BulletList, Badge).

**Design system:** Elastic brand colors, Inter font, light theme. Blue title slides, white content slides.

## Source material

All content derived from:
- `presentation_plan.md` — the existing two-option presentation (context for motivation and comparison slides)
- `rollover_index_rfc.md` — the full RFC for the rollover index approach

## Slide Structure

### Slide 1 — Title slide
- "Rolled-Over Execution Indexes with ILM"
- Subtitle: "A deep dive into the chosen architecture for workflow execution state"
- Meta: "Workflows Execution Engine · Platform"

### Slide 2 — Agenda
- Why we need to change (brief recap)
- Rollover indexes with ILM: architecture, pinning, encoded IDs
- Read/write patterns
- ILM lifecycle management
- Open questions & discussion

---

### Chapter 1: The Problem (Recap)

**Slide 3 — Chapter title:** "Why We Need to Change"
- Subtitle: "A brief recap of the problem"

**Slide 4 — "Current State: Two Flat Indexes"**
- Source: `rollover_index_rfc.md` § Motivation
- Layout: two-column
- Left column: simple diagram showing `.workflows-executions` and `.workflows-step-executions` as two flat indexes — all active and historical data mixed together
- Right column: BulletList of problems:
  - Unbounded growth — indexes grow indefinitely
  - No lifecycle management — no ILM, no rollover
  - Degrading queries — active queries slow as history accumulates
  - Only cleanup: `delete_by_query` — creates tombstones and triggers expensive segment merges
- Key message: Flat indexes with no lifecycle management are a ticking time bomb at scale.

---

### Chapter 2: Rollover Indexes with ILM

**Slide 5 — Chapter title:** "Rollover Indexes with ILM"
- Subtitle: "Full mutability, automatic lifecycle, zero migration tasks"

**Slide 6 — "Nothing Changes in the Execution Flow"**
- Source: `rollover_index_rfc.md` § "The chosen approach"
- Layout: full-width with BulletList
- Content: Reassure the audience that the core execution logic stays the same:
  - Still upsert documents when steps transition state
  - Same workflow/step index approaches (separate indexes for workflows and steps)
  - The change is only in how indexes are managed underneath — ILM + rollover aliases instead of flat indexes
- Key message: The execution engine's write patterns are unchanged; only the index infrastructure evolves.

**Slide 7 — "How Rollover Aliases Work"**
- Source: `rollover_index_rfc.md` § "Rollover Alias Architecture"
- Layout: full-width with a diagram (coded in JSX: boxes for backing indexes behind an alias, arrow showing ILM rollover)
- Show: alias `.workflows-executions` → backing indexes `-000001` (old, warm phase), `-000002` (old, hot phase), `-000003` (write index). ILM rolls over based on `max_age`.
- Below diagram: note that besides the 1d time-based rollover, we could also add a `max_docs` threshold. Performance tests needed to confirm if it's necessary. Rough estimate: ~30 backing indexes per month.
- Key message: An alias points to a series of numbered backing indexes; ILM automatically creates new ones on a configurable cadence.

**Slide 8 — "Pin Executions to Backing Indexes"**
- Source: `rollover_index_rfc.md` § "Per-Execution Index Pinning"
- Layout: two-column
- Left column: FlowDiagram showing workflow start → resolve write index → store pinned index on execution doc → all subsequent writes target pinned index
- Right column: BulletList:
  - Write index resolved once when execution begins
  - All documents for one execution live in the same backing index
  - Even if ILM rolls over mid-execution, updates continue targeting the pinned index
  - Race-free: resolved from alias metadata
- Key message: Pinning ensures an execution's documents never split across backing indexes, even during rollover.

**Slide 9 — "Encoded Execution IDs"**
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

---

### Chapter 3: Read/Write Patterns

**Slide 10 — Chapter title:** "Read/Write Patterns"
- Subtitle: "How the execution engine reads and writes data"

**Slide 11 — "Retrieve Documents During Execution"**
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

**Slide 12 — "Retrieve Documents via UI"**
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

---

### Chapter 4: ILM Lifecycle Management

**Slide 13 — Chapter title:** "ILM Lifecycle Management"
- Subtitle: "How execution data ages through lifecycle phases"

**Slide 14 — "ILM Lifecycle Phases"**
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
  - **Note:** The specific phases, thresholds, and actions shown here are a **raw assumption** — a reasonable starting point, not a final decision. The actual ILM policy (which phases to use, retention periods, actions per phase) will be decided later by the product team.
  - ILM fully controls all phase transitions — no application-driven task needed
  - Workflow and step executions share the same ILM policy and progression
  - Long-running executions spanning beyond the hot phase are fine — hot/warm/cold all accept updates when you write to a specific backing index by name
  - In the future, users may configure how long executions stay in the cold phase. Hot/warm phases are controlled by us.
- Key message: ILM manages the full lifecycle automatically — no custom tasks, no `delete_by_query`. Exact policy details are subject to product decisions.

---

### Chapter 5: Open Questions

**Slide 15 — Chapter title:** "Open Questions"
- Subtitle: "What's still open for the team"

**Slide 16 — "Open Questions"**
- Source: `rollover_index_rfc.md` § "Risks and Open Questions"
- Layout: full-width BulletList
- Questions:
  1. **Rollover frequency** — is `1d` the right default? Do we have execution volume data to inform this?
  2. **Retention thresholds** — should we expose user-configurable retention settings? What defaults?
  3. **Encoded ID debuggability** — base64 vs. raw composed IDs? Impact on external integrations?
  4. **Stuck execution detection** — how do we handle executions that hold backing indexes hot indefinitely?
  5. **ILM policy details** — phases, thresholds, and actions are raw assumptions; to be finalized with product
- Key message: The core design is validated in the POC; these are the decisions remaining.

---

### Slide 17 — Discussion
- "Let's discuss."
- Subtitle: "Questions, concerns, and next steps"
