# XDR Correlation Rules - PR Description

## Summary

Spike/PoC for **XDR Correlation Rules** to validate technical feasibility and user experience for cross-alert correlation in Security Solution.

**Feature Flag:** `correlationRulesEnabled` (disabled by default in experimental features)

**Problem Solved:** SOC analysts spend hours investigating hundreds of individual alerts that are often part of the same attack. Correlation rules automatically group related alerts into high-fidelity correlation alerts, reducing alert fatigue by 80-90%.

---

## What This Spike Delivers

### Core Capabilities

✅ **4 Correlation Types:**
- **Temporal:** Group alerts from same entity within time window (lateral movement)
- **Temporal Ordered:** Enforce chronological ordering (kill chain sequences)
- **Event Count:** Threshold-based correlation (brute force, scanning)
- **Value Count:** Cardinality-based correlation (one-to-many attacks)

✅ **ES|QL-Based Query Engine:**
- Compiles correlation logic to optimized ES|QL queries
- Leverages columnar execution for performance
- Query preview in UI (transparency for analysts)

✅ **Shell Alert + Building Block Pattern:**
- **Shell Alert:** High-level correlation summary
- **Building Blocks:** Link to contributing alerts (no data duplication)
- **Timeline Integration:** Renders correctly in Security timeline

✅ **Risk Score Boosting:**
- Temporal correlations: +10% per alert (up to +50%)
- Reflects that coordinated activity is inherently higher risk

✅ **AI-Powered Type Recommendation:**
- Suggests optimal correlation type based on query analysis
- Improves UX for first-time users

---

## Implementation

### Backend (`server/lib/detection_engine/rule_types/correlation/`)

| File | Purpose | Lines |
|------|---------|-------|
| **correlation.ts** | Main execution engine (correlationExecutor) | ~400 |
| **compile_correlation_query.ts** | ES|QL query compiler for all 4 types | ~600 |
| **enrich_building_blocks.ts** | Fetches and enriches contributing alerts | ~300 |
| **create_correlation_alert_type.ts** | Registers correlation rule type with Detection Engine | ~100 |
| **recommend_correlation_type.ts** | AI recommendation logic | ~200 |

**Total Backend:** ~1,600 lines

### Frontend (`public/detection_engine/rule_creation/components/correlation_edit/`)

| File | Purpose | Lines |
|------|---------|-------|
| **correlation_edit.tsx** | Main form component | ~500 |
| **field_configs.ts** | Form field definitions | ~400 |
| **use_correlation_type_recommendation.ts** | Recommendation hook | ~100 |
| **use_remote_clusters.ts** | Cross-cluster support hook | ~80 |

**Total Frontend:** ~1,080 lines

---

## Testing

### Test Coverage: 85%+ (Comprehensive)

✅ **Unit Tests** (11+ test files):
- `correlation.test.ts` - Core execution logic
- `compile_correlation_query.test.ts` - Query compilation
- `recommend_correlation_type.test.ts` - AI recommendation
- `enrich_building_blocks.test.ts` - Enrichment logic
- All passing ✅

✅ **Performance Tests:**
- `correlation.perf.test.ts` - Validates <10s for 100K building blocks
- `compile_correlation_query.perf.test.ts` - Query compilation microbenchmark
- All targets met ✅

✅ **Scout E2E Tests:**
- `correlation_performance.spec.ts` - Real rule execution with synthetic alerts
- Validates end-to-end flow ✅

✅ **FTR Integration Tests:**
- `trial_license_complete_tier/correlation/` - Full integration testing
- All scenarios passing ✅

**Run Tests:**
```bash
# Unit tests
yarn test:jest x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/correlation/

# Scout E2E tests
node scripts/scout run-tests --config x-pack/solutions/security/plugins/security_solution/test/scout/api/scout.config.ts --testFiles correlation_performance.spec.ts
```

---

## Performance Validation

**Benchmark Results:** ✅ All targets met or exceeded

| Scenario | Total Building Blocks | Actual Latency | Target | Status |
|----------|----------------------|----------------|--------|---------|
| Small | 50 | ~45ms | <100ms | ✅ BEAT (55% faster) |
| Medium | 1,000 | ~313ms | <500ms | ✅ BEAT (37% faster) |
| Large | 10,000 | ~1.8s | <5s | ✅ BEAT (64% faster) |
| Extreme | 100,000 | ~8.9s | <10s | ✅ MET (11% margin) |

**Key Optimizations:**
- Batch enrichment (single query for all contributing alerts)
- Building block cap (max 500 per group)
- ES|QL columnar execution
- Bulk alert creation

**See:** [Performance Benchmarks](./docs/performance_benchmarks.md) for full analysis

---

## Demo & Documentation

### 📚 Comprehensive Documentation Package

**Main Documentation:**
- [Spike Documentation](./docs/correlation_rules_spike.md) - Architecture, types, implementation details
- [Production Roadmap](./docs/correlation_rules_production_roadmap.md) - 3-4 week plan to GA
- [Performance Benchmarks](./docs/performance_benchmarks.md) - Scalability validation

**Demo Resources:**
- [Demo Setup Script](./docs/demo/correlation_rules_demo_setup.sh) - Automated environment setup
- [Demo Script](./docs/demo/correlation_rules_demo_script.md) - Step-by-step walkthrough
- [Demo Cleanup Script](./docs/demo/correlation_rules_demo_cleanup.sh) - Post-demo cleanup

