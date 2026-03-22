# LLM-Powered Alert Investigation - Workflows Setup Guide

**Production Feature:** Event-Driven Automated Investigations

This guide shows how to set up event-driven automated alert investigations using **Kibana Workflows + LangGraph**.

---

## Architecture Overview

```
High-Risk Alert Created (CRITICAL or HIGH)
  ↓
Detection Engine emits event: alert.created
  ↓
Workflows Engine detects subscribed workflows
  ↓
Workflow Step: AI Investigation
  ↓
  ┌─────────────────────────────────────┐
  │   LangGraph Multi-Agent System       │  ← All AI complexity here
  │   - Triage Agent                     │
  │   - MITRE Mapper                     │
  │   - CTI Enrichment (future)          │
  │   - Investigation (future)           │
  │   - Remediation (future)             │
  └──────────────┬──────────────────────┘
  ↓
Workflow Step: Add Comment to Case
  ↓
Case Updated with AI Investigation Results
```

**Benefits:**
- ✅ **Event-driven** - Instant trigger (no polling)
- ✅ **User-configurable** - Enable/disable via Workflows UI
- ✅ **AI-optimized** - LangGraph handles agent coordination
- ✅ **Reusable** - Investigation step can be used in multiple workflows

---

## Prerequisites

### 1. Enable Feature Flag

**config/kibana.yml or config/kibana.dev.yml:**
```yaml
xpack.elasticAssistant.llmInvestigationEnabled: true
```

### 2. Configure Claude Connector

1. Navigate to: **Stack Management → Connectors**
2. Click: **Create connector**
3. Select: **Claude (Anthropic)**
4. Configure:
   - **Name:** "Claude for Alert Investigation"
   - **API Key:** `sk-ant-...` (from Anthropic Console)
   - **Model:** `claude-3-5-sonnet-20241022`
