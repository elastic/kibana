# Module Dependency Analysis - Security Detection Spikes

## Executive Summary

**Purpose**: This document maps the 4 security spikes to team ownership and identifies which components can ship independently.

**Key Finding**: These spikes form a **4-tier dependency stack** — each tier must ship before the next:

```
Tier 1: Platform Foundations (2 weeks)
   ↓ ALL spikes blocked until this ships
Tier 2: New Rule Types (2 weeks)
   ↓ Correlation & Vulnerability features blocked
Tier 3: Plugin Features (4 weeks, can parallelize)
   ↓ Integration blocked until all features stable
Tier 4: Cross-Plugin Integration (4 weeks)
```

**Critical Path**: 12 weeks end-to-end IF no blockers. Tier 1 is the gating factor.

**Recommendation**: Start with Tier 1 foundation work immediately (involves 2 teams, blocks all downstream work).

### Quick Reference: What Each Spike Delivers

| Spike | User-Facing Feature | Backend Capability | Team Owner |
|-------|---------------------|-------------------|------------|
| **Compliance Monitoring** | Dashboard showing CIS benchmark pass/fail rates per endpoint | Osquery-based compliance rule engine | @security-defend-workflows |
| **Vulnerability Checker** | Alert rule type that correlates endpoint packages to CVEs, AI-powered triage | CVE matching engine + LLM analysis | @security-detection-engine + @security-generative-ai |
| **Correlation Engine** | Alert rule type that groups related alerts (temporal, count-based) | ES\|QL query compiler for cross-alert correlation | @security-detection-engine |
| **Alert Pipeline** | Auto-creates cases from deduplicated alerts, enriches with entities | Alert deduplication + case matching algorithm | @security-generative-ai |

---

## High-Level Module Map

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: Platform Foundations (Week 1-2)                     │
│ @elastic/security-detection-engine + @security-generative-ai│
│                                                             │
│ ┌─────────────┐  ┌──────────────┐  ┌───────────────┐      │
│ │ Rule Type   │  │ Alert Schema │  │ AI Assistant  │      │
│ │ Registry    │  │ Definitions  │  │ Constants     │      │
│ └─────────────┘  └──────────────┘  └───────────────┘      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 2: New Detection Capabilities (Week 3-4)               │
│ @elastic/security-detection-engine                          │
│                                                             │
│ ┌──────────────────┐         ┌─────────────────────┐       │
│ │ Correlation      │         │ Vulnerability       │       │
│ │ Engine           │         │ Detection Engine    │       │
│ │ (ES|QL queries)  │         │ (CVE matching)      │       │
│ └──────────────────┘         └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 3: Plugin Features (Week 5-8, PARALLEL)                │
│                                                             │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │ Compliance   │  │ Alert        │  │ Hierarchical │      │
│ │ Monitoring   │  │ Pipeline     │  │ Batch LLM    │      │
│ │              │  │              │  │              │      │
│ │ @defend-     │  │ @generative- │  │ @generative- │      │
│ │  workflows   │  │  ai          │  │  ai          │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 4: Integration (Week 9-12)                             │
│ ALL TEAMS coordinate                                        │
│                                                             │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │ Workflows    │  │ Cases        │  │ UI           │      │
│ │ Integration  │  │ Auto-Create  │  │ Components   │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Team Ownership Map (from CODEOWNERS)

| Team | Owns |
|------|------|
| **@elastic/security-generative-ai** | `elastic_assistant` plugin, `kbn-elastic-assistant*` packages |
| **@elastic/security-detection-engine** | `security_solution` detection engine, `kbn-securitysolution-*` packages |
| **@elastic/security-defend-workflows** | `osquery` plugin |
| **@elastic/security-solution** | Overall `security_solution` plugin |
| **@elastic/security-detection-rule-management** | Detection rule management APIs |
| **@elastic/kibana-cases** | Cases plugin integration |

## Module Dependency Diagram

