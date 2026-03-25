# Alert Investigation Pipeline — PR Relationship Analysis

## PRs Analyzed

| PR | Title | Author | Status |
|---|---|---|---|
| [#257957](https://github.com/elastic/kibana/pull/257957) | Alert Investigation Pipeline (Workflows + Skills) | patrykkopycinski | Open |
| [#258979](https://github.com/elastic/kibana/pull/258979) | LLM-Powered Alert Investigation — Autonomous Multi-Agent System | patrykkopycinski | Open |
| [#259159](https://github.com/elastic/kibana/pull/259159) | Alert Triage: `buildAlertEntityGraph` + `renderAlertNarrative` | KDKHD | Open |
| [#253245](https://github.com/elastic/kibana/pull/253245) | AI Alert FP Triage Steps + Workflow | KDKHD | Open |

---

## TL;DR

> **#257957 and #258979 are complementary layers of the same system** — deterministic backbone + LLM agents. Both have 5 file overlaps (integration points) that need coordination.
> **#259159 and #253245 have zero overlap** with either of our PRs — they're independent workflow steps that compose into our pipeline.
> All four PRs can ship independently. The integration story is: our pipeline orchestrates, KDKHD's steps enrich, #258979's agents reason.

---

## What Each PR Does

**#257957 (ours — deterministic backbone)**
- 6 Elastic Workflow steps (fetch, dedup, extract, match, AD, tag)
- 4 Agent Builder tools + 1 skill (interactive mode)
- Batch-oriented: processes up to 500 alerts per run
- Lives in `elastic_assistant` + `security_solution/agent_builder/`
- LLM usage: minimal (ELSER dedup, optional AD)

**#258979 (ours — LLM agents)**
- 5-agent autonomous investigation system (triage, MITRE, CTI, investigation, remediation)
- LangGraph multi-agent orchestration
- Single-alert deep investigation (<1 min per alert)
- Lives in `elastic_assistant/server/lib/alert_investigation/agents/` + `graphs/`
- LLM usage: heavy (5 dedicated agents per alert)
- 17.5K lines, 59 files, extensive documentation (19 doc files)

**#259159 (KDKHD — workflow steps)**
- `security.buildAlertEntityGraph` — BFS traversal from seed alert, finds related alerts via shared entities with configurable scoring
- `security.renderAlertNarrative` — Generates human-readable alert summary (Timeline-like)
- Lives in `security_solution/server/workflows/step_types/`

**#253245 (KDKHD — workflow + steps)**
- Everything in #259159, plus:
- `security.alert.validation` preinstalled YAML workflow
- Workflow registry + bootstrap system in `security_solution/server/lib/workflows/`

---

## File Overlap Matrix

|  | #257957 | #258979 | #259159 | #253245 |
|---|---|---|---|---|
| **#257957** | — | **5 files** | 0 files | 0 files |
| **#258979** | **5 files** | — | 0 files | 0 files |
| **#259159** | 0 files | 0 files | — | ~60 files (subset) |
| **#253245** | 0 files | 0 files | ~60 files | — |

### #257957 ↔ #258979: 5 overlapping files (integration points)

```
elastic_assistant/kibana.jsonc              ← plugin config
elastic_assistant/server/lib/alert_investigation/index.ts  ← module barrel
elastic_assistant/server/plugin.ts          ← plugin setup
elastic_assistant/server/routes/register_routes.ts  ← route registration
elastic_assistant/server/types.ts           ← type definitions
```

These are **integration points**, not conflicting logic. Both PRs modify the same plugin entry points to wire in their respective capabilities. Merging both requires coordinating these 5 files.

### #259159 ↔ #253245: ~60 shared files

#253245 is a **superset** of #259159 — it includes the same workflow steps plus the preinstalled workflow system. Only one should merge.

---

## Architecture: How All Four PRs Relate

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE ALERT INVESTIGATION SYSTEM           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  #258979: AGENTIC INTELLIGENCE LAYER                      │   │
│  │  5 LLM agents (triage, MITRE, CTI, investigate, remediate)│   │
│  │  LangGraph orchestration, hypothesis testing              │   │
│  │  Single-alert deep investigation (<1 min)                 │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  #257957: DETERMINISTIC BACKBONE                          │   │
│  │  6 Elastic Workflow steps + 4 Agent Builder tools         │   │
│  │  Batch processing (500 alerts → cases → AD)               │   │
│  │  Fast, predictable, zero LLM cost for stages 1-4         │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  #259159/#253245: ENRICHMENT STEPS                        │   │
│  │  security.buildAlertEntityGraph (BFS entity correlation)  │   │
│  │  security.renderAlertNarrative (human-readable summary)   │   │
│  │  Per-alert deep enrichment before LLM reasoning           │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │  DATA LAYER                                               │   │
│  │  Elasticsearch alerts, Cases, Entity Store, ELSER         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Comparison: #257957 vs #258979

| Aspect | #257957 (backbone) | #258979 (agents) |
|---|---|---|
| **Processing model** | Batch (500 alerts/run) | Per-alert (<1 min each) |
| **LLM usage** | Minimal (ELSER dedup, optional AD) | Heavy (5 agents × ~36K tokens) |
| **Cost at scale (300K/mo)** | ~$150/mo (ELSER only) | ~$2,700/mo (5 LLM agents) |
| **Orchestration** | Elastic Workflows | LangGraph |
| **Entity handling** | Static ECS mapping (30 fields) | LLM-powered extraction |
| **Case matching** | Weighted entity overlap | Not covered |
| **Deduplication** | Jaccard + ELSER | Not covered |
| **MITRE mapping** | Not covered | Dedicated LLM agent |
| **CTI enrichment** | Not covered | Dedicated LLM agent |
| **Remediation** | Not covered | Dedicated LLM agent |
| **Autonomy level** | Fully autonomous (scheduled) | Triggered per alert |
| **Can work without LLM?** | Yes (graceful degradation) | No (LLM is the core) |
| **Agent Builder skills** | Yes (4 tools + 1 skill) | No |
| **Documentation** | Minimal (no docs committed) | Extensive (19 doc files) |

### Key Insight

**#257957 handles the 80% case** (batch triage, dedup, routing) at near-zero LLM cost.
**#258979 handles the 20% case** (deep investigation of high-priority alerts) with full LLM reasoning.

Together they form a **cost-efficient funnel**:
```
500 alerts → #257957 pipeline (fast, cheap)
    → 50 unique high-priority alerts → #258979 agents (deep, reasoning)
        → 50 fully investigated cases with MITRE mapping + remediation
```

---

## Detailed Comparison: #257957 vs #259159/#253245

| Aspect | #257957 (ours) | #259159/#253245 (KDKHD) |
|---|---|---|
| **Entity extraction** | Flat ECS mapping (30 fields → 13 types) | BFS graph with configurable scoring |
| **Related alert discovery** | Not covered | Core capability (graph traversal) |
| **Alert narrative** | Not covered | `renderAlertNarrative` (human-readable) |
| **Workflow definition** | TypeScript object | YAML preinstalled workflow |
| **Step registration** | `elastic_assistant` plugin | `security_solution` plugin |
| **Focus** | Batch pipeline orchestration | Per-alert deep enrichment |

### Composition Opportunity

Their steps plug directly into our pipeline as enrichment:

```yaml
# Our pipeline workflow, enhanced with KDKHD's steps
steps:
  - type: security.fetchUnprocessedAlerts     # Ours
  - type: security.deduplicateAlerts          # Ours
  - type: security.extractEntities            # Ours (fast, flat)
  - type: security.matchAndAttachAlertsToCases # Ours
  # --- KDKHD's enrichment steps for high-priority alerts ---
  - type: security.buildAlertEntityGraph      # KDKHD (deep, graph-based)
  - type: security.renderAlertNarrative       # KDKHD (human-readable story)
  # --- Back to ours ---
  - type: security.triggerIncrementalAd       # Ours (now with richer context)
  - type: security.tagProcessedAlerts         # Ours
```

---

## #258979 — Assuming Refactored to Agent Builder

If #258979 drops LangGraph and registers its 5 agents as Agent Builder skills + `ai.agent` workflow steps, the entire picture simplifies dramatically:

### What changes

| Aspect | Before (LangGraph) | After (Agent Builder) |
|---|---|---|
| **Orchestration** | Custom LangGraph graph | Elastic Workflows with `ai.agent` steps |
| **Agent registration** | Custom code in `graphs/investigation_graph/` | `agentBuilder.skills.register()` |
| **Interactive use** | Not available | Analysts can invoke agents via AI Assistant |
| **Workflow composition** | Separate system, can't compose with #257957 | Native workflow steps, composable with everything |
| **External dependency** | LangGraph npm package | Zero (Elastic-native) |
| **File overlap with #257957** | 5 files (integration points) | **Potentially zero** — agents register in `security_solution/agent_builder/` alongside our tools |

### Refactored architecture — All four PRs as one system

```
┌──────────────────────────────────────────────────────────────────────┐
│                    UNIFIED ALERT INVESTIGATION SYSTEM                  │
│                    (all Elastic-native, all composable)                │
│                                                                        │
│  AGENT BUILDER SKILLS (interactive, analyst-driven)                    │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ #257957 tools:              #258979 skills (refactored):         │ │
│  │  security.alert_dedup        security.triage_agent               │ │
│  │  security.entity_extraction  security.mitre_mapper_agent         │ │
│  │  security.case_matching      security.cti_enrichment_agent       │ │
│  │  security.run_pipeline       security.investigation_agent        │ │
│  │                              security.remediation_agent          │ │
│  │                                                                  │ │
│  │ #257957 skill:              #258979 skill (refactored):          │ │
│  │  alert-investigation         deep-alert-investigation            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ELASTIC WORKFLOWS (autonomous, scheduled/event-driven)                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ #257957 steps:              #259159/#253245 steps:               │ │
│  │  security.fetchAlerts        security.buildAlertEntityGraph      │ │
│  │  security.deduplicateAlerts  security.renderAlertNarrative       │ │
│  │  security.extractEntities                                       │ │
│  │  security.matchToCases      #258979 steps (refactored):         │ │
│  │  security.triggerAD          ai.agent (triage)                   │ │
│  │  security.tagProcessed       ai.agent (MITRE mapper)            │ │
│  │                              ai.agent (CTI enrichment)          │ │
│  │                              ai.agent (investigation)           │ │
│  │                              ai.agent (remediation)             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  DATA LAYER                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Elasticsearch alerts, Cases, Entity Store, ELSER, Threat Intel  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### The composable workflow — all steps in one pipeline

```yaml
# Complete Alert Investigation Workflow (all 4 PRs composed)
steps:
  # --- #257957: Batch processing backbone ---
  - type: security.fetchUnprocessedAlerts
  - type: security.deduplicateAlerts
  - type: security.extractEntities

  # --- #259159/#253245: Deep enrichment ---
  - type: security.buildAlertEntityGraph      # BFS entity correlation
  - type: security.renderAlertNarrative       # Human-readable summary

  # --- #257957: Case routing ---
  - type: security.matchAndAttachAlertsToCases

  # --- #258979 (refactored): LLM reasoning on high-priority cases ---
  - type: ai.agent                            # Triage agent
    with: { skill: security.triage_agent }
  - type: ai.agent                            # MITRE mapping
    with: { skill: security.mitre_mapper_agent }
  - type: ai.agent                            # CTI enrichment
    with: { skill: security.cti_enrichment_agent }
  - type: ai.agent                            # Deep investigation
    with: { skill: security.investigation_agent }
  - type: ai.agent                            # Remediation recommendations
    with: { skill: security.remediation_agent }

  # --- #257957: Finalize ---
  - type: security.triggerIncrementalAd
  - type: security.tagProcessedAlerts
```

### What this enables

**Cost-efficient funnel with native composition:**

```
500 alerts
  → #257957 deterministic pipeline (fast, $0)
    400 unique alerts matched to cases
      → #259159 enrichment (entity graph + narrative, $0)
        → #258979 ai.agent steps (LLM, only on high-priority)
          50 alerts get deep investigation ($2,700/mo)
            → MITRE mapped, CTI enriched, remediation recommended
```

**Both interactive AND autonomous from the same code:**

| Mode | How it works |
|---|---|
| **Analyst asks AI Assistant** | "Investigate alert X" → `alert-investigation` skill uses tools + agents |
| **Scheduled workflow** | Every 15 min → workflow runs all steps automatically |
| **Event-driven** | Alert created → workflow triggers (when available) |

### Merge conflicts after refactoring

| Pair | Current overlap | After #258979 refactored |
|---|---|---|
| #257957 ↔ #258979 | 5 files | **~1 file** (`register_skills.ts` — both add skills) |
| #257957 ↔ #259159 | 0 | 0 |
| #257957 ↔ #253245 | 0 | 0 |
| #258979 ↔ #259159 | 0 | 0 |
| #258979 ↔ #253245 | 0 | 0 |

The 5-file overlap drops to ~1 trivial conflict because:
- No more `graphs/investigation_graph/` directory (LangGraph removed)
- No more custom state management in `elastic_assistant`
- Agents register in `security_solution/agent_builder/skills/` (same as our tools)
- The `elastic_assistant` integration points (#258979 currently touches `plugin.ts`, `types.ts`, `routes/register_routes.ts`) are no longer needed

---

## Impact Summary

| Question | #257957 ↔ #258979 | #257957 ↔ #259159 | #257957 ↔ #253245 |
|---|---|---|---|
| File overlap (current) | **5 files** | 0 | 0 |
| File overlap (after refactor) | **~1 file** | 0 | 0 |
| Functional duplication | None (different layers) | Partial (entity extraction) | Partial (entity extraction) |
| Can compose? | **Yes — native workflow steps** | Yes (enrichment steps) | Yes (enrichment + preinstalled WF) |
| Should wait? | No (ship #257957 first) | No (independent) | No (independent) |

---

## Recommended Merge Order

1. **#257957 first** — Deterministic backbone, zero cross-team deps, 137 tests passing
2. **#259159 or #253245** — Enrichment steps (independent, zero overlap)
3. **#258979 (refactored)** — Agent Builder skills, composes on top of #257957

---

## Phase 2 Integration Roadmap

1. **Compose all steps into one workflow** — The YAML above becomes the "complete" alert investigation workflow
2. **Adopt preinstalled YAML pattern** — #253245's workflow registry for managing workflow definitions
3. **Cost-gate LLM agents** — Only invoke `ai.agent` steps for alerts with risk_score >= 70 or entity risk > threshold
4. **Use KDKHD's entity graph for case matching** — Replace flat entity overlap with scored BFS graph
5. **Feed narrative into agents** — `renderAlertNarrative` output becomes context for triage/investigation agents
6. **Unified Agent Builder skill catalog** — All tools and agents discoverable in one place via AI Assistant
