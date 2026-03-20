# Alert Investigation Pipeline Spike - Discovery Report

**Author:** Claude (via spike-builder skill)
**Date:** 2026-03-20
**Status:** Discovery Complete → Ready to Fill Gaps (Spike 60-70% Complete)

---

## Executive Summary

The alert investigation pipeline spike (#16339) is **60-70% complete** with extensive backend implementation, unit tests, and architecture documentation already in place. Key gaps identified: **feature flag (0%), demo scripts (0%), manual validation workflow (0%)**.

**Key findings:**
- ✅ Backend pipeline implementation is ~90% complete (dedup, entity extraction, case matching, incremental AD)
- ✅ Competitive analysis reveals SLA tracking opportunity (CrowdStrike's "1-10-60 rule")
- ⚠️ 2 hard/soft blockers identified: Attachments V2 (#256133), Workflow Triggers (#257284)
- 🔴 Critical gaps: Feature flag, demo scripts, validation workflow, screenshots

---

## Competitive Analysis

### Splunk Enterprise Security

**What they do well:**
- **Risk-Based Alerting:** Reduces alert fatigue by 46% through intelligent risk aggregation into unified risk index ([source](https://lantern.splunk.com/Security_Use_Cases/Threat_Investigation/Implementing_risk-based_alerting))
- **AI Assistant Integration:** Generates SPL searches, summarizes findings, reduces investigation time from hours to minutes ([source](https://www.bitsioinc.com/blog-post/splunk-enterprise-security-8-2-ai-soc-automation))
- **MITRE ATT&CK Correlation:** Auto-correlates events with MITRE techniques across timeframes
- **2026 AI Agents:** Triage Agent (prioritization), Malware Reversal Agent (script analysis), AI Playbook Authoring

**Fit with Elastic:**
- ✅ **Strong fit:** Risk-based aggregation aligns with our entity scoring and case matching
- ✅ **Strong fit:** MITRE correlation - we already have MITRE enrichment in pipeline
- ⚠️ **Medium fit:** AI Assistant - we have AI Assistant, but need tighter pipeline integration
- ❌ **Poor fit:** SPL-specific features (we use ES|QL)

---

### CrowdStrike Falcon

**What they do well:**
- **1-10-60 Rule:** Detect in 1 min, investigate in 10 min, remediate in 60 min (strict SLAs) ([source](https://www.crowdstrike.com/en-us/platform/endpoint-security/ai-powered-investigation/))
- **Index-Free Real-Time:** No index latency, instant correlation across EDR/identity/cloud
- **Charlotte AI Agentic Workflows:** Auto-decodes attacks, triages, filters false positives, triggers SOAR
- **Fusion SOAR (Free):** Cloud-scale SOAR built-in at no cost with pre-built templates ([source](https://www.crowdstrike.com/en-us/blog/new-falcon-fusion-features-refine-workflow-automation/))

**Fit with Elastic:**
- ✅ **Strong fit:** SLA-based approach - we should add SLA tracking to pipeline
- ⚠️ **Medium fit:** Agentic AI - we have AI but need autonomous decision-making
- ⚠️ **Medium fit:** Built-in SOAR - our Cases workflow is similar but less automated
- ✅ **Strong fit:** Real-time correlation - our pipeline design supports this

---

### Microsoft Sentinel

**What they do well:**
- **Automatic Incident Creation:** Configurable per source solution (Defender, Cloud, etc.) ([source](https://learn.microsoft.com/en-us/azure/sentinel/create-incidents-from-alerts))
- **Alert Correlation Engine:** Auto-aggregates related alerts into larger attack stories ([source](https://learn.microsoft.com/en-us/defender-xdr/alerts-incidents-correlation))
- **Investigation Graph:** Visual tool showing connections and patterns
- **Automation Rules:** Create tasks on incident creation/update with automation triggers
- **Similar Incidents:** Automatically shows most similar past incidents

**Fit with Elastic:**
- ✅ **Strong fit:** Auto incident creation - we're doing this with case creation
- ✅ **Strong fit:** Similar incidents - our case matching does this
- ⚠️ **Medium fit:** Investigation graph - we don't have visual graph yet (opportunity!)
- ✅ **Strong fit:** Automation rules - similar to our workflow steps

---

## Competitive Summary

**Best practices to adopt:**
1. **SLA Tracking (from CrowdStrike):** Add metrics dashboard with time-to-case-creation, time-to-AD-trigger, time-to-analyst-review. Alert if > 60 min.
2. **Similar Cases Widget (from Sentinel):** Add "5 most similar cases" to UI with similarity scores and matching entities.
3. **Risk Aggregation (from Splunk):** Add risk scoring to deduplicated alert clusters (not just count). Prioritize high-risk clusters.
4. **Agentic AI (from CrowdStrike):** Auto-triage and false positive filtering before case creation (Phase 2 enhancement).
5. **Investigation Graph (from Sentinel):** Visual entity relationship graph in UI (Phase 2 opportunity).

**Differentiation opportunities:**
- **Open Standards:** Use MITRE ATT&CK, ECS, OCSF (vs proprietary schemas)
- **Unified Data Platform:** Single platform for SIEM, observability, search (vs point solutions)
- **Transparent AI:** Explain why cases matched, which entities, show confidence scores
- **Cost Model:** No per-incident pricing (Splunk charges per notable event)
- **Customizable Workflows:** Flexible workflow steps vs rigid playbooks

---

## Overlap Detection

### Overlapping Work Found

| Type | Title | Status | Author | Overlap | Risk |
|------|-------|--------|--------|---------|------|
| Epic | [#16339](https://github.com/elastic/security-team/issues/16339) - Automated Alert-to-Investigation Pipeline | Open | @davethegut | 100% | 🟢 **THIS IS US** |
| PR | [#257957](https://github.com/elastic/kibana/pull/257957) - Alert Investigation Pipeline E2E Spike | Open | @patrykkopycinski | 100% | 🟢 **THIS IS US** |
| Epic | [#16185](https://github.com/elastic/security-team/issues/16185) - Alert Grouping with Incremental AD | Open | @patrykkopycinski | 90% | 🟡 Duplicate scope |
| Issue | [#16184](https://github.com/elastic/security-team/issues/16184) - Case Observable Auto-Extraction | Open | @patrykkopycinski | 75% | 🟢 Component |
| Issue | [#16187](https://github.com/elastic/security-team/issues/16187) - Auto AD Trigger on Alert Attachment | Open | @patrykkopycinski | 70% | 🟢 Component |
| Issue | [#16179](https://github.com/elastic/security-team/issues/16179) - Entity Extraction Engine | Open | @patrykkopycinski | 75% | 🟢 Component |
| Epic | [#16188](https://github.com/elastic/security-team/issues/16188) - Case-Attack Discovery Integration | Open | @patrykkopycinski | 70% | 🟢 Component |
| Issue | [#16181](https://github.com/elastic/security-team/issues/16181) - Scheduled Alert Grouping Workflow | Open | @patrykkopycinski | 65% | 🟢 Component |
| Epic | [#16178](https://github.com/elastic/security-team/issues/16178) - Alert Deduplication via Workflows | Open | @patrykkopycinski | 50% | 🟢 Reuse component |
| PR | [#256156](https://github.com/elastic/kibana/pull/256156) - Entity Analytics Lead Generation | Open | @abhishekbhatia1710 | 40% | 🟢 Reuse pattern |

### Risk Assessment

**🟢 No duplication risk:** Issues #16179, #16184, #16187, #16181, #16185, and #16188 are **sub-tasks** of main epic #16339. All authored by @patrykkopycinski (internal work breakdown).

**External coordination needed:**
- **Cases team** (@melissaburpo) - [#16088](https://github.com/elastic/security-team/issues/16088) for observables improvements
- **Entity Analytics** (@abhishekbhatia1710) - [#256156](https://github.com/elastic/kibana/pull/256156) for observation modules pattern
- **Actionable Obs** (@dominiqueclarke) - [#209388](https://github.com/elastic/kibana/issues/209388) for alert grouping heuristics

---

## Blocker Summary

### Hard Blockers

| Blocker | Type | Affects | Severity | Recommended | Fallback | Migration Effort |
|---------|------|---------|----------|-------------|----------|------------------|
| [#256133](https://github.com/elastic/kibana/pull/256133) Attachments V2 | Hard | Task 1C (AD Attachment) | 🔴 High | Wait for V2 (~1-2 weeks) | Build with V1 legacy API | ~2-3 days |

**[#256133] Cases Attachments V2 - Detail:**

- **Status:** PR open since Mar 5 (15 days), **2 approvals**, 8 commits, **last updated today**
- **Progress:** Close to merging (has approvals, actively worked on)
- **Timeline:** ~1-2 weeks to merge (estimate based on approval status)
- **Recommended:** Wait for `registerUnified()` API to stabilize; code against V2 schema in feature branch
- **Fallback:** Build using legacy `registerExternalReference()` API
- **Migration effort if fallback:** ~2-3 days
  - Re-register the attachment type via `registerUnified()` instead of `registerExternalReference()`
  - Change the attachment payload shape from legacy to V2 reference-based format (`{ type, attachmentId, owner, metadata }`)
  - Update any code that reads the attachment to handle the new shape
  - Must also handle existing V1 attachments created before migration — dual-read logic or one-time migration
- **Migration risk:** Medium
  - The V2 schema is simpler, so the code change is straightforward
  - The risk is in data migration — any AD attachments created via V1 must still be readable after the switch
  - Cases team's own dual-read PR ([#256133](https://github.com/elastic/kibana/pull/256133)) demonstrates the pattern
- **Decision point:** Week 1 - **start with V1 fallback**, migrate to V2 when available

---

### Soft Blockers

| Blocker | Type | Affects | Severity | Recommended | Fallback | Migration Effort |
|---------|------|---------|----------|-------------|----------|------------------|
| [#257284](https://github.com/elastic/kibana/pull/257284) Workflow Triggers | Soft | Task 2B (Auto AD Trigger) | 🟡 Medium | Use workflow triggers | Custom hook in Cases flow | ~3-5 days |
| [#257780](https://github.com/elastic/kibana/pull/257780) Cases Analytics Indices | Soft | Task 1A (Case Matching) | 🟡 Medium | Abstraction layer, swap to ES queries | Use SO API | ~1-2 days |

**[#257284] Cases Workflow Triggers - Detail:**

- **Status:** PR open since Mar 11 (9 days), **0 approvals**, 12 commits, **last updated today**
- **Progress:** Still in development (no approvals yet)
- **Timeline:** ~2-3 weeks to merge (estimate based on no approvals yet)
- **Recommended:** Use Cases workflow triggers to fire AD on alert attachment events
- **Fallback:** Build a custom hook directly in the Cases attachment server-side flow (add a callback in the `addComment` or `bulkCreateAttachments` path)
- **Migration effort if fallback:** ~3-5 days
  - Remove the custom hook from Cases internals
  - Register a workflow trigger handler instead
  - Update the trigger payload format to match the Cases workflow trigger schema
  - Test that existing auto-trigger configurations still work (may need a one-time migration of any persisted trigger configs)
  - Remove any test mocks/stubs for the custom hook
- **Migration risk:** Medium-High
  - The custom hook approach couples our code to Cases internals
  - When Cases ships workflow triggers, maintaining the hook alongside the trigger system creates two code paths
  - If the Cases team refactors the attachment flow, our hook may break silently
  - **This is the blocker most worth waiting for**
- **Decision point:** Week 5 - if not ready, use custom hook fallback

**[#257780] Cases Analytics Indices - Detail:**

- **Affects:** Task 1A (Case Matching Engine) for scale
- **Recommended:** Build against current SO API with an abstraction layer; swap to ES queries against `.cases-analytics.*` indices when they land
- **Fallback:** (Same as recommended — this IS the fallback approach)
- **Migration effort:** ~1-2 days
  - Replace SO `find()` calls in the matching engine with ES queries against `.cases-analytics.*` indices
  - The query semantics remain the same (filter by observables, sort by recency/relevance)
  - The abstraction layer makes this a single implementation swap
- **Migration risk:** Low
  - The analytics indices are additive — they mirror data from SOs into ES indices
  - Our abstraction layer will have a `findCasesByObservables(filter)` method
  - Changing its implementation from SO queries to ES queries is mechanical
  - Performance improves significantly (SO search caps at ~10K, ES indices scale arbitrarily)

---

### Strategic Considerations

| Item | Type | Affects | Severity | Recommended | Migration Effort |
|------|------|---------|----------|-------------|------------------|
| [#247464](https://github.com/elastic/kibana/pull/247464) Alerting V2 | Strategic | All alert queries | 🔴 High | Build on V1 with abstraction layer | ~1-2 weeks |

**[#247464] Alerting V2 - Detail:**

- **Context:** Complete alerting rewrite (episodes instead of individual alerts)
- **Status:** Massive initiative (~15 active PRs) but is behind a feature flag and unlikely to replace V1 within 1-2 releases
- **Recommended:** Build on V1 alerting APIs with an abstraction layer that isolates alert data access
- **Migration effort if we build on V1:** ~1-2 weeks
  - Alerting V2 changes the alert data model (episodes instead of individual alerts), query patterns (ES|QL views instead of direct index queries), and scheduling mechanism
  - **Migration scope:**
    1. Alert queries — rewrite from DSL against `.alerts-*` to ES|QL views against `.alerting-events` data streams (~2-3 days)
    2. Alert lifecycle — adapt pipeline to episode-based lifecycle (pending → active → recovering → inactive) instead of individual alert states (~2-3 days)
    3. Trigger mechanism — if using alerting rule actions to trigger AD, the action config schema changes (~1-2 days)
    4. Dedup semantics — V2's native episode grouping may subsume part of our dedup layer, potentially simplifying it (~1-2 days review + removal of redundant code)
- **Migration risk:** Medium
  - Alerting V2 is a massive initiative (~15 active PRs) but is behind a feature flag and unlikely to replace V1 within 1-2 releases
  - Building on V1 is the correct near-term choice
  - The abstraction layer (wrap all alert queries behind service methods, not inline ES queries) is the key mitigation — it bounds migration to changing the service implementation, not every callsite
  - **Monitor weekly**
- **Action:** Build on V1, monitor V2 progress weekly

---

### Enablers (Positive Dependencies)

| Item | Type | Affects | Benefit |
|------|------|---------|---------|
| [#256922](https://github.com/elastic/kibana/pull/256922) Cases Workflow Steps | Enabler | Task 2C (Case Enrichment) | Use `cases.addObservables`, `cases.findSimilarCases` steps |
| [#253245](https://github.com/elastic/kibana/pull/253245) One Workflow | Coordination | Task 3 (Dedup Steps) | Align step naming patterns |

**[#256922] Cases Workflow Steps - Detail:**

- **Affects:** Task 2C (Case Enrichment)
- **Benefit:** Use `cases.addObservables` and `cases.findSimilarCases` workflow steps
- **Fallback:** Call Cases server APIs directly from our pipeline code
- **Migration effort if fallback:** ~1 day
  - Replace direct API calls with workflow step invocations
  - The data format is the same — steps are just wrappers around the same server methods
- **Migration risk:** Low
  - Direct API calls work fine and won't break
  - Migrating to workflow steps is optional (better for composability, not correctness)

**[#253245] One Workflow Coordination - Detail:**

- **Affects:** Task 3 (Dedup Workflow Steps registration)
- **Action:** Align step naming and registration patterns early
- **Fallback:** Register steps independently; fix naming conflicts later
- **Migration effort if fallback:** ~0.5-1 day
  - Rename step IDs if conflicts are discovered
  - Consumers need updating only if they reference steps by string ID
- **Migration risk:** Low
  - Naming conflicts are rare and caught at registration time
  - The worst case is a rename

---

## Cross-Team Coordination

### Teams to Contact

| Team | Contact | Reason | When | Status |
|------|---------|--------|------|--------|
| Cases | @christineweng | Attachments V2 timeline (#256133) | Week 1 (ASAP) | ⏳ Pending |
| Cases | @janmonschke | Workflow triggers timeline (#257284), workflow steps (#256922) | Week 1 (ASAP) | ⏳ Pending |
| Cases | @michaelolo24 | Analytics indices (#257780) for case matching scale | Week 3 | ⏳ Pending |
| ResponseOps | @cnasikas | Alerting V2 roadmap and timeline (#247464) | Week 1 (monitoring) | ⏳ Pending |
| Entity Analytics | @abhishekbhatia1710 | Observation modules pattern (#256156) | Week 2 | ⏳ Pending |
| One Workflow | @KDKHD | Step naming alignment (#253245) | Week 2 | ⏳ Pending |

### Communication Plan

**Week 1 (Immediate):**
- [ ] Slack #kibana-cases: "Starting alert investigation pipeline spike (security-team#16339). Need Attachments V2 (#256133) and Workflow Triggers (#257284) timelines. Currently at decision point: use V1 API + custom hooks as fallback or wait for V2/triggers?"
- [ ] Meeting request: @christineweng (30 min) - Attachments V2 timeline confirmation
- [ ] Meeting request: @janmonschke (30 min) - Workflow triggers + steps timeline
- [ ] Slack #response-ops: "Monitoring Alerting V2 (#247464) for long-term pipeline impact. Building on V1 with abstraction layer for now. Any guidance on timeline?"
- [ ] Post in #security-solution-dev: "Alert investigation pipeline spike starting. Coordinates with Cases, ResponseOps, Entity Analytics. See security-team#16339 for details."

**Week 2:**
- [ ] **Decision point:** If Attachments V2 not merged, switch to V1 fallback (document migration plan)
- [ ] Sync with @abhishekbhatia1710 (async Slack) - Observation modules pattern review
- [ ] Sync with @KDKHD (async Slack) - Workflow step naming alignment

**Week 3:**
- [ ] Sync with @michaelolo24 (async Slack) - Cases analytics indices timeline for case matching
- [ ] Check Attachments V2 status - if merged, plan migration from fallback

**Week 5:**
- [ ] **Decision point:** If Workflow Triggers not ready, continue with custom hook (document migration plan)

---

## Risk Analysis

### 🔴 High Risks

**Risk 1: Attachments V2 timing uncertainty**
- **Probability:** 40%
- **Impact:** Delays Task 1C by 1-2 weeks OR requires V1 fallback implementation
- **Mitigation:** Build with V1 API as fallback, migrate to V2 when available (~2-3 days migration)
- **Decision point:** Week 1 - **start with V1 fallback**

**Risk 2: Workflow triggers not ready**
- **Probability:** 60%
- **Impact:** Task 2B uses suboptimal custom hook approach (couples to Cases internals)
- **Mitigation:** Build custom hook, refactor to triggers later (~3-5 days migration)
- **Decision point:** Week 5 - if not ready, use custom hook

---

### 🟡 Medium Risks

**Risk 3: Performance at scale (10K+ alerts/day)**
- **Probability:** 30%
- **Impact:** Slow processing, case matching timeouts, entity extraction bottlenecks
- **Mitigation:**
  - Week 3: Run performance benchmark with 10K synthetic alerts
  - Set SLA targets: < 5 min for 1K alerts, < 60 min for 10K alerts
  - Add SLA tracking dashboard (inspired by CrowdStrike's "1-10-60 rule")
  - Optimize case matching queries (use analytics indices when available)
  - Implement batch processing with configurable sizes
- **Fallback:** Reduce scope (high-severity alerts only, fewer entity types, higher dedup threshold)
- **Decision point:** Week 3 after benchmark

**Risk 4: Cases analytics indices delay affects case matching scale**
- **Probability:** 40%
- **Impact:** Case matching limited to ~10K cases max (SO API limitation)
- **Mitigation:** Build with abstraction layer, swap to ES queries when #257780 lands (~1-2 days)
- **Migration risk:** Low

---

### 🟢 Low Risks

**Risk 5: Alerting V2 requires major refactor**
- **Probability:** 15% (V2 behind feature flag, won't ship for 1-2 releases)
- **Impact:** If V2 ships soon, requires ~1-2 weeks migration effort
- **Mitigation:** Build on V1 with abstraction layer, monitor #response-ops weekly
- **Migration effort:** ~1-2 weeks (if V2 ships within spike timeline)

**Risk 6: Step naming conflicts with One Workflow**
- **Probability:** 10%
- **Impact:** Step registration failure, need to rename (~0.5-1 day)
- **Mitigation:** Align step naming early with @KDKHD, use namespaced IDs (`security.pipeline.dedup.*`)

---

## Current Spike State Assessment

| Component | Status | Completion | Gap |
|-----------|--------|------------|-----|
| Feature branch | ✅ Complete | 100% | `alert-investigation-pipeline-16339` |
| Backend API | ✅ Complete | 90% | 2 routes: `/_run`, `/case/{id}/_trigger_ad` |
| Processing logic | ✅ Complete | 90% | Dedup, entity extraction, case matching, incremental AD |
| UI components | ⚠️ Partial | 40% | Pipeline dashboard exists, needs verification |
| Unit tests | ✅ Complete | 70% | 10+ test files found |
| Scout E2E tests | ✅ Exists | 50% | 1 spec file, needs more scenarios |
| **Feature flag** | ❌ **MISSING** | **0%** | **CRITICAL GAP - MUST ADD** |
| Documentation | ⚠️ Partial | 60% | README updated, missing spike doc |
| **Demo scripts** | ❌ **MISSING** | **0%** | **GAP - auto-generate** |
| **Manual validation** | ❌ **MISSING** | **0%** | **GAP - auto-generate** |
| **Screenshots** | ❌ **MISSING** | **0%** | **GAP - capture during demo** |

**Overall completion: 60-70%**

---

## Implementation Plan & Timeline

```
Week  1-2:   ▓▓ Fill gaps: Feature flag, demo scripts, validation workflow
             ▓▓ Start with V1 Attachments API (don't wait)
             📞 Contact @christineweng, @janmonschke re: V2/triggers
             📞 Post coordination messages in Slack

Week  2-3:   ▓▓ Complete UI verification and enhancement
             ▓▓ Add missing E2E test scenarios
             ⚠️ **Performance benchmark (10K alerts)**
             📞 Contact @abhishekbhatia1710, @KDKHD

Week  3-4:   ▓▓ Bug fixes from QA
             ▓▓ Screenshot capture
             ▓▓ Documentation completion
             📞 Check @michaelolo24 re: analytics indices

Week  4-5:   ▓▓ Final validation and demo rehearsal
             ▓▓ PR polish and review
             📞 Decision: Workflow triggers fallback if needed
```

**Critical path:** Feature flag → Demo scripts → Manual validation → Screenshots → Final QA
**Parallel track:** Monitor blockers, coordinate with teams
**⚠️ Risk window (weeks 1-3):** If Attachments V2 slips, we're covered (using V1). If perf inadequate, adjust scope.

---

## Next Steps

**Immediate (this week):**
1. [ ] ✅ **Add feature flag** `elasticAssistant:alertInvestigationPipeline_enabled` (CRITICAL)
2. [ ] ✅ Generate demo scripts (setup, run, cleanup)
3. [ ] ✅ Generate manual validation workflow (10-step checklist)
4. [ ] Reach out to Cases team (@christineweng, @janmonschke) - Attachments V2 and Workflow Triggers timelines
5. [ ] Post coordination message in #security-solution-dev

**Week 2:**
6. [ ] Decision point: V1 fallback confirmed (if V2 not merged)
7. [ ] Verify and enhance UI components
8. [ ] Add missing E2E test scenarios
9. [ ] Coordinate with @abhishekbhatia1710, @KDKHD

**Week 3:**
10. [ ] **Performance benchmark (CRITICAL)**
11. [ ] Evaluate scale: adjust scope if performance inadequate
12. [ ] Capture screenshots during testing

**Week 4-5:**
13. [ ] Final QA and bug fixes
14. [ ] Documentation completion
15. [ ] Demo rehearsal
16. [ ] PR ready for merge

---

## Open Questions

1. [ ] Attachments V2 timeline from @christineweng? (Needed by week 2 for decision)
2. [ ] Workflow triggers readiness from @janmonschke? (Needed by week 5 for decision)
3. [ ] Performance targets: < 5 min for 1K alerts acceptable? (Confirm with stakeholders)
4. [ ] Cases analytics indices timeline? (Impacts case matching scale)
5. [ ] Alerting V2 timeline? (Monitor weekly, impacts long-term architecture)
6. [ ] Should we add SLA tracking dashboard (inspired by CrowdStrike's "1-10-60 rule")? (Recommendation: YES)

---

## Links

- **Main Epic:** [security-team#16339](https://github.com/elastic/security-team/issues/16339)
- **Current PR:** [kibana#257957](https://github.com/elastic/kibana/pull/257957)
- **Blockers:** [#256133](https://github.com/elastic/kibana/pull/256133), [#257284](https://github.com/elastic/kibana/pull/257284)
- **Related Issues:** [#16179](https://github.com/elastic/security-team/issues/16179), [#16184](https://github.com/elastic/security-team/issues/16184), [#16187](https://github.com/elastic/security-team/issues/16187), [#16181](https://github.com/elastic/security-team/issues/16181)
- **Competitive Analyses:** [Splunk](https://www.bitsioinc.com/blog-post/splunk-enterprise-security-8-2-ai-soc-automation), [CrowdStrike](https://www.crowdstrike.com/en-us/platform/endpoint-security/ai-powered-investigation/), [Sentinel](https://learn.microsoft.com/en-us/azure/sentinel/create-incidents-from-alerts)
