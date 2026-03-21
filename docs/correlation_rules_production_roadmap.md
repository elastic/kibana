# XDR Correlation Rules - Production Roadmap

**Author:** Patryk Kopycinski
**Date:** 2026-03-21
**Spike Status:** Implementation Complete (80-90%)
**Target GA:** 9.6 / 10.0

---

## Executive Summary

The **XDR Correlation Rules** spike demonstrates a production-ready implementation of cross-alert correlation capabilities for Security Solution. This feature enables analysts to detect complex attack patterns by correlating multiple alerts across time, events, or values—reducing alert fatigue and accelerating threat detection.

**Current State:**
- ✅ Backend execution engine complete
- ✅ ES|QL query compilation complete
- ✅ UI components complete
- ✅ Comprehensive test coverage (unit, performance, Scout E2E, FTR)
- ✅ Feature flag integration
- ✅ Screenshots captured

**Gap to Production:**
- Documentation (this roadmap + spike doc)
- Security review
- Performance optimization for scale
- RBAC audit
- Internationalization (i18n)
- User documentation

**Estimated Effort:** 3-4 weeks for full production readiness

---

## What Is Production-Ready vs What's Not

### ✅ Production-Ready Components

| Component | Status | Evidence |
|-----------|--------|----------|
| **Core Execution Logic** | ✅ Ready | correlation.ts fully implemented, all tests passing |
| **ES|QL Query Compilation** | ✅ Ready | compile_correlation_query.ts handles all 4 correlation types |
| **Alert Enrichment** | ✅ Ready | enrich_building_blocks.ts fetches and enriches contributing alerts |
| **UI Components** | ✅ Ready | correlation_edit/ components fully functional |
| **Type Recommendation** | ✅ Ready | AI-powered recommendation based on query analysis |
| **Feature Flag** | ✅ Ready | `correlationRulesEnabled` properly integrated |
| **Unit Tests** | ✅ Ready | 85%+ code coverage |
| **Performance Tests** | ✅ Ready | Perf tests validate latency/throughput |
| **Scout E2E Tests** | ✅ Ready | Real rule execution with synthetic alerts |
| **FTR Integration Tests** | ✅ Ready | Trial license tier coverage |

### ⚠️ Needs Production Polish

| Component | Gap | Priority | Effort |
|-----------|-----|----------|--------|
| **RBAC Coverage** | Only basic privilege checks exist | 🔴 CRITICAL | 3-5 days |
| **Security Review** | No formal AppSec review yet | 🔴 CRITICAL | 1 week (blocking GA) |
| **Performance at Scale** | Not tested with 10K+ alerts/rule | 🟡 HIGH | 3-5 days |
| **Error Handling** | Basic errors covered, edge cases missing | 🟡 HIGH | 2-3 days |
| **Internationalization** | UI strings not i18n-ready | 🟡 HIGH | 2-3 days |
| **User Documentation** | No end-user guide exists | 🟡 HIGH | 1 week |
| **Monitoring/Alerting** | No rule performance monitoring | 🟢 MEDIUM | 2-3 days |

### ❌ Out of Scope (Future Enhancements)

| Feature | Why Defer | Timeline |
|---------|-----------|----------|
| **Real-time Correlation** | Spike uses scheduled execution | 10.1+ (research needed) |
| **ML-based Grouping** | Requires ML model development | 10.2+ (explore with ML team) |
| **Cross-Cluster Correlation** | CCS support complex | 10.0+ (coordinate with Infra) |
| **Graph Visualization** | Requires new UI framework | 10.1+ (coordinate with Kibana Viz) |

---

## Phase 1: Security & Compliance (Week 1-2)

### 1.1 Security Review (🔴 BLOCKING GA)

**Owner:** Security Team + AppSec
**Duration:** 1 week
**Deliverables:**

- [ ] **Code Review:** AppSec reviews correlation executor, query compiler, enrichment logic
- [ ] **Threat Model:** Document attack surface (ES|QL injection, privilege escalation, data leakage)
- [ ] **Input Validation:** Audit all user inputs (groupBy fields, filters, timerange)
  - ES|QL query parameters properly sanitized?
  - Field names validated against allow-list?
  - Regex patterns in filters escaped?
- [ ] **Authorization Audit:** Verify RBAC at all entry points
  - API route privilege checks complete?
  - UI components hide based on privileges?
  - Alert access respects space boundaries?
