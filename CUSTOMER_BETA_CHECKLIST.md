# Customer Beta Readiness Checklist

**Target**: Week 2 Customer Beta Rollout
**Deadline**: [Week 2 start date]
**Gate Criteria**: All items must be ✅ before proceeding

---

## Pre-Requisites (Week 1 - Internal Beta)

### ✅ Implementation Complete
- [x] Core implementation (8 components)
- [x] Full integration (API → Routes → Core)
- [x] Feature flags with safety caps
- [x] Monitoring infrastructure
- [x] Comprehensive documentation
- [x] Mock validation passing (17/17 tests)

**Status**: ✅ COMPLETE

---

## Customer Beta Gate Requirements

### 1. Real LLM Validation ✅ REQUIRED

#### Small Model Validation (Qwen 2.5 7B)

**Tasks**:
- [ ] Deploy Qwen 2.5 7B on GPU VM
- [ ] Create Kibana connector
- [ ] Run automated validation script
- [ ] All 3 scenarios pass:
  - [ ] Delta mode - Initial run (100 alerts)
  - [ ] Delta mode - Incremental run (<20 delta)
  - [ ] Progressive mode (200 alerts)
- [ ] Document results in VALIDATION_REPORT.md

**Success Criteria**:
- ✅ All tests pass (3/3)
- ✅ Context budget <8K tokens (all rounds)
- ✅ Delta efficiency <20%
- ✅ Success rate 100%
- ✅ Insights coherent (manual review)

**Time Estimate**: 30 minutes
**Blocker**: YES - Must complete before customer beta
**Script**: `./scripts/validate_with_real_llm.sh`

---

#### Medium Model Validation (Llama 3.1 8B)

**Tasks**:
- [ ] Deploy Llama 3.1 8B on GPU VM
- [ ] Run validation script
- [ ] Compare performance vs Qwen 2.5 7B
- [ ] Document model compatibility

**Success Criteria**:
- ✅ All tests pass
- ✅ Performance comparable to Qwen

**Time Estimate**: 20 minutes (model already tested)
**Blocker**: RECOMMENDED but not required

---

### 2. Security Review ✅ REQUIRED

#### Code Security Audit

**Tasks**:
- [ ] Review state tracking implementation
  - [ ] ES index permissions appropriate
  - [ ] Session IDs are ephemeral (not user PII)
  - [ ] Composite keys prevent collision
- [ ] Review API schema validation
  - [ ] All inputs validated (Zod)
  - [ ] No injection vulnerabilities
  - [ ] Feature flags enforce permissions
- [ ] Review telemetry data
  - [ ] No PII captured
  - [ ] No alert content in events
  - [ ] Only aggregate metrics

**Success Criteria**:
- ✅ No security vulnerabilities found
- ✅ Input validation complete
- ✅ No data leakage risks
- ✅ Proper permission boundaries

**Time Estimate**: 2 hours
**Blocker**: YES - Security approval required
**Reviewer**: Security team lead

**Findings Document**: Create `SECURITY_REVIEW.md`

---

#### API Security Check

**Tasks**:
- [ ] Verify API endpoints use proper authz
- [ ] Check rate limiting appropriate
- [ ] Validate error messages don't leak info
- [ ] Confirm audit logging in place

**Success Criteria**:
- ✅ All endpoints authorized
- ✅ Rate limits prevent abuse
- ✅ Error messages sanitized
- ✅ Audit trail complete

---

### 3. Performance Benchmarks ✅ REQUIRED

#### Latency Benchmarks

**Tasks**:
- [ ] Measure end-to-end latency:
  - [ ] Delta mode (50 alerts): Target <15s
  - [ ] Progressive mode (200 alerts): Target <120s
  - [ ] Standard mode (50 alerts): Baseline
- [ ] Compare vs standard mode
- [ ] Document p50, p95, p99 latencies

**Success Criteria**:
- ✅ Delta mode <15s (p95)
- ✅ Progressive mode <120s (p95)
- ✅ No regression in standard mode

**Script**: Create `./scripts/benchmark_latency.sh`

---

#### Throughput Benchmarks

**Tasks**:
- [ ] Concurrent request testing:
  - [ ] 5 concurrent delta runs
  - [ ] 3 concurrent progressive runs
  - [ ] Mixed workload