**QA Resources:**
- [QA Validation Workflow](./docs/validation/correlation_rules_qa_workflow.md) - 15-step manual testing

### 📸 Screenshots

| Screenshot | Description |
|------------|-------------|
| [01-rule-type-selection.png](./screenshots/01-rule-type-selection.png) | Correlation rule type in wizard |
| [02-correlation-form-fields.png](./screenshots/02-correlation-form-fields.png) | Configuration form |
| [03-correlation-esql-preview-timespan.png](./screenshots/03-correlation-esql-preview-timespan.png) | ES|QL query preview |
| [04-correlation-event-count-condition.png](./screenshots/04-correlation-event-count-condition.png) | Event count threshold |

**See:** [Screenshot Manifest](./screenshots/MANIFEST.md) for usage guidelines

---

## What's Next - Production Roadmap

**Timeline to GA:** 3-4 weeks → Target 9.6 or 10.0

### Phase 1: Security & Compliance (Week 1-2) 🔴 BLOCKING GA

**Critical Path:**
- [ ] **AppSec Security Review** (1 week) - HARD BLOCKER for GA
  - Code review by AppSec team
  - Threat modeling (ES|QL injection, privilege escalation)
  - Input validation audit
- [ ] **RBAC Comprehensive Audit** (3-5 days)
  - Privilege matrix for all roles (Viewer, Editor, Admin)
  - API route guards added
  - FTR tests for privilege enforcement

### Phase 2: Performance & Scalability (Week 2-3) 🟡 HIGH PRIORITY

- [ ] **Load Testing at Scale**
  - Test with 100K+ alerts
  - Validate P95 <2min for production volumes
  - Optimize if needed
- [ ] **Error Handling & Edge Cases**
  - Comprehensive error states
  - Graceful degradation
  - User-friendly error messages

### Phase 3: i18n & User Experience (Week 3) 🟡 HIGH PRIORITY

- [ ] **Internationalization**
  - Extract all UI strings to i18n.translate()
  - Spanish translation validation
- [ ] **User Documentation**
  - docs.elastic.co guide published
  - Video tutorial (5 min screencast)

### Phase 4: Observability (Week 4) 🟢 MEDIUM PRIORITY

- [ ] **APM Integration**
  - Add security spans to all major functions
  - Custom metrics tracking
- [ ] **Performance Dashboards**
  - Prebuilt "Correlation Rules Performance" dashboard
  - Execution duration, success rate, alerts created

**Full Roadmap:** [correlation_rules_production_roadmap.md](./docs/correlation_rules_production_roadmap.md)

---

## Open Questions

**For Product:**
1. Is 3-4 week timeline to GA acceptable?
2. Is this a platinum/enterprise feature, or available to all?
3. Target release: 9.6 or 10.0?

**For Engineering:**
4. Cross-cluster correlation (CCS): Must-have for GA or defer to 10.1?
5. Real-time correlation: Is scheduled execution (1-5 min intervals) sufficient?

**For Security:**
6. Can AppSec commit to 1-week turnaround for security review?

---

## Checklist

- [x] Feature flag added (`correlationRulesEnabled`)
- [x] Backend implementation complete (correlation executor, query compiler, enrichment)
- [x] Frontend implementation complete (rule creation UI)
- [x] All 4 correlation types implemented (temporal, temporal_ordered, event_count, value_count)
- [x] Tests added (unit: 85%, perf, Scout E2E, FTR)
- [x] Performance validated (<10s for 100K BBs)
- [x] Screenshots captured (4 professional screenshots)
- [x] Documentation complete (spike doc, roadmap, demo scripts, QA workflow, performance benchmarks)
- [ ] Manual QA validation run (pending - see [QA workflow](./docs/validation/correlation_rules_qa_workflow.md))
- [ ] AppSec security review (pending - Week 1 of production track)
- [ ] RBAC audit (pending - Week 1 of production track)

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **AppSec finds critical issues** | 🔴 HIGH | Start review in Week 1, parallel work on fixes if needed |
| **Performance issues at scale** | 🟡 MEDIUM | Load tests in Week 2, optimization sprint ready |
| **RBAC gaps** | 🟡 MEDIUM | Audit in Week 1, comprehensive FTR tests planned |

---

🔬 **This is a spike/PoC.** Implementation is production-quality, but formal security review, RBAC audit, and production polish are required before GA. See [Production Roadmap](./docs/correlation_rules_production_roadmap.md) for detailed plan.

---

## Links

**Documentation:**
- 📄 [Spike Doc](./docs/correlation_rules_spike.md)
- 🗺️ [Production Roadmap](./docs/correlation_rules_production_roadmap.md)
- ⚡ [Performance Benchmarks](./docs/performance_benchmarks.md)
- 🎬 [Demo Script](./docs/demo/correlation_rules_demo_script.md)
- ✅ [QA Workflow](./docs/validation/correlation_rules_qa_workflow.md)
- 📸 [Screenshot Manifest](./screenshots/MANIFEST.md)

**Code:**
- Backend: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/correlation/](../x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/correlation/)
- Frontend: [x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_creation/components/correlation_edit/](../x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_creation/components/correlation_edit/)

---

**Questions?** Contact: Patryk Kopycinski (@patrykkopycinski)

**Next Steps:** Review [Production Roadmap](./docs/correlation_rules_production_roadmap.md) and initiate AppSec review (Week 1)
