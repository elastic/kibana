# Alert Investigation Pipeline — 4 PR Relationship Analysis

## The Big Picture

We have 4 open PRs that together form a complete autonomous alert investigation system. They're four layers of the same architecture — each independently shippable, designed to stack:

```
Layer 4: #258979  — LLM REASONING (5 ai.agent steps: triage, MITRE, CTI, investigate, remediate)
Layer 3: #259159/#253245 — ENRICHMENT (entity graph + human-readable narrative)
Layer 2: #257957  — ORCHESTRATION (fetch → dedup → extract → match → case → tag)
Layer 1: DATA     — Elasticsearch alerts, Cases, Entity Store, ELSER
```

## What Each PR Does

**#257957** (patrykkopycinski) — _Deterministic backbone_
- 6 Elastic Workflow steps: batch pipeline processing 500 alerts/run
- 4 Agent Builder tools + 1 skill: interactive mode via AI Assistant
- ELSER semantic dedup with Jaccard fallback
- Entity Store risk scoring
- 137 tests, zero cross-team dependencies
- LLM cost: ~$0 (stages 1-4 are deterministic)

**#258979** (patrykkopycinski) — _LLM agents_ (needs refactoring → Agent Builder)
- 5-agent system: triage, MITRE mapper, CTI enrichment, investigation, remediation
- Currently uses LangGraph — should be refactored to Agent Builder + `ai.agent` workflow steps
- Deep investigation: <1 min per alert
- LLM cost: ~$2,700/mo at scale (only for high-priority alerts)

**#259159** (KDKHD) — _Enrichment workflow steps_
- `security.buildAlertEntityGraph` — BFS entity correlation from seed alert with configurable scoring
- `security.renderAlertNarrative` — human-readable alert summary (Timeline-like)

**#253245** (KDKHD) — _Same steps + preinstalled workflow_
- Everything in #259159 plus `security.alert.validation` preinstalled YAML workflow
- Introduces workflow registry + bootstrap pattern

## File Overlap

- #257957 ↔ #258979: **5 files** (plugin integration points) → drops to **~1 file** after #258979 refactored to Agent Builder
- #257957 ↔ #259159: **0 files**
- #257957 ↔ #253245: **0 files**
- #258979 ↔ #259159/#253245: **0 files**

## How They Compose (Cost-Efficient Funnel)

```
500 raw alerts
  → #257957 pipeline (fast, deterministic, $0)
    400 unique alerts matched to cases
      → #259159 enrichment (entity graph + narrative, $0)
        → filter: risk_score >= 70
          50 high-priority alerts
            → #258979 agents (deep LLM investigation, $2,700/mo)
              50 cases with MITRE mapping, CTI, remediation
```

## Key Properties

- **Each layer works alone** — remove any and the others still function
- **All Elastic-native** (after #258979 refactored) — Elastic Workflows + Agent Builder, no external deps
- **Same code serves both modes** — interactive (analyst asks AI Assistant) and autonomous (scheduled every 15 min)
- **Cost scales with complexity, not volume** — deterministic backbone handles 100% of alerts cheaply, LLM only touches ~10%

## Recommended Merge Order

1. **#257957 first** — backbone, ready now, zero cross-team deps
2. **#259159 or #253245** — enrichment steps, independent
3. **#258979 last** — refactor to Agent Builder, then composes on top

## Composed Workflow (all 4 PRs)

```yaml
steps:
  # #257957: Batch processing
  - type: security.fetchUnprocessedAlerts
  - type: security.deduplicateAlerts
  - type: security.extractEntities
  # #259159: Enrichment
  - type: security.buildAlertEntityGraph
  - type: security.renderAlertNarrative
  # #257957: Case routing
  - type: security.matchAndAttachAlertsToCases
  # #258979: LLM reasoning (high-priority only)
  - type: ai.agent { skill: security.triage_agent }
  - type: ai.agent { skill: security.mitre_mapper_agent }
  - type: ai.agent { skill: security.cti_enrichment_agent }
  - type: ai.agent { skill: security.investigation_agent }
  - type: ai.agent { skill: security.remediation_agent }
  # #257957: Finalize
  - type: security.triggerIncrementalAd
  - type: security.tagProcessedAlerts
```