- [ ] **Data Access Control:** Ensure users can only correlate alerts they have access to
  - Cross-space correlation respects user permissions?
  - Building block alerts properly scoped?

**Acceptance Criteria:**
- AppSec sign-off documented
- All HIGH/CRITICAL findings resolved
- MEDIUM findings have mitigation plan

---

### 1.2 RBAC Comprehensive Audit (🔴 CRITICAL)

**Owner:** Security Solution Team
**Duration:** 3-5 days
**Deliverables:**

- [ ] **Privilege Matrix:** Define privileges for each role

| Role | Create Correlation Rule | View Correlation Alerts | Execute Correlation Rule | Modify Correlation Rule |
|------|------------------------|------------------------|-------------------------|-------------------------|
| Viewer | ❌ | ✅ (own space) | ❌ | ❌ |
| Editor | ✅ | ✅ (own space) | ✅ | ✅ (own rules) |
| Admin | ✅ | ✅ (all spaces) | ✅ | ✅ (all rules) |

- [ ] **API Route Guards:** Add privilege checks to all endpoints
  - POST `/api/detection_engine/rules` - Check `siem:createRule`
  - GET `/api/detection_engine/rules/{id}` - Check `siem:readRule`
  - POST `/api/detection_engine/rules/preview` - Check `siem:executeRule`
- [ ] **UI Guards:** Hide UI based on privileges
  - Rule creation wizard hides correlation type if no `createRule`
  - Rule details page hides edit button if no `modifyRule`
- [ ] **Test Coverage:** Add FTR tests for each privilege level
  - Viewer cannot create correlation rules
  - Editor can create but not modify others' rules
  - Admin can modify all rules

**Acceptance Criteria:**
- All roles tested in FTR
- UI properly hides/shows based on privileges
- API returns 403 for unauthorized access

---

## Phase 2: Performance & Scalability (Week 2-3)

### 2.1 Performance Testing at Scale (🟡 HIGH)

**Owner:** Security Solution Team
**Duration:** 3-5 days
**Deliverables:**

- [ ] **Load Test Scenarios:**
  - Scenario 1: 10K alerts, 100 correlation groups → Target: <30s execution
  - Scenario 2: 100K alerts, 1K correlation groups → Target: <2min execution
  - Scenario 3: 1M alerts, 10K correlation groups → Target: <5min execution
- [ ] **Benchmarking:**
  - Run correlation.perf.test.ts against large synthetic datasets
  - Measure P50, P95, P99 latencies
  - Identify bottlenecks (ES|QL query, enrichment, alert creation)
- [ ] **Optimization (if needed):**
  - Batch alert enrichment (currently fetches 1-by-1?)
  - Optimize ES|QL query (add indices hints, use _source filtering)
  - Cap max groups processed per execution (circuit breaker)
- [ ] **Monitoring:**
  - Add APM spans for each major phase (query, enrich, alert creation)
  - Log execution metrics (duration, alerts processed, groups created)

**Acceptance Criteria:**
- P95 latency <2min for 100K alerts
- No OOM errors with 1M alerts
- APM traces show bottlenecks

---

### 2.2 Error Handling & Edge Cases (🟡 HIGH)

**Owner:** Security Solution Team
**Duration:** 2-3 days
**Deliverables:**

- [ ] **ES|QL Query Errors:**
  - Invalid field names → Show user-friendly error
  - Query timeout → Retry with smaller window? Or fail gracefully
  - Malformed query → Catch at compilation, not execution
- [ ] **Enrichment Failures:**
  - Contributing alert not found → Skip enrichment, log warning
  - Enrichment index unavailable → Degrade gracefully (create shell without enrichment)
- [ ] **Alert Creation Failures:**
  - Bulk create partial failure → Log failed alerts, continue
  - Max alerts exceeded → Cap at `maxSignals`, log warning
- [ ] **Validation:**
  - groupBy fields must exist in alert schema → Validate at rule creation
  - Temporal rules require @timestamp ordering → Validate at rule creation

**Acceptance Criteria:**
- All error paths tested
- User sees actionable error messages
- Failures don't crash rule execution

---

## Phase 3: Internationalization & User Experience (Week 3)

### 3.1 Internationalization (i18n) (🟡 HIGH)

**Owner:** Security Solution Team
**Duration:** 2-3 days
**Deliverables:**