```mermaid
graph TB
    subgraph "Platform Shared Packages (Foundation)"
        A1[kbn-securitysolution-rules<br/>@elastic/security-detection-engine]
        A2[kbn-securitysolution-io-ts-alerting-types<br/>@elastic/security-detection-engine]
        A3[kbn-elastic-assistant-common<br/>@elastic/security-generative-ai]
        A4[kbn-doc-links<br/>Platform team]
        A5[kbn-scout-security<br/>@elastic/security-detection-engine]
        A6[deeplinks/security<br/>Platform team]
    end

    subgraph "Solution Packages (Security-Specific)"
        B1[features<br/>@elastic/security-detection-engine]
        B2[kbn-securitysolution-io-ts-alerting-types<br/>@elastic/security-detection-engine]
    end

    subgraph "Detection Rule Types (Core Engine)"
        C1[correlation<br/>@elastic/security-detection-engine]
        C2[vulnerability_check<br/>@elastic/security-detection-engine]
        C3[existing rule types<br/>query/eql/threshold/ml]
    end

    subgraph "Osquery Plugin"
        D1[osquery compliance module<br/>@elastic/security-defend-workflows]
    end

    subgraph "Elastic Assistant Plugin"
        E1[attack_discovery/pipeline<br/>@elastic/security-generative-ai]
        E2[batch processing<br/>@elastic/security-generative-ai]
        E3[case_integration<br/>@elastic/security-generative-ai]
    end

    subgraph "Security Solution Plugin"
        F1[detection_engine executor<br/>@elastic/security-detection-engine]
        F2[rule_management<br/>@elastic/security-detection-rule-management]
        F3[alert flyout/UI<br/>@elastic/security-solution]
    end

    subgraph "External Dependencies"
        G1[Cases Plugin<br/>@elastic/kibana-cases]
        G2[Fleet Plugin<br/>Fleet team]
        G3[Workflows Plugin<br/>Workflow team]
    end

    %% Platform foundations used by everyone
    A1 --> C1
    A1 --> C2
    A1 --> D1
    A2 --> C1
    A2 --> C2
    A3 --> E1
    A5 --> C1
    A5 --> C2
    A5 --> D1

    %% Solution packages build on platform
    B1 --> C2
    B2 --> C1
    B2 --> C2

    %% Rule types integrate with detection engine
    C1 --> F1
    C2 --> F1
    C3 --> F1
    D1 --> F1

    %% Pipeline uses detection engine outputs
    F1 --> E1
    E1 --> E3
    E3 --> G1

    %% UI layer consumes all
    F1 --> F3
    C1 --> F3
    C2 --> F3
    E1 --> F3

    %% External plugin dependencies
    D1 --> G2
    C2 --> G2
    E1 --> G3
    C1 --> G3

    classDef platform fill:#e1f5ff,stroke:#0077cc,stroke-width:2px
    classDef solution fill:#fff4e1,stroke:#ff9900,stroke-width:2px
    classDef ruleType fill:#e1ffe1,stroke:#00aa00,stroke-width:2px
    classDef plugin fill:#ffe1f5,stroke:#cc0077,stroke-width:2px
    classDef external fill:#f0f0f0,stroke:#666,stroke-width:1px

    class A1,A2,A3,A4,A5,A6 platform
    class B1,B2 solution
    class C1,C2,C3 ruleType
    class D1,E1,E2,E3,F1,F2,F3 plugin
    class G1,G2,G3 external
```

## Standalone Modules (Can Ship Independently)

### Tier 1: Platform Foundations (Ship First)
These are pure infrastructure components that ALL spikes depend on:

| What It Does | Team Owner | Why It Matters | Blocking Impact |
|--------------|------------|----------------|-----------------|
| **Detection Rule Type Registry** | @elastic/security-detection-engine | Defines how new rule types (Correlation, Vulnerability) register with the Detection Engine | **ALL** rule types can't load without this |
| **Alert Schema Definitions** | @elastic/security-detection-engine | TypeScript types for new alert formats (correlation alerts, vulnerability alerts) | Correlation & Vuln Checker can't create alerts |
| **AI Assistant Shared Constants** | @elastic/security-generative-ai | Configuration limits (batch sizes, thresholds) used by pipeline | Pipeline can't function |
| **Security Test Infrastructure** | @elastic/security-detection-engine | E2E test utilities for new UI components | All spikes can't write tests |

**Recommendation**: Ship these 4 capability areas **before** any spike work. They have zero spike-specific logic and provide the foundation.

### Tier 2: New Rule Type Engines (Ship with Detection Engine)
These add new detection capabilities to the Security Solution:

| Capability | Team Owner | What It Provides | Business Value |
|------------|------------|------------------|----------------|
| **Cross-Alert Correlation** | @elastic/security-detection-engine | Groups related alerts using ES\|QL queries (temporal, count-based patterns) | Detect multi-stage attacks (lateral movement, kill chains) |
| **Vulnerability Detection** | @elastic/security-detection-engine | Matches endpoint packages against CVE databases, AI-powered triage | Proactive vulnerability management, zero-day detection |
| **ES\|QL Query Generation** | @elastic/security-detection-engine | Compiles declarative correlation configs into executable queries | Powers both correlation and vuln checker |

**Recommendation**: Ship as part of Detection Engine milestone, gated by feature flags (`correlationRulesEnabled`, `vulnerabilityCheckerEnabled`).

### Tier 3: Plugin-Level Features (Ship with Plugin Updates)
These are new capabilities within existing plugins:

| Feature | Team Owner | What It Provides | User-Facing Impact |
|---------|------------|------------------|-------------------|
| **Endpoint Compliance Monitoring** | @elastic/security-defend-workflows | CIS benchmark checks via osquery, compliance scoring dashboard | SOC teams can track endpoint compliance posture |
| **Alert Investigation Pipeline** | @elastic/security-generative-ai | Auto-deduplicates alerts, extracts entities, matches to cases | Reduces alert fatigue, auto-creates cases |
| **Hierarchical Attack Discovery** | @elastic/security-generative-ai | Batches large alert sets for LLM processing (hierarchical merge) | Enables Attack Discovery on OSS models (8K context) |

**Recommendation**: Each team ships their feature independently once Tier 1 & 2 are available.

### Tier 4: Cross-Plugin Integration (Ship Last)
These connect features across team boundaries:

| Integration | Teams Involved | What It Enables | Coordination Required |
|-------------|----------------|-----------------|----------------------|
| **Workflow Orchestration** | All teams → Workflows team | Compose detection → correlation → case creation in YAML workflows | Weekly sync on step definitions |
| **Cases Auto-Creation** | Gen AI + Cases team | Pipeline auto-creates cases from correlated alerts, attaches observables | Bi-weekly sync on schema changes |
| **Unified UI Layer** | All teams → Security Solution team | Alert flyouts show correlation context, vuln details, compliance findings | Monthly UI review meetings |

**Recommendation**: Wait until Tier 2-3 features are stable before integrating (avoid coordinating 4 moving targets).

## Cross-Module Dependencies by Spike

### Compliance Monitoring (#258480)
```
Tier 1: kbn-securitysolution-rules
  ↓
osquery plugin (Tier 3)
  ↓
Fleet plugin (external)
  ↓
workflows plugin (Tier 4)
```

**Team Dependencies:**
- Primary: @elastic/security-defend-workflows
- Secondary: @elastic/security-detection-engine (rule types)
- External: Fleet team

### Vulnerability Checker (#258041)
```
Tier 1: kbn-securitysolution-rules + kbn-securitysolution-io-ts-alerting-types
  ↓
Tier 2: vulnerability_check rule type
  ↓
Tier 3: elastic_assistant (AI triage)
  ↓
Fleet plugin (inventory) + Cases plugin (Tier 4)
```

**Team Dependencies:**
- Primary: @elastic/security-detection-engine
- Secondary: @elastic/security-generative-ai (AI layer)
- External: Fleet team, Cases team

### Alert Pipeline (#257957)
```
Tier 1: kbn-elastic-assistant-common
  ↓
Tier 3: attack_discovery/pipeline modules
  ↓
Tier 4: case_integration + workflows
```

**Team Dependencies:**
- Primary: @elastic/security-generative-ai
- Secondary: @elastic/kibana-cases
- External: Workflows team

### Correlation Engine (#257949)
```
Tier 1: kbn-securitysolution-rules + kbn-securitysolution-io-ts-alerting-types
  ↓
Tier 2: correlation rule type + ES|QL compiler
  ↓
Tier 3: detection_engine executor
  ↓
Tier 4: UI components + workflows
```

**Team Dependencies:**
- Primary: @elastic/security-detection-engine
- Secondary: @elastic/security-solution (UI)
- External: Workflows team

## Recommended Shipping Strategy

### Phase 1: Foundation (Week 1-2)
**Teams**: @elastic/security-detection-engine + @elastic/security-generative-ai

Ship Tier 1 packages as standalone:
- [ ] kbn-securitysolution-rules (add correlation/vulnerability constants)
- [ ] kbn-securitysolution-io-ts-alerting-types (add correlation/vuln schemas)
- [ ] kbn-elastic-assistant-common (add pipeline constants)
- [ ] kbn-scout-security (add new test fixtures)