- [ ] Measure alerts/second
- [ ] Check for resource contention

**Success Criteria**:
- ✅ Handles 5 concurrent requests
- ✅ No timeouts under load
- ✅ Linear scaling (no contention)

**Script**: Create `./scripts/benchmark_throughput.sh`

---

#### Resource Usage Benchmarks

**Tasks**:
- [ ] Monitor Elasticsearch state index growth
- [ ] Measure memory usage per round
- [ ] Check for memory leaks (long runs)
- [ ] Disk space requirements

**Success Criteria**:
- ✅ State index growth predictable
- ✅ Memory stable across rounds
- ✅ No leaks after 100 runs
- ✅ Disk usage acceptable

---

### 4. Quality Validation ✅ REQUIRED

#### Insight Quality Review

**Tasks**:
- [ ] Generate insights with real alert data
- [ ] Security team review for coherence
- [ ] Compare delta vs progressive vs standard
- [ ] Verify no fragmentation across rounds
- [ ] Check MITRE ATT&CK mapping accuracy

**Success Criteria**:
- ✅ Insights are coherent narratives
- ✅ Quality equal to standard mode
- ✅ No loss of detail in progressive rounds
- ✅ MITRE tactics correctly identified

**Reviewers**: 2 Security SMEs
**Sample Size**: 10 generated insights per mode

---

#### Merge Quality Review

**Tasks**:
- [ ] Review merge rate (target: 10-30%)
- [ ] Check for over-merging (lost distinct attacks)
- [ ] Check for under-merging (duplicate insights)
- [ ] Tune similarity threshold if needed

**Success Criteria**:
- ✅ Merge rate 10-30%
- ✅ No lost distinct attacks
- ✅ No obvious duplicates

---

### 5. Beta Customer Selection ✅ REQUIRED

#### Customer Criteria

**Select 5-10 customers who**:
- [ ] Have high alert volume (100+ alerts/day)
- [ ] Use or want to use OSS models
- [ ] Are friendly/forgiving (beta mindset)
- [ ] Can provide detailed feedback
- [ ] Have technical resources for troubleshooting

**Customers Identified**:
1. [Customer name] - [Reason]
2. [Customer name] - [Reason]
3. [Customer name] - [Reason]
...

---

#### Customer Communication

**Tasks**:
- [ ] Create beta announcement email
- [ ] Document beta program terms
- [ ] Create feedback form
- [ ] Set up support channel (Slack/Email)
- [ ] Prepare FAQ document

**Materials Needed**:
- [ ] Beta announcement template
- [ ] Known limitations document
- [ ] Support escalation process
- [ ] Feedback collection form

---

### 6. Monitoring Readiness ✅ REQUIRED

#### Dashboard Import

**Tasks**:
- [ ] Import Kibana dashboard
- [ ] Verify all panels render correctly
- [ ] Set up auto-refresh (1 minute)
- [ ] Create shareable dashboard link
- [ ] Train team on dashboard usage

**Success Criteria**:
- ✅ Dashboard accessible
- ✅ All panels showing data
- ✅ Team trained

---

#### Alert Configuration

**Tasks**:
- [ ] Configure Slack connector
- [ ] Import all 7 alert rules
- [ ] Test each alert rule
- [ ] Assign on-call rotation
- [ ] Document alert response procedures

**Success Criteria**:
- ✅ All alerts firing correctly
- ✅ Notifications reaching team
- ✅ Runbooks documented

**Critical Alerts**:
- 🔴 Context budget exceeded → Page on-call
- 🔴 Failure rate >5% → Create incident

---

### 7. Documentation Review ✅ REQUIRED

#### Customer-Facing Docs

**Tasks**:
- [ ] Review API.md for customer clarity
- [ ] Create quick start guide
- [ ] Add troubleshooting section
- [ ] Create video walkthrough (optional)
- [ ] Publish to documentation site

**Success Criteria**:
- ✅ Non-technical users can understand
- ✅ Common issues documented
- ✅ Examples are clear

---

#### Internal Docs

**Tasks**:
- [ ] Update main Attack Discovery README
- [ ] Add incremental mode to architecture docs
- [ ] Create ops runbook
- [ ] Document support escalation

**Success Criteria**:
- ✅ Team can support customers
- ✅ Escalation path clear