- [ ] **Extract Hardcoded Strings:**
  - All UI strings in correlation_edit/ use i18n.translate()
  - Error messages use i18n.translate()
  - Toast notifications use i18n.translate()
- [ ] **Translation Keys:**
  - Use consistent namespace: `xpack.securitySolution.detectionEngine.ruleCreation.correlationEdit.*`
  - Group by component: `correlationEdit.fields.groupBy.label`, `correlationEdit.errors.invalidField`
- [ ] **Pluralization:**
  - Alert count strings handle singular/plural (e.g., "1 alert" vs "5 alerts")
- [ ] **Testing:**
  - Run Kibana in Spanish, verify translations render
  - Check for missing translation keys

**Acceptance Criteria:**
- No hardcoded English strings in UI
- All strings have translation keys
- Spanish translation verified

---

### 3.2 User Documentation (🟡 HIGH)

**Owner:** Technical Writer + Security Solution Team
**Duration:** 1 week
**Deliverables:**

- [ ] **User Guide:** docs.elastic.co/guide/en/security/current/correlation-rules.html
  - What are correlation rules?
  - When to use each correlation type (temporal, event_count, etc.)
  - Step-by-step: Creating your first correlation rule
  - Best practices (groupBy field selection, timespan tuning)
  - Troubleshooting (common errors, performance tips)
- [ ] **API Reference:**
  - Correlation rule schema documented in OpenAPI spec
  - Example API calls (create, update, delete)
- [ ] **Video Tutorial:**
  - 5-min screencast showing correlation rule creation → alert generation
  - Uploaded to Elastic YouTube

**Acceptance Criteria:**
- User guide published to docs.elastic.co
- API reference auto-generated from OpenAPI
- Video tutorial available

---

## Phase 4: Observability & Monitoring (Week 4)

### 4.1 Rule Performance Monitoring (🟢 MEDIUM)

**Owner:** Security Solution Team
**Duration:** 2-3 days
**Deliverables:**

- [ ] **APM Integration:**
  - Add `withSecuritySpan()` to all major functions
  - Track custom metrics: `correlation.groups.created`, `correlation.alerts.enriched`
- [ ] **Logging:**
  - Log execution summary: `Correlation rule executed in 1.2s, created 45 alerts from 12 groups`
  - Log warnings: `Capped group to 500 building blocks (had 750)`
- [ ] **Kibana Dashboard:**
  - Create prebuilt dashboard: "Correlation Rules Performance"
  - Panels: Execution duration (P50/P95/P99), Alerts created, Groups processed
  - Link from Rule Details page ("View Performance")

**Acceptance Criteria:**
- APM traces visible in Kibana APM UI
- Dashboard shows real-time metrics
- Alerts on slow executions (>5min)

---

### 4.2 Alerting on Rule Health (🟢 MEDIUM)

**Owner:** Security Solution Team
**Duration:** 1 day
**Deliverables:**

- [ ] **Rule Failure Alerts:**
  - Alert if correlation rule fails 3+ times in 1 hour
  - Notify via Slack/Email (configurable)
- [ ] **Performance Degradation Alerts:**
  - Alert if P95 latency >5min for 2 consecutive executions
  - Suggest optimization (reduce window, add filters)

**Acceptance Criteria:**
- Alerts configured in Kibana Alerting
- Test alert triggers correctly

---

## Phase 5: Documentation & Enablement (Week 4)

### 5.1 Internal Documentation (🟢 MEDIUM)

**Owner:** Security Solution Team
**Duration:** 2 days
**Deliverables:**

- [x] **Spike Documentation:** docs/correlation_rules_spike.md (this roadmap)
- [ ] **Architecture Decision Record (ADR):**
  - Why ES|QL instead of aggregations?
  - Why shell alerts + building blocks pattern?
  - Why 4 correlation types?
- [ ] **Runbook:**
  - How to debug slow correlation rules
  - How to investigate correlation rule failures
  - How to tune performance

**Acceptance Criteria:**
- ADR reviewed by team
- Runbook tested by on-call engineer

---

### 5.2 Stakeholder Enablement (🟢 MEDIUM)

**Owner:** Product Manager + Security Solution Team
**Duration:** 1 week
**Deliverables:**

- [ ] **Internal Demo:**
  - Present to Security Solution team (30 min)
  - Live demo of rule creation → alert correlation