**Acceptance**: All 4 packages have unit tests passing, no spike-specific logic

### Phase 2: Rule Types (Week 3-4)
**Teams**: @elastic/security-detection-engine

Ship Tier 2 rule type extensions:
- [ ] correlation query compiler (standalone module)
- [ ] vulnerability correlation engine (standalone module)
- [ ] detection_engine executor updates (integrate new rule types)

**Acceptance**: Rule types work in isolation, feature-flagged

### Phase 3: Plugin Modules (Week 5-8, parallel)
**Teams**: Each team ships their own module

Parallel workstreams:
- [ ] @elastic/security-defend-workflows: osquery compliance
- [ ] @elastic/security-generative-ai: attack_discovery pipeline
- [ ] @elastic/security-generative-ai: batch processing

**Acceptance**: Each module works with Tier 1-2 foundations

### Phase 4: Integration (Week 9-12)
**Teams**: All teams coordinate

Ship Tier 4 integration layers:
- [ ] Workflows plugin integration (all teams)
- [ ] Cases integration (Gen AI + Cases teams)
- [ ] UI components (Security Solution team)

**Acceptance**: E2E flows work, Scout tests pass

## Critical Path Analysis

```
Tier 1 Packages (2 weeks)
   ├─► Tier 2 Rule Types (2 weeks) ──┐
   │                                  │
   ├─► Tier 3 Osquery (2 weeks)      ├─► Tier 4 Integration (4 weeks)
   │                                  │
   ├─► Tier 3 Pipeline (3 weeks)     │
   │                                  │
   └─► Tier 3 Batch (2 weeks) ───────┘

Total: 12 weeks (optimistic, assumes no blockers)
```

**Bottleneck**: Tier 4 integration requires all Tier 3 modules to be stable.

## Team Communication Matrix

| From/To | Detection Engine | Gen AI | Defend Workflows | Cases | Workflows |
|---------|------------------|--------|------------------|-------|-----------|
| **Detection Engine** | - | Rule schema sync | Rule constants | Alert schema | Workflow steps |
| **Gen AI** | Alert queries | - | N/A | Case creation API | Pipeline steps |
| **Defend Workflows** | Rule registration | N/A | - | N/A | Compliance steps |
| **Cases** | N/A | Observable schema | N/A | - | N/A |
| **Workflows** | Step definitions | Step definitions | Step definitions | N/A | - |

## Open Questions for Team Leads

### For @elastic/security-detection-engine:
1. Should correlation and vulnerability be separate rule type packages or one unified package?
2. What's the upgrade path for existing rule schemas (add new fields without breaking)?
3. Who owns the ES|QL compiler long-term (Detection Engine or Search team)?

### For @elastic/security-generative-ai:
1. Should pipeline modules (dedupe, entity extraction) be in elastic_assistant or a new package?
2. What's the LLM cost budget for incremental AD at scale?
3. How do we version workflow step definitions?

### For @elastic/security-defend-workflows:
1. Should compliance modules live in osquery plugin or move to security_solution?
2. What's the osquery polling frequency limit before performance degrades?
3. How do compliance findings integrate with Detection Engine alerts?

### Cross-Team:
1. Who owns the shared alert index schema updates?
2. What's the feature flag strategy (one flag per spike or one flag for all)?
3. Should we create a new `@elastic/security-correlation` team?

## Detailed Module Breakdown

### Tier 1 Packages Deep Dive

#### kbn-securitysolution-rules
**Location**: `src/platform/packages/shared/kbn-securitysolution-rules`
**Owner**: @elastic/security-detection-engine
**Current Contents**:
- `rule_type_constants.ts` - Constants for all rule types
- `rule_type_mappings.ts` - Mapping of rule types to metadata

**Changes Needed**:
- Add `CORRELATION_RULE_TYPE` constant
- Add `VULNERABILITY_CHECK_RULE_TYPE` constant
- Update type mappings for new rule types

**File Impact**:
- Compliance: 0 files (uses existing constants)
- Vuln Checker: 2 files modified
- Correlation: 2 files modified
- Pipeline: 0 files

**Estimated Effort**: 2-3 days (includes tests and validation)

#### kbn-securitysolution-io-ts-alerting-types
**Location**: `x-pack/solutions/security/packages/kbn-securitysolution-io-ts-alerting-types`
**Owner**: @elastic/security-detection-engine
**Current Contents**:
- `src/type/index.ts` - Alert type definitions

