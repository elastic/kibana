# Module Dependency Analysis - Security Detection Spikes

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
These are pure infrastructure with no spike-specific logic:

| Module | Team | Description | Used By | Ship As |
|--------|------|-------------|---------|---------|
| **kbn-securitysolution-rules** | @elastic/security-detection-engine | Rule type constants, mappings | All detection rules | Platform package v1.0 |
| **kbn-securitysolution-io-ts-alerting-types** | @elastic/security-detection-engine | Alert schema types | Correlation, Vuln Checker | Platform package v1.0 |
| **kbn-elastic-assistant-common** | @elastic/security-generative-ai | Shared assistant types/constants | Pipeline, Vuln Checker | Platform package v1.0 |
| **kbn-scout-security** | @elastic/security-detection-engine | Security E2E test fixtures | All spikes (tests) | Dev package v1.0 |

**Recommendation**: Ship these 4 packages as standalone modules **before** any spike work. They have zero spike-specific logic and provide the foundation.

### Tier 2: Rule Type Extensions (Ship with Detection Engine)
These extend the detection engine's rule type system:

| Module | Team | Description | Depends On | Ship As |
|--------|------|-------------|-----------|---------|
| **correlation query compiler** | @elastic/security-detection-engine | ES\|QL query generation from config | Tier 1 packages | Detection Engine v9.5 |
| **vulnerability correlation engine** | @elastic/security-detection-engine | CVE matching, enrichment | Tier 1 packages | Detection Engine v9.5 |
| **rule type registry updates** | @elastic/security-detection-engine | New rule type constants | Tier 1 packages | Detection Engine v9.5 |

**Recommendation**: Ship as part of Detection Engine milestone, gated by feature flags.

### Tier 3: Plugin Modules (Ship with Plugin Updates)
These are plugin-specific but could be modularized:

| Module | Team | Description | Depends On | Ship As |
|--------|------|-------------|-----------|---------|
| **osquery compliance services** | @elastic/security-defend-workflows | Compliance rule engine, scoring | Tier 1 + osquery plugin | Osquery plugin v9.6 |
| **attack_discovery/pipeline** | @elastic/security-generative-ai | Dedup, entity extraction, case matching | Tier 1 + elastic_assistant | Assistant plugin v9.6 |
| **batch processing (hierarchical merge)** | @elastic/security-generative-ai | LLM batch orchestration | Tier 1 + elastic_assistant | Assistant plugin v9.6 |

**Recommendation**: Each team ships their plugin module independently once Tier 1 is available.

### Tier 4: Integration Layers (Ship Last)
These orchestrate across modules:

| Module | Team | Description | Depends On | Ship As |
|--------|------|-------------|-----------|---------|
| **workflow steps** | Multiple teams | Workflows plugin integration | All Tier 2-3 modules | Cross-team v9.7+ |
| **case integration** | @elastic/security-generative-ai + @elastic/kibana-cases | Auto-case creation, observables | Pipeline + Cases plugin | Cross-team v9.7+ |
| **UI components** | @elastic/security-solution | Flyouts, dashboards, forms | All backend modules | Security Solution v9.7+ |

**Recommendation**: Wait until Tier 2-3 modules are stable before integrating.

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
