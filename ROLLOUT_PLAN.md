# Incremental Attack Discovery Rollout Plan

**Feature**: Incremental Attack Discovery (Delta + Progressive Modes)
**Target Release**: [Version TBD]
**Rollout Duration**: 4 weeks
**Risk Level**: Low (opt-in, backward compatible)

---

## Executive Summary

Gradual rollout of incremental Attack Discovery capability enabling small-context models (8K-32K) through bounded round processing. Feature is opt-in via API parameters with comprehensive monitoring and rollback capabilities.

**Success Criteria**:
- Context budget: <8K tokens per round (100% of runs)
- Delta efficiency: <20% reprocessing (85%+ of delta runs)
- Success rate: >95% (all modes)
- Zero production incidents

---

## Rollout Phases

### Phase 0: Pre-Rollout (Week -1)
**Duration**: 1 week
**Goal**: Validate and prepare

**Tasks**:
- [x] Complete implementation (✅ Done)
- [x] All tests passing (✅ 17/17)
- [x] Documentation complete (✅ 2000+ lines)
- [ ] Run validation with Qwen 2.5 7B
- [ ] Run validation with Llama 3.1 8B
- [ ] Performance benchmarks complete
- [ ] Security review complete
- [ ] Import monitoring dashboards
- [ ] Configure alert rules
- [ ] Smoke test in dev environment

**Exit Criteria**:
- ✅ 100% test coverage passing
- ✅ Validation report approved
- ✅ Monitoring operational
- ✅ Rollback plan tested

---

### Phase 1: Internal Beta (Week 1)
**Duration**: 1 week
**Audience**: Security Engineering team only
**Traffic**: 0% of production, 100% opt-in manual testing

**Configuration**:
```yaml
# kibana.yml or Advanced Settings
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: false  # Disabled in production
  enableInDev: true  # Enabled in dev for testing
```

**Activities**:
- [ ] Enable in development environments only
- [ ] Internal team testing (Security Engineering)
- [ ] Test delta mode with scheduled runs
- [ ] Test progressive mode with large datasets
- [ ] Monitor telemetry dashboards
- [ ] Collect feedback from internal users

**Success Metrics**:
| Metric | Target | Actual |
|--------|--------|--------|
| Internal adoption | >50% of team | [__%] |
| Context budget | <8K tokens | [__K] |
| Success rate | >95% | [__%] |
| Critical bugs | 0 | [__] |

**Go/No-Go Decision**:
- [ ] No critical bugs
- [ ] Success rate >90%
- [ ] Positive feedback from team
- [ ] Telemetry working correctly

---

### Phase 2: Controlled Rollout (Week 2)
**Duration**: 1 week
**Audience**: Select beta customers (opt-in)
**Traffic**: 5-10% of Attack Discovery API calls

**Configuration**:
```yaml
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  enableDeltaMode: true
  enableProgressiveMode: true
  allowedModels:  # Limit to validated models
    - qwen-2.5-7b
    - llama-3.1-8b
  maxAlertsPerRound: 75  # Safety limit
  maxRounds: 20
```

**Feature Flag Strategy**:
- Opt-in only (users must explicitly set `incrementalMode`)
- Monitor via `mode` field in telemetry
- Auto-fallback to standard if disabled

**Activities**:
- [ ] Enable for beta customers (via allowlist)
- [ ] Monitor context budget metrics (target: <8K)
- [ ] Monitor delta efficiency (target: <20%)
- [ ] Monitor success rate (target: >95%)
- [ ] Daily metrics review
- [ ] Collect customer feedback

**Success Metrics**:
| Metric | Target | Actual |
|--------|--------|--------|
| Beta adoption | 10 customers | [__] |
| Avg context budget | <7K tokens | [__K] |
| Delta efficiency | <20% | [__%] |
| Success rate | >95% | [__%] |
| Customer satisfaction | >4/5 | [__/5] |
| P1 incidents | 0 | [__] |