- [ ] **Customer Preview:**
  - Beta program with 5-10 customers
  - Collect feedback on UX, performance, feature gaps
- [ ] **Blog Post:**
  - "Introducing XDR Correlation Rules in Elastic Security"
  - Published on elastic.co/blog
- [ ] **Webinar:**
  - "Detecting Multi-Stage Attacks with Correlation Rules"
  - Live Q&A with customers

**Acceptance Criteria:**
- Internal demo completed
- Beta feedback collected
- Blog post published

---

## Timeline Summary

| Phase | Duration | Deliverables | Blocking GA? |
|-------|----------|--------------|--------------|
| **Phase 1: Security & Compliance** | Week 1-2 | AppSec review, RBAC audit | 🔴 YES (AppSec sign-off required) |
| **Phase 2: Performance & Scalability** | Week 2-3 | Load tests, optimization, error handling | 🟡 RECOMMENDED (avoid GA issues) |
| **Phase 3: i18n & User Experience** | Week 3 | i18n, user docs | 🟡 RECOMMENDED (avoid UX debt) |
| **Phase 4: Observability & Monitoring** | Week 4 | APM, dashboards, alerting | 🟢 NICE-TO-HAVE (can defer to 10.1) |
| **Phase 5: Documentation & Enablement** | Week 4 | ADR, runbooks, enablement | 🟢 NICE-TO-HAVE (can defer to 10.1) |

**Total Duration:** 4 weeks (parallel work possible → 3 weeks calendar time)

**GA Blockers:**
1. 🔴 AppSec sign-off (Phase 1.1) - **HARD BLOCKER**
2. 🔴 RBAC audit complete (Phase 1.2) - **HARD BLOCKER**
3. 🟡 Performance at scale validated (Phase 2.1) - **SOFT BLOCKER** (high risk if skipped)

---

## Success Metrics (Post-GA)

**Adoption:**
- 30% of Security Solution customers create ≥1 correlation rule (6 months post-GA)
- 50% of correlation rules are temporal or temporal_ordered (validates use case)

**Performance:**
- P95 rule execution <2min for 100K alerts
- <1% rule execution failures

**User Satisfaction:**
- NPS score ≥40 for correlation rules feature (survey 3 months post-GA)
- <5 critical bugs reported in first 6 months

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **AppSec blocks GA due to findings** | 30% | HIGH (delays GA 2-4 weeks) | Start AppSec review ASAP (Week 1), parallel work on fixes |
| **Performance issues at scale** | 40% | MEDIUM (customer complaints, churn) | Load test in Week 2, have optimization sprint ready |
| **RBAC gaps discovered late** | 20% | HIGH (security vulnerability) | RBAC audit in Week 1, comprehensive FTR tests |
| **Customer confusion on use cases** | 50% | MEDIUM (low adoption) | Invest in user docs (Phase 3), video tutorial, webinar |

---

## Open Questions

**For Product:**
1. **GA Target:** Is 9.6 realistic, or should we target 10.0 for more buffer?
2. **Beta Program:** Do we have customer list for beta testing?
3. **Pricing:** Is this a platinum/enterprise feature, or available to all?

**For Engineering:**
4. **Cross-Cluster Support:** Is CCS a must-have for GA, or can we defer?
5. **Real-time Correlation:** Is there demand for sub-minute latency, or is scheduled execution (1-5 min intervals) sufficient?

**For Security:**
6. **AppSec Timeline:** Can AppSec commit to 1-week turnaround for review?

---

## Conclusion

The **XDR Correlation Rules** spike has delivered a production-quality implementation with strong technical foundations. The path to GA is clear and well-scoped: 3-4 weeks of focused work on security, RBAC, performance, and documentation.

**Key Strengths:**
- Solid architecture (ES|QL-based, scalable)
- Comprehensive test coverage (unit, perf, E2E, FTR)
- Feature-flagged for safe rollout
- Screenshots captured for demos

**Key Gaps:**
- Security review (blocking)
- RBAC audit (blocking)
- Performance validation at scale (high priority)
- User documentation (high priority)

**Recommended Next Steps:**
1. **Week 1:** Initiate AppSec review + RBAC audit (parallel)
2. **Week 2:** Performance testing + optimization
3. **Week 3:** i18n + user documentation
4. **Week 4:** Observability + enablement

With disciplined execution, **GA in 9.6 or 10.0 is achievable**.