**Changes Needed**:
- Add correlation alert schema types
- Add vulnerability alert schema types
- Add building block + shell alert types

**File Impact**:
- Vuln Checker: 1 file
- Correlation: 1 file

**Estimated Effort**: 3-4 days (complex schema validation)

#### kbn-elastic-assistant-common
**Location**: `x-pack/platform/packages/shared/kbn-elastic-assistant-common`
**Owner**: @elastic/security-generative-ai
**Current Contents**:
- `constants.ts` - Shared constants

**Changes Needed**:
- Add pipeline constants (min alerts threshold, max batch size)
- Add processed alert tracker index name constants

**File Impact**:
- Pipeline: 1 file

**Estimated Effort**: 1-2 days

#### kbn-scout-security
**Location**: `x-pack/solutions/security/packages/kbn-scout-security`
**Owner**: @elastic/security-detection-engine
**Current Contents**:
- Page objects for security E2E tests

**Changes Needed**:
- Add vulnerability posture page object
- Add correlation UI page objects
- Add compliance dashboard page objects

**File Impact**:
- Vuln Checker: 1 new page object file
- Correlation: 0 files (can reuse existing)
- Compliance: 0 files (manual testing)

**Estimated Effort**: 2-3 days per page object

### Tier 2 Modules Deep Dive

#### Correlation Query Compiler
**Location**: `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/correlation`
**Owner**: @elastic/security-detection-engine
**Key Files**:
- `compile_correlation_query.ts` (290 lines, 80 tests)
- `correlation.ts` (329 lines, executor logic)

**Could Be Standalone Package?**: Yes
- **Proposed Location**: `x-pack/solutions/security/packages/kbn-correlation-query-compiler`
- **Benefits**: Reusable by other correlation use cases (not just detection rules)
- **Dependencies**: Only Tier 1 packages
- **Estimated Effort**: 3-4 days to extract + test

#### Vulnerability Correlation Engine
**Location**: `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/vulnerability_check`
**Owner**: @elastic/security-detection-engine
**Key Modules**:
- `inventory/` - Osquery endpoint data collection
- `cve_correlation/` - Version-range CVE matching
- `enrichment/` - EPSS, KEV, SSVC, MITRE
- `ai_modules/` - LLM triage, prioritization

**Could Be Standalone Package?**: Partially
- **Core engine**: Yes (inventory + CVE correlation)
  - Proposed: `x-pack/solutions/security/packages/kbn-vulnerability-assessment`
- **AI modules**: No (tightly coupled to elastic_assistant)

**Estimated Effort**: 5-7 days for core engine extraction

### Tier 3 Modules Deep Dive

#### Attack Discovery Pipeline
**Location**: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline`
**Owner**: @elastic/security-generative-ai
**Key Modules**:
- `deduplication/` - Union-Find clustering (262 lines, 156 tests)
- `entity_extraction/` - ECS field to observable mapping (128 lines, 156 tests)
- `case_matching/` - Weighted entity overlap scoring (291 lines, 256 tests)
- `incremental/` - Processed alert tracker (195 lines, 581 tests)

**Could Be Standalone Package?**: Yes, with caveats
- **Deduplication**: Highly reusable, minimal dependencies
  - Proposed: `x-pack/platform/packages/shared/kbn-alert-deduplication`
  - **Use Cases**: Any alert de-duping (not just AD)
- **Entity Extraction**: Security-specific but portable
  - Proposed: `x-pack/solutions/security/packages/kbn-entity-extraction`
- **Case Matching**: Tightly coupled to Cases plugin schema
  - Keep in elastic_assistant for now

**Estimated Effort**: 4-5 days per module extraction

#### Batch Processing (Hierarchical Merge)
**Location**: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/graphs/default_attack_discovery_graph/batch`
**Owner**: @elastic/security-generative-ai
**Key Files**:
- `split.ts` - Adaptive batch sizing (81 lines)
- `merge.ts` - Hierarchical LLM merge (250 lines)
- `orchestrator.ts` - Concurrent execution (319 lines)

**Could Be Standalone Package?**: Yes
- **Proposed**: `x-pack/platform/packages/shared/kbn-llm-batch-processing`
- **Benefits**: Reusable for any LLM task that needs batching (summarization, classification, etc.)
- **Dependencies**: Only LangChain/LangGraph (already platform-level)