**Go/No-Go Decision**:
- [ ] No P1 incidents
- [ ] Success rate >95%
- [ ] Context budget always <8K
- [ ] Positive customer feedback
- [ ] Telemetry showing expected behavior

---

### Phase 3: Expanded Rollout (Week 3)
**Duration**: 1 week
**Audience**: All customers (opt-in)
**Traffic**: 25-50% of Attack Discovery API calls

**Configuration**:
```yaml
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  allowedModels: []  # All models allowed
```

**Activities**:
- [ ] Remove beta customer allowlist
- [ ] Enable for all Elastic Cloud deployments
- [ ] Add to product documentation
- [ ] Create in-app messaging (optional incremental mode)
- [ ] Monitor scaling behavior
- [ ] Continue daily metrics review

**Success Metrics**:
| Metric | Target | Actual |
|--------|--------|--------|
| Incremental adoption | 25%+ of runs | [__%] |
| Context budget (p99) | <8K tokens | [__K] |
| Success rate | >95% | [__%] |
| Performance (p95) | <2min for 200 alerts | [__s] |
| Support tickets | <5 related issues | [__] |

**Go/No-Go Decision**:
- [ ] Metrics meet targets
- [ ] No degradation in standard mode
- [ ] Support load manageable
- [ ] Cost savings validated (delta mode)

---

### Phase 4: General Availability (Week 4+)
**Duration**: Ongoing
**Audience**: All customers
**Traffic**: 50%+ of runs (organic adoption)

**Configuration**:
```yaml
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  # All restrictions lifted
```

**Activities**:
- [ ] Make incremental mode default for OSS models (future)
- [ ] Auto-recommend progressive for >100 alerts
- [ ] Auto-recommend delta for scheduled runs
- [ ] Continue monitoring and optimization

**Success Metrics** (Steady State):
| Metric | Target | Actual |
|--------|--------|--------|
| Incremental adoption | 50%+ | [__%] |
| OSS model usage | 30%+ (enabled by incremental) | [__%] |
| API cost reduction | 20%+ (from delta mode) | [__%] |
| Context failures | <1% | [__%] |

---

## Feature Flag Configuration

### Development
```typescript
// config/kibana.dev.yml
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  enableDeltaMode: true
  enableProgressiveMode: true
  allowedModels: []
  maxAlertsPerRound: 75
  maxRounds: 20
  enableTelemetry: true
```

### Production (Phase 1-2)
```typescript
// config/kibana.yml
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  enableDeltaMode: true
  enableProgressiveMode: true
  allowedModels: ['qwen-2.5-7b', 'llama-3.1-8b']  # Validated models only
  maxAlertsPerRound: 75
  maxRounds: 20
  enableTelemetry: true
```

### Production (Phase 3-4)
```typescript
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  enableDeltaMode: true
  enableProgressiveMode: true
  allowedModels: []  # All models allowed
  maxAlertsPerRound: 75
  maxRounds: 20
  enableTelemetry: true
```

---

## Rollback Plan

### Trigger Conditions

Rollback if ANY of:
- Critical bug discovered (data loss, security issue)
- Success rate drops below 80%
- Context budget consistently >8K tokens
- P1 customer incidents related to incremental mode
- Performance degradation >50%

### Rollback Procedure

**Option 1: Feature Flag Disable (5 minutes)**

```yaml
# Set in kibana.yml
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: false
```

All incremental requests automatically fall back to standard mode.

**Option 2: Per-Mode Disable (5 minutes)**

```yaml
# Disable only problematic mode
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  enableDeltaMode: false  # Disable delta only
  enableProgressiveMode: true  # Keep progressive
```

**Option 3: Per-Model Disable (5 minutes)**

```yaml
# Restrict to known-good models
xpack.elasticAssistant.attackDiscovery.incremental:
  enabled: true
  allowedModels: ['llama-3.1-8b']  # Only allow validated model
```

**Option 4: Code Rollback (30 minutes)**