5. **Test** and **Save**
6. **Note the Connector ID** (you'll need this for workflows)

### 3. Ensure Workflows Extensions Plugin is Enabled

**Verify:**
```bash
# Check if workflows_extensions is loaded
curl http://localhost:5601/api/status | jq '.status.plugins.workflows_extensions'
```

Should return `{ "level": "available" }` or similar.

---

## Quick Start: Create Your First Workflow

### Option 1: Via Workflows UI (Recommended)

1. Navigate to: **Management → Workflows** (or wherever Workflows Management app is)

2. Click: **Create Workflow**

3. Configure trigger:
   - **Trigger Type:** "High-Risk Security Alert Created"
   - **ID:** `elastic_assistant.alert_created_high_risk`

4. Add steps:

   **Step 1: AI Investigation**
   - **Type:** "AI-Powered Alert Investigation"
   - **Configuration:**
     - `alert_id`: `${{ trigger.alert_id }}`
     - `alert_index`: `${{ trigger.alert_index }}`
     - `connector_id`: `your-claude-connector-id` (from Prerequisites step 2)

   **Step 2: Create Case (optional)**
   - **Type:** "Create Case"
   - **Configuration:**
     - `title`: `AI Investigation: ${{ trigger.rule_name }}`
     - `description`: `${{ steps.investigate.outputs.investigation_text }}`

5. **Save** workflow

6. **Enable** workflow (toggle switch)

---

### Option 2: Via YAML Configuration

**Create:** `config/workflows/auto_investigation.yaml`

```yaml
name: Auto-Investigate High-Risk Alerts
description: AI-powered investigation for CRITICAL and HIGH severity alerts
trigger: elastic_assistant.alert_created_high_risk

steps:
  - name: investigate
    type: elastic_assistant.ai_investigation
    with:
      alert_id: "${{ trigger.alert_id }}"
      alert_index: "${{ trigger.alert_index }}"
      connector_id: "YOUR_CLAUDE_CONNECTOR_ID"
```

**Load workflow:**
```bash
# Via Workflows Management API
curl -X POST http://localhost:5601/api/workflows \
  -H 'Content-Type: application/yaml' \
  -H 'kbn-xsrf: true' \
  -u elastic:changeme \
  --data-binary @config/workflows/auto_investigation.yaml
```

---

## Testing the Workflow

### Step 1: Trigger a Test Alert

**Option A: Generate test alert via Detection Engine**
```bash
# Create a test high-risk alert
POST .alerts-security.alerts-default/_doc
{
  "@timestamp": "2026-03-22T12:00:00Z",
  "kibana.alert.rule.name": "Test Suspicious Activity",
  "kibana.alert.severity": "high",
  "kibana.alert.risk_score": 85,
  "kibana.alert.workflow_status": "open",
  "process.name": "powershell.exe",
  "process.command_line": "powershell.exe -enc [base64]",
  "user.name": "admin",
  "host.name": "TEST-HOST"
}
```

**Option B: Use detection rule to generate real alert**
1. Navigate to Security → Rules
2. Enable a detection rule
3. Wait for alert to be generated

---

### Step 2: Verify Workflow Triggered

**Check Workflows Execution Logs:**
```bash
# Query workflows execution index
GET .workflows-executions-*/_search
{
  "size": 1,
  "sort": [{ "@timestamp": "desc" }],
  "query": {
    "term": { "workflow.name": "Auto-Investigate High-Risk Alerts" }
  }
}
```

**Expected:**
- `status`: "running" or "completed"
- `steps.investigate.status`: "completed"
- `steps.investigate.outputs.triage.classification`: "HIGH" (or similar)

---

### Step 3: Verify Investigation Results

**Check LangSmith Traces** (if configured):
1. Open: https://smith.langchain.com (or your LangSmith instance)
2. Project: "alert-investigation"
3. Find recent trace
4. Verify:
   - Triage agent executed
   - MITRE mapper executed
   - Both agents returned results

**Check Case (if workflow created one):**
1. Navigate to: Security → Cases
2. Find case: "AI Investigation: [rule name]"
3. Verify investigation comment with:
   - 🤖 AI-Powered Alert Investigation header
   - Triage classification
   - MITRE ATT&CK mapping

---

## Advanced Configuration

### Enable/Disable Specific Agents

**In workflow YAML:**
```yaml
steps:
  - name: investigate
    type: elastic_assistant.ai_investigation
    with:
      alert_id: "${{ trigger.alert_id }}"
      alert_index: "${{ trigger.alert_index }}"
      connector_id: "YOUR_CLAUDE_CONNECTOR_ID"
      enabled_agents:
        triage: true
        mitre: true
        cti: false          # Disable CTI for faster investigations
        investigation: false
        remediation: false
```

**Foundation Spike (Current):**
- Only `triage` and `mitre` are implemented
- `cti`, `investigation`, `remediation` are placeholders (future)

**Production (Weeks 2-4):**
- All 5 agents implemented
- Enable/disable based on severity, risk score, or other conditions

---

### Conditional Execution

**Only investigate CRITICAL alerts:**
```yaml
steps:
  - name: investigate
    type: elastic_assistant.ai_investigation
    condition: "${{ trigger.severity == 'critical' }}"
    with:
      alert_id: "${{ trigger.alert_id }}"
      alert_index: "${{ trigger.alert_index }}"
      connector_id: "YOUR_CLAUDE_CONNECTOR_ID"
```

**Different investigations for different severities:**
```yaml
steps:
  - name: deep_investigation
    type: elastic_assistant.ai_investigation
    condition: "${{ trigger.severity == 'critical' }}"
    with:
      alert_id: "${{ trigger.alert_id }}"
      alert_index: "${{ trigger.alert_index }}"
      connector_id: "YOUR_CLAUDE_CONNECTOR_ID"
      enabled_agents: { triage: true, mitre: true, cti: true, investigation: true, remediation: true }

  - name: basic_investigation
    type: elastic_assistant.ai_investigation
    condition: "${{ trigger.severity == 'high' }}"
    with:
      alert_id: "${{ trigger.alert_id }}"
      alert_index: "${{ trigger.alert_index }}"
      connector_id: "YOUR_CLAUDE_CONNECTOR_ID"
      enabled_agents: { triage: true, mitre: true }  # Just basics for HIGH
```

---

## Integration with Detection Engine

**For Detection Engine Team:**

To emit alert.created events, add this code after alert creation:

**File:** `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/signals/single_bulk_create.ts`

```typescript
import { emitAlertCreatedEvent, getWorkflowsClient } from '@kbn/elastic-assistant-plugin/server/workflows/emit_alert_events';

// After alert creation succeeds
const workflowsClient = getWorkflowsClient(request);
if (workflowsClient) {
  await emitAlertCreatedEvent({
    alert: createdAlert,
    workflowsClient,
    logger,
  });
}
```

**Only high-risk alerts trigger workflows** (CRITICAL, HIGH, or risk_score >= 75)

---

## Monitoring & Debugging

### View Workflow Executions

**Query executions index:**
```bash
GET .workflows-executions-*/_search
{
  "size": 10,
  "sort": [{ "@timestamp": "desc" }],
  "query": {
    "match": { "workflow.name": "Auto-Investigate High-Risk Alerts" }
  }
}
```

**Key fields:**
- `status`: "running", "completed", "failed"
- `steps[].status`: Per-step status
- `steps[].outputs`: Step outputs (investigation results)
- `duration_ms`: Total workflow execution time

---

### View LangSmith Traces (AI Agents)

1. **Configure LangSmith** (if not already):
   ```yaml
   # Add to kibana.yml
   xpack.actions.customActionTypes:
     - actionTypeId: .claude
       config:
         langSmithApiKey: "YOUR_LANGSMITH_API_KEY"
   ```

2. **Open LangSmith:**
   - URL: https://smith.langchain.com
   - Project: "alert-investigation"

3. **Find recent traces:**
   - Filter by: Run name = "AI Investigation"
   - Sort by: Start time (desc)

4. **Examine trace:**
   - See agent execution flow (Triage → MITRE)
   - See tool calls (query_similar_alerts)
   - See LLM prompts and responses
   - See latency breakdown

---

### Common Issues

**Issue 1: Workflow doesn't trigger**

**Symptoms:** Alert created but workflow execution doesn't appear

**Debug:**
```bash
# Check if trigger is registered
GET /api/workflows/triggers

# Check if event was emitted (detection engine logs)
# Look for: "[Alert Investigation] Emitting alert.created event"
```

**Fix:**
- Verify `workflowsExtensions` plugin is loaded
- Verify trigger registration succeeded (check Kibana logs)
- Verify detection engine integration is complete (event emission code added)

---

**Issue 2: Investigation step fails with "not enabled"**

**Symptoms:** Workflow runs but AI Investigation step fails

**Debug:**
```bash
# Check feature flag
grep "llmInvestigationEnabled" config/kibana.yml
```

**Fix:**
```yaml
xpack.elasticAssistant.llmInvestigationEnabled: true
```

Restart Kibana

---

**Issue 3: Investigation step fails with "Connector not found"**

**Symptoms:** `404 Connector YOUR_CLAUDE_CONNECTOR_ID not found`

**Debug:**
```bash
# List connectors
GET /api/actions/connectors
```

**Fix:**
- Create Claude connector (see Prerequisites)
- Update workflow with correct connector ID
- Ensure connector is enabled (not disabled)

---

**Issue 4: Investigation is slow (>2 minutes)**

**Symptoms:** Workflow execution takes longer than expected

**Debug:**
```bash
# Check LangSmith trace for latency breakdown
# Look for: Which agent is slow? Which LLM call is slow?
```

**Fix:**
- Foundation spike (2 agents): Expected latency 15-30s
- If slower: Check Claude API status, check network latency
- Consider using faster model (claude-3-5-haiku) for triage agent

---

## Performance Monitoring

### Latency Metrics

**Query workflow execution times:**
```bash
GET .workflows-executions-*/_search
{
  "size": 0,
  "query": {
    "term": { "steps.type": "elastic_assistant.ai_investigation" }
  },
  "aggs": {
    "latency_stats": {
      "stats": { "field": "steps.duration_ms" }
    },
    "latency_percentiles": {
      "percentiles": {
        "field": "steps.duration_ms",
        "percents": [50, 95, 99]
      }
    }
  }
}
```

**Expected (Foundation Spike - 2 agents):**
- P50: 15-20s
- P95: 25-30s
- P99: 30-40s

**Expected (Production - 5 agents, parallel):**
- P50: 25-35s
- P95: 40-50s
- P99: 50-70s

---

### Success Rate Monitoring

**Query investigation success rate:**
```bash
GET .workflows-executions-*/_search
{
  "size": 0,
  "query": {
    "term": { "steps.type": "elastic_assistant.ai_investigation" }
  },
  "aggs": {
    "success_rate": {
      "terms": { "field": "steps.status" }
    }
  }
}
```

**Target:** >95% success rate

**If lower:**
- Check LangSmith for LLM errors (hallucination, timeout)
- Check connector health (API key valid, rate limits)
- Check alert data quality (missing fields can cause failures)

---

## Cost Monitoring

### LLM Token Usage

**Query from LangSmith:**
- Project: "alert-investigation"
- Metric: Total tokens per investigation
- Breakdown: Triage agent tokens + MITRE agent tokens

**Expected Cost (Foundation Spike):**
- ~10K tokens per investigation
- Claude Haiku: $0.25 per 1M tokens → $0.0025 per investigation
- 300K investigations/month → $750/month

**Compare to:**
- Manual investigation cost: $150K/month (analyst time)
- **Savings: $149.25K/month** (99.5% reduction)

---

## Example Workflows

See [`example_workflows.yaml`](example_workflows.yaml) for:

1. **Basic Auto-Investigation** - Simplest workflow
2. **Investigate and Create Case** - Auto-case creation
3. **Conditional Investigation** - Different agents for different severities
4. **Full Production Workflow** - Complete case management + investigation
5. **Investigation with Response Actions** - Future capability demo

---

## Migration from API-Based to Workflow-Based

**Current (Foundation Spike):**
```typescript
// Manual API call
POST /internal/elastic_assistant/alert_investigation
{
  "alertId": "abc123",
  "alertIndex": ".alerts-security.alerts-default",
  "connectorId": "connector-123"
}
```

**Production (Workflows):**
```yaml
# Automated via workflow (no manual API call)
name: Auto-Investigation
trigger: elastic_assistant.alert_created_high_risk
steps:
  - type: elastic_assistant.ai_investigation
    with:
      alert_id: "${{ trigger.alert_id }}"
      alert_index: "${{ trigger.alert_index }}"
      connector_id: "connector-123"
```

**Migration Steps:**

1. **Keep API route** - Still useful for manual investigations
2. **Add workflow** - For automated investigations
3. **Integrate detection engine** - Emit events when alerts created
4. **Enable workflow** - Activate auto-investigation
5. **Monitor both** - API for manual, Workflows for automated

**No breaking changes** - API and Workflows coexist

---

## Best Practices

### 1. Start with Basic Workflow

Don't enable all 5 agents immediately. Start simple:

```yaml
# Week 1: Foundation (2 agents)
enabled_agents:
  triage: true
  mitre: true
  cti: false
  investigation: false
  remediation: false
```

Validate performance and accuracy, then enable more agents.

---

### 2. Use Conditional Execution

Reserve expensive agents (Investigation, Remediation) for CRITICAL alerts:

```yaml
enabled_agents:
  triage: true
  mitre: true
  cti: true
  investigation: "${{ trigger.severity == 'critical' }}"
  remediation: "${{ trigger.severity == 'critical' }}"
```

---

### 3. Monitor Cost and Performance

**Weekly review:**
- Latency (P50, P95, P99)
- Success rate (target >95%)
- LLM token usage (cost per investigation)
- Analyst feedback (investigation quality)

**Adjust if needed:**
- Disable slow agents
- Use faster models (Haiku instead of Sonnet)
- Add caching for repeated queries

---

### 4. Collect Analyst Feedback

**Add to workflow:**
```yaml
# Future capability: Feedback collection step
- name: request_feedback
  type: cases.add_custom_field
  with:
    case_id: "${{ steps.create_case.outputs.case.id }}"
    field_id: "investigation_quality"
    field_type: "rating"
```

Use feedback for continuous improvement (RLHF)

---

## Roadmap

### Phase 1: Foundation Spike (✅ Complete)
- 2 agents (Triage + MITRE)
- Workflow step registered
- Trigger defined
- API route for manual invocation

### Phase 2: Event-Driven Automation (Week 2)
- [ ] Detection engine integration (emit events)
- [ ] Default workflow deployed
- [ ] Monitoring dashboard

### Phase 3: Additional Agents (Weeks 3-4)
- [ ] Agent 3: CTI Enrichment (ELSER + connectors)
- [ ] Agent 4: Investigation (hypothesis testing)
- [ ] Agent 5: Remediation (response actions)

### Phase 4: Production Hardening (Week 4+)
- [ ] Parallel execution (agents 3-5 run concurrently)
- [ ] User feedback UI (RLHF)
- [ ] Cost optimization (caching, batching)
- [ ] Comprehensive monitoring

---

## Support & Troubleshooting

**Documentation:**
- [SPIKE.md](../SPIKE.md) - Technical implementation details
- [example_workflows.yaml](example_workflows.yaml) - Workflow templates
- [Architecture Decision](../ARCHITECTURE_DECISION_WORKFLOWS_VS_LANGGRAPH.md) - Why Workflows + LangGraph

**Slack Channels:**
- #security-solution-dev - Security team discussions
- #kibana-workflows - Workflows system questions
- #ai-assistant - Elastic Assistant and LLM questions

**GitHub Issues:**
- **Bugs:** [elastic/kibana](https://github.com/elastic/kibana/issues)
- **Features:** [elastic/security-team](https://github.com/elastic/security-team/issues)

---

## FAQ

**Q: Do I need to use workflows? Can I still use the API?**
A: Both work! API is for manual investigations, Workflows for automated. They use the same LangGraph backend.

**Q: What happens if workflows_extensions plugin is not installed?**
A: Workflow registration is skipped gracefully. API route still works for manual investigations.

**Q: Can I create multiple workflows with different configurations?**
A: Yes! Create workflow per use case (e.g., "CRITICAL alerts → full investigation", "HIGH alerts → basic investigation")

**Q: How do I disable auto-investigation temporarily?**
A: Disable the workflow in Workflows Management UI (toggle switch). No code changes needed.

**Q: What's the cost per investigation?**
A: Foundation (2 agents): ~$0.0025 per investigation. Production (5 agents): ~$0.01 per investigation.

**Q: Can I use different LLM models for different agents?**
A: Not in foundation spike (all use same connector). Production could support per-agent connector configuration.

---

**Ready to enable event-driven investigations!** 🚀
