# Security Detection Spikes - Communication Brief

**Date**: 2026-03-20
**Author**: Patryk Kopycinski
**Audience**: Team Leads, Engineering Managers, Product Managers
**Status**: Ready for distribution

---

## Executive Summary

We have 4 security detection spikes that form an integrated detection-to-response pipeline:

1. **Compliance Monitoring** (#258480) - CIS benchmark tracking for endpoints
2. **Vulnerability Checker** (#258041) - AI-native CVE detection and triage
3. **Correlation Engine** (#257949) - Cross-alert correlation for attack chains
4. **Alert Investigation Pipeline** (#257957) - Auto-case creation from correlated alerts

### Critical Finding

These spikes form a **4-tier dependency stack**. Each tier must ship before the next can begin:

```
┌─────────────────────────────────────────────┐
│ TIER 1: Platform Foundations                │  ← 2 weeks (BLOCKS ALL)
│ @detection-engine + @generative-ai          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ TIER 2: New Rule Types                      │  ← 2 weeks
│ @detection-engine                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ TIER 3: Plugin Features (PARALLEL)          │  ← 4 weeks
│ @defend-workflows + @generative-ai          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ TIER 4: Cross-Plugin Integration            │  ← 4 weeks
│ ALL teams coordinate                        │
└─────────────────────────────────────────────┘

Total: 12 weeks (optimistic, no blockers)
```

### Bottleneck

**Tier 1 platform work blocks everything**. It involves 2 teams (Detection Engine + Gen AI) updating 4 shared packages. This must start immediately.

---

## What Each Spike Delivers

| Spike | User-Facing Feature | Backend Capability | Team Owner |
|-------|---------------------|-------------------|------------|
| **Compliance Monitoring** | Dashboard showing CIS benchmark pass/fail rates per endpoint | Osquery-based compliance rule engine | @security-defend-workflows |
| **Vulnerability Checker** | Alert rule type that correlates endpoint packages to CVEs, AI-powered triage | CVE matching engine + LLM analysis | @security-detection-engine + @security-generative-ai |
| **Correlation Engine** | Alert rule type that groups related alerts (temporal, count-based) | ES\|QL query compiler for cross-alert correlation | @security-detection-engine |
| **Alert Pipeline** | Auto-creates cases from deduplicated alerts, enriches with entities | Alert deduplication + case matching algorithm | @security-generative-ai |

---

## Team Workload Distribution

| Team | Primary Work % | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|------|---------------|--------|--------|--------|--------|
| **@security-detection-engine** | 60% | ✓ | ✓ | - | ✓ |
| **@security-generative-ai** | 30% | ✓ | - | ✓ | ✓ |
| **@security-defend-workflows** | 10% | - | - | ✓ | ✓ |
| **@kibana-cases** | Support | - | - | - | ✓ |
| **@security-solution** | Support | - | - | - | ✓ |

---

## What to Communicate to Each Team

### @elastic/security-detection-engine (60% of work)

**Your Responsibilities:**
1. **Tier 1** (Week 1-2): Update rule type registry and alert schema packages
2. **Tier 2** (Week 3-4): Ship correlation and vulnerability rule type engines
3. **Tier 4** (Week 11-12): Integration support for UI components

**What You're Blocking:**
- ⚠️ **ALL downstream work depends on Tier 1 package updates**
- Correlation and vulnerability features can't start until Tier 2 ships

**Required Coordination:**
- **Weekly sync** with @security-generative-ai on alert schema changes
- **Bi-weekly sync** with @security-solution on UI integration

**Decision Needed:**
- Should correlation and vulnerability be separate packages or unified?
- Who owns ES|QL compiler long-term (your team or Search team)?

**Action Items:**
- [ ] Confirm Tier 1 start date (target: next sprint)
- [ ] Assign lead engineer for rule type registry updates
- [ ] Schedule weekly schema sync meeting

---

### @elastic/security-generative-ai (30% of work)

**Your Responsibilities:**
1. **Tier 1** (Week 1-2): Update AI assistant constants package
2. **Tier 3** (Week 5-8): Ship alert pipeline and hierarchical batch processing
3. **Tier 4** (Week 9-12): Cases integration with @kibana-cases team

**What You're Blocking:**
- Pipeline feature can't start until Tier 1 ships
- Cases integration blocks final E2E testing

**Required Coordination:**
- **Weekly sync** with @security-detection-engine on alert queries
- **Bi-weekly sync** with @kibana-cases on observable schema

**Decision Needed:**
- Should pipeline modules (dedup, entity extraction) move to standalone packages?
- What's the LLM cost budget for incremental Attack Discovery at scale?

**Action Items:**
- [ ] Review Tier 1 package scope (assistant constants)
- [ ] Estimate LLM cost for pipeline at 1000+ alerts/day
- [ ] Schedule bi-weekly Cases team sync

---

### @elastic/security-defend-workflows (10% of work)

**Your Responsibilities:**
1. **Tier 3** (Week 9-10): Ship compliance monitoring feature in osquery plugin
2. **Tier 4** (Week 11-12): Workflow steps integration

**What You're Blocking:**
- ✅ Compliance feature doesn't block other spikes
- Can work in parallel with Gen AI's Tier 3 work

**Required Coordination:**
- **One-time sync** with @security-detection-engine on rule type registration
- **One-time sync** with Workflows team on step definitions

**Decision Needed:**
- Should compliance modules stay in osquery plugin or move to security_solution?
- What's the osquery polling frequency limit before performance issues?

**Action Items:**
- [ ] Confirm Tier 3 start date (Week 9 earliest)
- [ ] Performance test osquery polling (find max frequency)
- [ ] Decide on compliance module location

---

### @elastic/kibana-cases (Supporting: Integration only)

**Your Responsibilities:**
1. **Tier 4** (Week 11-12): Cases auto-creation API integration

**What You're Blocking:**
- ✅ Final E2E testing (not a critical path blocker)

**Required Coordination:**
- **Bi-weekly sync** with @security-generative-ai on observable schema
- **One-time PR review** for observable attachment API changes

**Decision Needed:**
- Entity schema standardization: unify pipeline's bare keys (`ipv4`) with Cases' prefixed keys (`observable-type-ipv4`)?

**Action Items:**
- [ ] Review observable schema proposal from Gen AI team
- [ ] Confirm API change acceptance criteria

---

### @elastic/security-solution (Supporting: UI only)

**Your Responsibilities:**
1. **Tier 4** (Week 11-12): Alert flyout, dashboards, rule creation forms for new rule types

**What You're Blocking:**
- ✅ Final UI polish (not a critical path blocker)

**Required Coordination:**
- **Monthly UI review** with all feature teams
- **Accessibility audit** before feature flag removal

**Decision Needed:**
- Create dedicated UI components for correlation/vulnerability or extend existing ones?

**Action Items:**
- [ ] Schedule monthly UI review meetings (start Week 5)
- [ ] Review correlation/vulnerability UI mockups
- [ ] Plan accessibility audit for Week 12

---

## High-Value Extraction Opportunities

Beyond the immediate spike work, we identified 3 modules that could be extracted as standalone, reusable packages:

| Module | Reusability | Extraction Effort | Business Value |
|--------|-------------|-------------------|----------------|
| **Alert Deduplication** | Very High | 4 days | ⭐⭐⭐⭐⭐ Any alert de-duping use case |
| **LLM Batch Processing** | Very High | 3 days | ⭐⭐⭐⭐⭐ Any LLM task needing batching |
| **Entity Extraction** | Medium-High | 5 days | ⭐⭐⭐⭐ Any entity-based correlation |

**Recommendation**: Consider extracting Alert Deduplication and LLM Batch Processing as standalone packages — both have broad applicability beyond security (could be used by Observability, ML teams).

---

## Timeline & Milestones

### Month 1: Foundation
- **Week 1-2**: Tier 1 packages (@detection-engine + @generative-ai)
- **Week 3-4**: Tier 2 rule types (@detection-engine)

**Milestone**: Rule types work in isolation with feature flags

### Month 2: Features
- **Week 5-8**: Tier 3 plugin features (all teams, parallel)

**Milestone**: Each feature works independently

### Month 3: Integration
- **Week 9-12**: Tier 4 cross-plugin integration (all teams)

**Milestone**: E2E flows work, Scout tests pass

### Month 4: Validation (optional)
- **Week 13-14**: Performance testing, feature flag removal planning

**Milestone**: Ready for GA

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tier 1 packages break existing code | Medium | High | Extensive tests, feature flags |
| Cross-team coordination delays | High | Medium | Weekly syncs, clear ownership |
| LLM costs exceed budget | High | Medium | Incremental processing, cost monitoring |
| ES\|QL compiler edge cases | High | Medium | Comprehensive test suite, gradual rollout |

---

## Next Steps

### Immediate Actions (This Week)
1. **Socialize this brief** with all team leads
2. **Get buy-in** on Tier 1 start date (target: next sprint)
3. **Schedule kick-off meeting** with Detection Engine + Gen AI teams
4. **Create tracking issues** for Tier 1 package updates

### Week 2
5. **Set up weekly cross-team syncs** (Detection Engine ↔ Gen AI)
6. **Assign lead engineers** for each tier
7. **Document feature flag strategy** (separate flags per spike vs. unified)

### Week 3
8. **Begin Tier 1 implementation**
9. **Weekly status updates** to this brief

---

## Questions?

**For technical details**, see: [spike_module_dependency_analysis.md](spike_module_dependency_analysis.md)

**For spike implementations**, see PR links:
- Compliance: https://github.com/elastic/kibana/pull/258480
- Vulnerability: https://github.com/elastic/kibana/pull/258041
- Pipeline: https://github.com/elastic/kibana/pull/257957
- Correlation: https://github.com/elastic/kibana/pull/257949

**Contact**: @patrykkopycinski for questions or clarifications
