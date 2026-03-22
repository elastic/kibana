# MITRE ATT&CK Auto-Mapper - Production TODOs

**Current Status:** Spike complete with mock LLM
**Production-Ready Status:** 85% (needs real LLM connector)

---

## 🔴 Critical: Replace Mock LLM with Real Connector

**Current (Spike):**
```typescript
// Mock LLM for demonstration
const llmClient = {
  invoke: async () => ({
    content: JSON.stringify({ techniques: [...], tactics: [...] })
  })
};
```

**Production (Required):**
```typescript
// Real Claude connector via Actions
const actionsClient = await context.actions.getActionsClient();

// Find Claude connector
const connectors = await actionsClient.getAll();
const claudeConnector = connectors.find(
  c => c.actionTypeId === '.gen-ai' && c.name.includes('Claude')
);

if (!claudeConnector) {
  throw new Error('Claude connector not configured');
}

// Create ActionsClientChatOpenAI (works with Anthropic via Actions)
const llmClient = new ActionsClientChatOpenAI({
  actionsClient,
  connectorId: claudeConnector.id,
  model: 'claude-3-5-haiku-20241022',
  temperature: 0,
});
```

**Files to modify:**
- `server/workflows/steps/map_alert_to_mitre.ts` (lines 50-70)

**Testing:**
- Verify Claude connector exists: **Stack Management → Connectors**
- Test connector: Send test message
- Validate response format matches expected

**Effort:** 1-2 hours

---

## 🟡 High Priority: Event Emission Integration

**Current:** Event emission code provided in INTEGRATION_GUIDE.md but not wired up

**Production:** Need to emit event when alert indexed

**Integration points to check:**

```bash
# Find where alerts are indexed
grep -r "bulkCreate\|indexAlerts\|_bulk.*alert" \
  x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/
```

**Add after successful indexing:**

```typescript
// After alert indexed successfully
if (
  experimentalFeatures.mitreAutoMapEnabled &&
  alert['kibana.alert.risk_score'] >= 50 &&
  context.workflowsExtensions
) {
  const workflowsClient = await context.workflowsExtensions.getWorkflowsClient();

  await workflowsClient.emitEvent(HIGH_RISK_ALERT_INDEXED_TRIGGER_ID, {
    alertId: indexedAlert._id,
    riskScore: alert['kibana.alert.risk_score'],
    index: alertIndex,
    spaceId: context.spaceId,
    hasRuleMitreTags: hasRuleMitreMapping(alert),
    alertTimestamp: alert['@timestamp'],
    ruleName: alert['kibana.alert.rule.name'],
  });
}
```

**Testing:**
- Create alert → Check workflow executions
- Verify event payload correct
- Test filtering (risk score, rule tags)

**Effort:** 2-3 hours

---

## 🟢 Medium Priority: Enhanced Technique Coverage

**Current:** Top 50 MITRE techniques embedded in prompt (~80% coverage)

**Production:** Expand to top 200 techniques (~95% coverage)

**Files to modify:**
- `server/lib/detection_engine/enrichments/mitre_mapping/build_mitre_prompt.ts`

**Add:**
```typescript
// Full MITRE ATT&CK v14 taxonomy (all 200 techniques)
import { MITRE_TECHNIQUES_FULL } from './mitre_attack_framework';

const promptWithFullTaxonomy = `
...
MITRE ATT&CK Techniques (Top 200):
${MITRE_TECHNIQUES_FULL.map(t => `- ${t.id} (${t.name})`).join('\n')}
...
`;
```

**Data source:** https://github.com/mitre-attack/attack-stix-data

**Effort:** 3-4 hours (download taxonomy, format, test)

---

## 🟢 Medium Priority: Workflows Extensions Approval

**Current:** Trigger and step registered but not in approved list

**Production:** Add to approved list for CI

**Files to modify:**
1. Get schema hash:
   ```bash
   curl http://localhost:5601/internal/workflows_extensions/trigger_definitions \
     | jq '.[] | select(.id == "security-solution.highRiskAlertIndexed") | .schemaHash'
   ```

2. Add to: `test/scout/api/fixtures/approved_trigger_definitions.ts`
   ```typescript
   {
     id: 'security-solution.highRiskAlertIndexed',
     schemaHash: '<hash-from-step-1>'
   },
   ```