**Estimated Effort**: 3-4 days

#### Osquery Compliance Services
**Location**: `x-pack/platform/plugins/shared/osquery/server/compliance`
**Owner**: @elastic/security-defend-workflows
**Key Modules**:
- `services/compliance_rules_service.ts` - CRUD (243 lines, 210 tests)
- `services/compliance_scoring_service.ts` - Aggregation (287 lines, 151 tests)
- `services/finding_evaluator_service.ts` - Poll + evaluate (234 lines, 175 tests)
- `routes/` - 12 API routes (443 lines total)

**Could Be Standalone Package?**: Not recommended
- Tightly coupled to osquery plugin architecture
- Uses osquery-specific saved objects and Fleet integration
- Better to keep in osquery plugin with feature flag

**Estimated Effort**: N/A (keep in place)

## Extraction Candidates (High ROI)

Based on reusability and low coupling:

| Module | Reusability | Coupling | Extraction Effort | ROI |
|--------|-------------|----------|-------------------|-----|
| **Alert Deduplication** | Very High | Very Low | 4 days | ⭐⭐⭐⭐⭐ |
| **LLM Batch Processing** | High | Low | 3 days | ⭐⭐⭐⭐⭐ |
| **Entity Extraction** | Medium-High | Medium | 5 days | ⭐⭐⭐⭐ |
| **Correlation Query Compiler** | Medium | Low | 4 days | ⭐⭐⭐⭐ |
| **Vulnerability Core Engine** | Medium | Medium | 7 days | ⭐⭐⭐ |

**Recommendation**: Start with Alert Deduplication and LLM Batch Processing — both have broad applicability beyond these spikes.

## Implementation Roadmap

### Month 1: Foundation
**Week 1-2**: Tier 1 packages
- [ ] @elastic/security-detection-engine: Update kbn-securitysolution-rules + io-ts-alerting-types
- [ ] @elastic/security-generative-ai: Update kbn-elastic-assistant-common
- [ ] @elastic/security-detection-engine: Add kbn-scout-security page objects

**Week 3-4**: High-ROI extractions
- [ ] @elastic/security-generative-ai: Extract kbn-alert-deduplication
- [ ] @elastic/security-generative-ai: Extract kbn-llm-batch-processing

### Month 2: Rule Types
**Week 5-6**: Correlation
- [ ] @elastic/security-detection-engine: Extract kbn-correlation-query-compiler (optional)
- [ ] @elastic/security-detection-engine: Integrate correlation rule type with feature flag

**Week 7-8**: Vulnerability
- [ ] @elastic/security-detection-engine: Integrate vulnerability_check rule type
- [ ] @elastic/security-generative-ai: Wire AI triage layer

### Month 3: Plugins
**Week 9-10**: Parallel work
- [ ] @elastic/security-defend-workflows: Ship osquery compliance (feature-flagged)
- [ ] @elastic/security-generative-ai: Ship attack_discovery pipeline (feature-flagged)

**Week 11-12**: Integration
- [ ] All teams: Workflows plugin integration
- [ ] @elastic/security-generative-ai + @elastic/kibana-cases: Cases integration
- [ ] @elastic/security-solution: UI components

**Week 13-14**: Validation
- [ ] All teams: E2E Scout tests
- [ ] All teams: Performance testing
- [ ] All teams: Feature flag removal planning

## Success Criteria

### Tier 1 (Foundation)
- [ ] All 4 packages have 100% test coverage for new code
- [ ] No spike-specific logic in packages (pure infrastructure)
- [ ] All packages published to internal npm registry
- [ ] Documentation updated (README, API docs)

### Tier 2 (Rule Types)
- [ ] Rule types work in isolation with feature flags off
- [ ] Rule preview works for both new types
- [ ] ES|QL compiler has >80% test coverage
- [ ] Vulnerability engine handles 1000+ endpoints

### Tier 3 (Plugins)
- [ ] Each plugin module has integration tests
- [ ] Feature flags can be toggled without crashes
- [ ] Performance benchmarks meet targets:
  - Deduplication: <2s for 500 alerts
  - Compliance scoring: <5s for 1000 findings
  - Pipeline: <10s for 100 delta alerts