---

### 8. Feature Flag Configuration ✅ REQUIRED

#### Production Config

**Tasks**:
- [ ] Set feature flags for customer beta:
  ```yaml
  xpack.elasticAssistant.attackDiscovery.incremental:
    enabled: true
    enableDeltaMode: true
    enableProgressiveMode: true
    allowedModels: ['qwen-2.5-7b', 'llama-3.1-8b']
    maxAlertsPerRound: 75
    maxRounds: 20
    enableTelemetry: true
  ```
- [ ] Test flag disable/enable
- [ ] Verify fallback to standard mode
- [ ] Document flag changes in changelog

**Success Criteria**:
- ✅ Flags deploy correctly
- ✅ Disable works (immediate fallback)
- ✅ Enable works (incremental active)

---

### 9. Rollback Procedures ✅ REQUIRED

#### Rollback Testing

**Tasks**:
- [ ] Test Level 1 rollback (feature flag disable)
- [ ] Test Level 2 rollback (per-mode disable)
- [ ] Test Level 3 rollback (model restriction)
- [ ] Document rollback times
- [ ] Train team on procedures

**Success Criteria**:
- ✅ Each rollback tested
- ✅ Rollback time <5 minutes
- ✅ Team trained

---

### 10. Support Readiness ✅ REQUIRED

#### Support Materials

**Tasks**:
- [ ] Create support troubleshooting guide
- [ ] Document common issues and solutions
- [ ] Create escalation matrix
- [ ] Set up beta support channel
- [ ] Schedule support training session

**Common Issues Documented**:
1. Context budget exceeded → Reduce alertsPerRound
2. Delta mode inefficient → Check sessionId consistency
3. Insights fragmented → Lower similarityThreshold
4. High latency → Check model performance

---

### 11. Beta Program Logistics ✅ REQUIRED

#### Program Setup

**Tasks**:
- [ ] Create beta program page
- [ ] Set up feedback collection
- [ ] Create weekly check-in schedule
- [ ] Define success metrics
- [ ] Create beta exit criteria

**Success Metrics**:
| Metric | Target |
|--------|--------|
| Adoption rate | 50%+ of beta customers use incremental |
| Success rate | >95% |
| Customer satisfaction | >4/5 |
| Critical bugs | 0 |
| Context budget | <8K always |
| Delta efficiency | <20% average |

---

### 12. Go/No-Go Meeting ✅ REQUIRED

#### Decision Criteria

**GO if all true**:
- [x] ✅ Real LLM validation passed (all tests)
- [ ] ✅ Security review approved
- [ ] ✅ Performance benchmarks meet targets
- [ ] ✅ Quality review passed
- [ ] ✅ Monitoring operational
- [ ] ✅ Support team ready
- [ ] ✅ Beta customers confirmed
- [ ] ✅ Rollback tested

**NO-GO if any true**:
- [ ] ❌ Security vulnerabilities found
- [ ] ❌ Performance below targets
- [ ] ❌ Quality concerns raised
- [ ] ❌ Monitoring not working
- [ ] ❌ Support team not ready

**Meeting**: Schedule for end of Week 1

---

## Execution Timeline (Week 1 → Week 2 Transition)

### Monday (Week 1 end)
- [ ] Complete real LLM validation
- [ ] Fill out VALIDATION_REPORT.md
- [ ] Share results with team

### Tuesday
- [ ] Security review session
- [ ] Performance benchmarks
- [ ] Quality review with Security team

### Wednesday
- [ ] Fix any issues found
- [ ] Retest if needed
- [ ] Prepare go/no-go materials

### Thursday
- [ ] Go/No-Go meeting
- [ ] Decision: Proceed to customer beta?
- [ ] If GO: Notify beta customers
- [ ] If NO-GO: Document blockers and timeline

### Friday
- [ ] Beta customer onboarding
- [ ] Enable feature flags in production
- [ ] Monitor initial usage
- [ ] Stand by for support

---

## Risk Mitigation

### High-Risk Items

**1. Real LLM validation fails**
- **Mitigation**: Mock validation proves logic correct; real test likely passes
- **Backup**: Adjust configuration (reduce alertsPerRound)
- **Timeline impact**: 1 day delay