3. Get step schema hash and add to approved steps list

**PR review:** Request workflows-eng team approval

**Effort:** 30 min

---

## 🟢 Low Priority: Sub-Technique Granularity

**Current:** Technique-level only (T1059)

**Production:** Sub-technique level (T1059.001)

**Already supported in code!** Just needs:
- Prompt update (include sub-techniques in taxonomy)
- Test coverage (verify sub-techniques returned)

**Effort:** 1 hour

---

## 🟢 Low Priority: User Feedback Mechanism

**Future:** RLHF loop for continuous improvement

**Add UI:**
```typescript
<EuiButton onClick={() => submitFeedback(alertId, 'correct')}>
  ✅ Mapping correct
</EuiButton>
<EuiButton onClick={() => submitFeedback(alertId, 'incorrect')}>
  ❌ Mapping incorrect
</EuiButton>
```

**Store feedback:**
- Index: `.mitre-mapping-feedback-*`
- Use for: Model fine-tuning, prompt improvement, accuracy tracking

**Effort:** 1 week (UI + API + analytics)

---

## 🟢 Low Priority: APM Instrumentation

**Add metrics:**
```typescript
apm.recordMetric('mitre.workflow.latency', executionTime);
apm.recordMetric('mitre.cache.hit_rate', cacheHits / total);
apm.recordMetric('mitre.llm.cost', llmCalls * 0.01);
apm.recordMetric('mitre.accuracy', correctMappings / total);
```

**Dashboard:**
- MITRE mapping latency (P50, P95, P99)
- Cache performance
- Monthly LLM cost
- Mapping accuracy (if feedback implemented)

**Effort:** 2-3 hours

---

## Checklist for Production

### Before GA (Must-have)
- [ ] Replace mock LLM with real Claude connector (1-2 hours)
- [ ] Wire up event emission when alert indexed (2-3 hours)
- [ ] Add to Workflows approved list (30 min)
- [ ] Integration tests (1 hour)
- [ ] Performance testing (1 hour)
- [ ] Security review

**Total must-have effort:** 6-8 hours

### Nice-to-have (Can defer)
- [ ] Expand technique coverage (top 200)
- [ ] Sub-technique granularity
- [ ] User feedback mechanism
- [ ] APM instrumentation
- [ ] MITRE ATT&CK Navigator integration

**Total nice-to-have effort:** 1-2 weeks

---

## Timeline Estimate

**Sprint 1 (Week 1):**
- Replace mock LLM (Day 1-2)
- Wire up event emission (Day 2-3)
- Integration tests (Day 3)
- Performance testing (Day 4)
- Security review (Day 5)

**Sprint 2 (Week 2):**
- Workflows approval (Day 1)
- Expand technique coverage (Day 2-3)
- APM instrumentation (Day 4-5)

**Sprint 3+ (Optional):**
- User feedback mechanism
- Advanced features

---

## Risk Mitigation

**Risk 1: Claude connector not available**
- **Mitigation:** Create connector during setup (1 hour)
- **Connector type:** Generative AI (Anthropic/Claude)
- **Config:** API key from Elastic Assistant settings

**Risk 2: Workflows Extensions changes**
- **Mitigation:** Pin to specific API version
- **Monitor:** Workflows Extensions changelog

**Risk 3: Event emission performance**
- **Mitigation:** Fire-and-forget (don't await emitEvent)
- **Fallback:** Batch events if volume too high

---

## Success Criteria (Production)

**Functional:**
- [ ] 100% of high-risk alerts enriched (no gaps)
- [ ] <1% error rate (graceful degradation)
- [ ] Hybrid logic working (skip when appropriate)

**Performance:**
- [ ] 90% cache hit rate (steady state)
- [ ] <500ms P99 latency (workflow execution)
- [ ] No impact on alert indexing latency

**Cost:**
- [ ] <$150/month LLM costs
- [ ] Cache size <10MB memory
- [ ] No CPU/memory regressions

**Quality:**
- [ ] >80% mapping accuracy (spot check 100 alerts)
- [ ] Zero duplicate tags
- [ ] ECS compliance validated

---

**Current spike: 85% production-ready**
**Remaining work: 6-8 hours critical path**
**Timeline to GA: 1-2 weeks**