### Tier 4 (Integration)
- [ ] E2E Scout tests cover happy paths
- [ ] Workflows can chain all 4 workflow steps
- [ ] Cases integration handles 100+ alerts/case
- [ ] UI components pass accessibility audit

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tier 1 packages break existing code | Medium | High | Extensive unit + integration tests, feature flags |
| ES\|QL compiler has edge cases | High | Medium | Comprehensive test suite, gradual rollout |
| LLM costs exceed budget | High | Medium | Incremental processing, batch size tuning, cost monitoring |
| Workflows plugin API changes | Low | High | Lock to specific plugin version, abstraction layer |
| Cases plugin schema diverges | Medium | High | Bidirectional mappings, schema validation |
| Cross-team coordination delays | High | Medium | Weekly sync meetings, clear ownership boundaries |

## Next Steps

1. **Socialize this document** with all team leads
2. **Get buy-in** on Tier 1 package updates (blocking path)
3. **Create tracking issues** for each extraction candidate
4. **Schedule kick-off meeting** with Detection Engine + Gen AI teams
5. **Set up bi-weekly cross-team syncs** for Tier 4 integration

---

**Document Owner**: Patryk Kopycinski
**Last Updated**: 2026-03-20
**Status**: Draft for team review
## What to Communicate to Each Team

### @elastic/security-detection-engine (Primary: 60% of work)

**Your Responsibilities:**
1. **Tier 1** (Week 1-2): Update rule type registry and alert schema packages
2. **Tier 2** (Week 3-4): Ship correlation and vulnerability rule type engines
3. **Tier 4** (Week 11-12): Integration support for UI components

**What You're Blocking:**
- ALL downstream work depends on Tier 1 package updates
- Correlation and vulnerability features can't start until Tier 2 ships

**Required Coordination:**
- Weekly sync with @security-generative-ai on alert schema changes
- Bi-weekly sync with @security-solution on UI integration

**Decision Needed:**
- Should correlation and vulnerability be separate packages or unified?
- Who owns ES|QL compiler long-term (your team or Search team)?

---

### @elastic/security-generative-ai (Primary: 30% of work)

**Your Responsibilities:**
1. **Tier 1** (Week 1-2): Update AI assistant constants package
2. **Tier 3** (Week 5-8): Ship alert pipeline and hierarchical batch processing
3. **Tier 4** (Week 9-12): Cases integration with @kibana-cases team

**What You're Blocking:**
- Pipeline feature can't start until Tier 1 ships
- Cases integration blocks final E2E testing

**Required Coordination:**
- Weekly sync with @security-detection-engine on alert queries
- Bi-weekly sync with @kibana-cases on observable schema

**Decision Needed:**
- Should pipeline modules (dedup, entity extraction) move to standalone packages?
- What's the LLM cost budget for incremental Attack Discovery at scale?

---

### @elastic/security-defend-workflows (Primary: 10% of work)

**Your Responsibilities:**
1. **Tier 3** (Week 9-10): Ship compliance monitoring feature in osquery plugin
2. **Tier 4** (Week 11-12): Workflow steps integration

**What You're Blocking:**
- Compliance feature doesn't block other spikes
- Can work in parallel with Gen AI's Tier 3 work

**Required Coordination:**
- Sync with @security-detection-engine on rule type registration (one-time)
- Sync with Workflows team on step definitions (one-time)

**Decision Needed:**
- Should compliance modules stay in osquery plugin or move to security_solution?
- What's the osquery polling frequency limit before performance issues?

---

### @elastic/kibana-cases (Supporting: Integration only)

**Your Responsibilities:**
1. **Tier 4** (Week 11-12): Cases auto-creation API integration

**What You're Blocking:**
- Final E2E testing (not a critical path blocker)

**Required Coordination:**
- Bi-weekly sync with @security-generative-ai on observable schema
- Review PR for observable attachment API changes

**Decision Needed:**
- Entity schema standardization: should we unify pipeline's bare keys (e.g. `ipv4`) with Cases' prefixed keys (e.g. `observable-type-ipv4`)?

---

### @elastic/security-solution (Supporting: UI only)

**Your Responsibilities:**
1. **Tier 4** (Week 11-12): Alert flyout, dashboards, rule creation forms for new rule types

**What You're Blocking:**
- Final UI polish (not a critical path blocker)

**Required Coordination:**
- Monthly UI review with all feature teams
- Accessibility audit before feature flag removal

**Decision Needed:**
- Should we create dedicated UI components for correlation/vulnerability or extend existing ones?