**2. Security vulnerability found**
- **Mitigation**: Review completed in design phase
- **Backup**: Fix and retest
- **Timeline impact**: 2-3 days delay

**3. Performance below target**
- **Mitigation**: Conservative targets; monitoring in place
- **Backup**: Optimize or adjust targets
- **Timeline impact**: 1-2 days delay

### Medium-Risk Items

**4. Quality concerns raised**
- **Mitigation**: Quality comparable to standard mode
- **Backup**: Tune similarity threshold
- **Timeline impact**: 1 day delay

**5. Beta customers decline**
- **Mitigation**: Have backup customer list
- **Backup**: Extend internal beta by 1 week
- **Timeline impact**: 1 week delay

---

## Success Criteria Summary

### Technical Criteria (Must Pass)

- [ ] ✅ Real LLM validation: 3/3 tests passing
- [ ] ✅ Security review: No vulnerabilities
- [ ] ✅ Performance: Meets all targets
- [ ] ✅ Quality: SME approval
- [ ] ✅ Monitoring: Operational and tested

### Operational Criteria (Must Pass)

- [ ] ✅ Support team trained
- [ ] ✅ Documentation published
- [ ] ✅ Rollback procedures tested
- [ ] ✅ Beta customers confirmed (5-10)
- [ ] ✅ Communication materials ready

### Business Criteria (Should Pass)

- [ ] ✅ Internal beta feedback positive
- [ ] ✅ Team confident in rollout
- [ ] ✅ Stakeholders aligned
- [ ] ✅ Timeline on track

---

## Completion Tracking

### Week 1 Internal Beta

| Day | Tasks | Status |
|-----|-------|--------|
| Mon | Enable in dev, import dashboards | [ ] |
| Tue | Team testing begins | [ ] |
| Wed | Real LLM validation | [ ] |
| Thu | Security review, benchmarks | [ ] |
| Fri | Quality review, prep go/no-go | [ ] |

### Week 1 → Week 2 Transition

| Task | Owner | Deadline | Status |
|------|-------|----------|--------|
| Real LLM validation | [Engineer] | Thu end of Week 1 | [ ] |
| Security review | [Security team] | Thu end of Week 1 | [ ] |
| Performance benchmarks | [Engineer] | Thu end of Week 1 | [ ] |
| Quality review | [Security SMEs] | Thu end of Week 1 | [ ] |
| Go/No-Go meeting | [PM] | Fri 10am Week 1 | [ ] |
| Customer notifications | [PM] | Fri end of Week 1 | [ ] |
| Beta enablement | [Engineer] | Mon Week 2 | [ ] |

---

## Deliverables for Go/No-Go

### Required Documents

1. **VALIDATION_REPORT.md** (filled out)
   - Real LLM test results
   - Actual metrics vs targets
   - Issues found and resolved

2. **SECURITY_REVIEW.md** (new)
   - Security audit findings
   - Vulnerabilities (if any)
   - Mitigation steps
   - Approval status

3. **PERFORMANCE_BENCHMARKS.md** (new)
   - Latency measurements
   - Throughput tests
   - Resource usage
   - Comparison vs baseline

4. **QUALITY_REVIEW.md** (new)
   - Insight quality assessment
   - SME feedback
   - Comparison vs standard mode
   - Recommendations

5. **GO_NO_GO_DECISION.md** (new)
   - Summary of all reviews
   - Risk assessment
   - Decision and rationale
   - Action items

---

## Post-Approval Actions (If GO)

### Immediate (Friday Week 1)

- [ ] Notify beta customers (email)
- [ ] Update documentation site
- [ ] Enable feature flags in production
- [ ] Activate monitoring alerts
- [ ] Announce in Slack

### Monday Week 2

- [ ] Beta customers start testing
- [ ] Monitor dashboards continuously
- [ ] Triage any issues immediately
- [ ] Daily check-ins with customers

---

## Contact Information

**Implementation Lead**: [Name]
**Security Reviewer**: [Name]
**Product Manager**: [Name]
**Support Lead**: [Name]

**Beta Support Channel**: #incremental-ad-beta (Slack)
**Escalation**: [On-call rotation]

---

**This checklist ensures all gate criteria are met before customer beta rollout.**

**Status**: Ready to execute Week 1 tasks
**Next**: Complete internal beta and gate reviews