```bash
# Revert the feature branch
git revert feature/incremental-attack-discovery
git push origin main

# Deploy previous version
# (Standard deployment process)
```

### Rollback Validation

After rollback:
- [ ] Verify standard mode still works
- [ ] Check telemetry stopped showing incremental events
- [ ] Confirm no errors in logs
- [ ] Notify affected users
- [ ] Post-mortem analysis

---

## Communication Plan

### Internal

**Week -1**: Engineering team briefing
- Technical deep-dive presentation
- Q&A session
- Access to documentation

**Week 1**: Internal beta announcement
- Slack announcement in #security-engineering
- Testing guidelines
- Feedback channels

**Week 2**: Beta customer outreach
- Email to selected customers
- Documentation links
- Support contact info

**Week 3**: General availability announcement
- Product blog post
- Release notes
- In-app messaging

### External

**Documentation Updates**:
- [ ] API documentation (attack_discovery_api.md)
- [ ] User guide (how to use incremental mode)
- [ ] Performance guide (when to use each mode)
- [ ] Troubleshooting guide

**Marketing**:
- [ ] Blog post: "Attack Discovery Now Works with Small Models"
- [ ] Social media announcements
- [ ] Customer newsletter

---

## Success Metrics Dashboard

Track rollout progress:

| Phase | Week | Adoption | Success Rate | Context Budget | Issues |
|-------|------|----------|--------------|----------------|--------|
| Internal Beta | 1 | [__%] | [__%] | [__K] | [__] |
| Controlled | 2 | [__%] | [__%] | [__K] | [__] |
| Expanded | 3 | [__%] | [__%] | [__K] | [__] |
| GA | 4+ | [__%] | [__%] | [__K] | [__] |

**Targets**:
- Adoption: 50%+ by Week 4
- Success rate: >95% all phases
- Context budget: <8K always
- Issues: <5 per phase

---

## Risk Mitigation

### Risk 1: Context Budget Exceeded
**Likelihood**: Low
**Impact**: High (breaks small models)
**Mitigation**:
- Feature flag with maxAlertsPerRound cap (75)
- Real-time monitoring with alerts
- Auto-capping in code
**Rollback**: Disable incremental mode

### Risk 2: State Tracking Issues
**Likelihood**: Medium
**Impact**: Medium (delta mode inefficiency)
**Mitigation**:
- Extensive testing of StateTracker
- Monitoring delta efficiency
- ES index backup strategy
**Rollback**: Disable delta mode only

### Risk 3: Performance Degradation
**Likelihood**: Low
**Impact**: Medium (slower than expected)
**Mitigation**:
- Performance benchmarks pre-rollout
- Monitoring round duration
- Configuration tuning guidelines
**Rollback**: Adjust configuration or disable

### Risk 4: Quality Issues
**Likelihood**: Low
**Impact**: Medium (fragmented insights)
**Mitigation**:
- Integration tests validate coherence
- Merge rate monitoring
- Human evaluation during beta
**Rollback**: Adjust similarity threshold or disable

---

## Post-Rollout Activities

### Week 5-6: Optimization
- Analyze telemetry data
- Tune default configuration
- Optimize merge algorithm
- Document best practices

### Week 7-8: Expansion
- Auto-recommend incremental for OSS models
- Add semantic merging (embedding-based)
- Adaptive round sizing
- Parallel round processing

### Month 3: Make Default
- Make progressive mode default for >100 alerts
- Make delta mode default for scheduled runs
- Auto-detect optimal mode based on scenario

---

## Appendix

### Configuration Reference

See [feature_flags.ts](x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/feature_flags.ts)

### Monitoring Reference

See [monitoring/MONITORING_SETUP.md](x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/monitoring/MONITORING_SETUP.md)

### Validation Reference

See [VALIDATION.md](x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/incremental/VALIDATION.md)

---

**Rollout Owner**: [Team/Person]
**Start Date**: [Date]
**Target GA Date**: [Date + 4 weeks]
