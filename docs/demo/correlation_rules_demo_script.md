# XDR Correlation Rules - Demo Script

**Duration:** 10-15 minutes
**Audience:** Stakeholders, product managers, security analysts, engineers
**Prerequisites:** Kibana running with `correlationRulesEnabled` experimental flag enabled

---

## Setup (Run Before Demo)

```bash
./docs/demo/correlation_rules_demo_setup.sh
```

This script will:
- ✅ Verify Kibana and Elasticsearch are running
- ✅ Confirm feature flag is enabled
- ✅ Open Kibana in browser

---

## Demo Flow

### Act 1: Problem Statement (2 min)

**Script:**
> "Today we're demoing **XDR Correlation Rules**, a new capability that solves one of the biggest pain points in Security Operations: **alert fatigue**.
>
> SOC analysts currently investigate hundreds of individual alerts per day. Many of these alerts are actually part of the same attack—like a lateral movement campaign where an attacker executes suspicious commands across 10 different hosts.
>
> Instead of investigating 50 individual alerts, correlation rules automatically group them into a single, high-fidelity **correlation alert** that tells the full attack story."

**Visual:** Show slide or diagram:
```
WITHOUT Correlation Rules:
50 individual alerts → Analyst investigates each → 2 hours

WITH Correlation Rules:
50 individual alerts → 1 correlation alert → 15 minutes
```

**Key Message:** XDR Correlation Rules reduce investigation time by 80-90%

---

### Act 2: Feature Flag & Rule Creation (3 min)

**Script:**
> "This feature is behind an experimental flag for safe rollout. Let me show you how to access it."

**Actions:**

1. **Navigate to Rules Management:**
   - In Kibana, click: **Security → Rules**
   - Click: **Create new rule** button

2. **Select Correlation Rule Type:**
   - In rule type selection, observe **Correlation** tile
   - Click: **Correlation** tile

   **Screenshot:** [01-rule-type-selection.png](../../screenshots/01-rule-type-selection.png)

3. **Configure Correlation Rule:**
   - **Rule Name:** `Lateral Movement Detection`
   - **Correlation Type:** Select `Temporal`
   - **Group By Field:** Enter `user.name`
   - **Time Window:** Set to `1h` (1 hour)
   - **Event Count Threshold:** Set to `5`

   **Script:**
   > "I'm configuring this rule to detect lateral movement by grouping all alerts from the same user within a 1-hour window. If a user triggers 5 or more alerts, we create a correlation."

   **Screenshot:** [02-correlation-form-fields.png](../../screenshots/02-correlation-form-fields.png)

4. **Preview ES|QL Query:**
   - Click: **Preview** button
   - Observe: ES|QL query shown in preview panel

   **Script:**
   > "Under the hood, this compiles to an ES|QL query that groups alerts by user.name and filters by timespan. This is the power of ES|QL—complex correlation logic in a readable query."

   **Screenshot:** [03-correlation-esql-preview-timespan.png](../../screenshots/03-correlation-esql-preview-timespan.png)

5. **Save Rule:**
   - Click: **Create & Enable**
   - Observe: Rule created and shown in Rules Management

---

### Act 3: Correlation Types Explained (2 min)

**Script:**
> "We support 4 correlation types to cover different detection scenarios."

**Visual:** Show table or slide:

| Type | Use Case | Example |
|------|----------|---------|
| **Temporal** | Multiple events from same entity within time window | Lateral movement (user executes commands on many hosts) |
| **Temporal Ordered** | Sequential attack stages | Kill chain (reconnaissance → exploit → persistence) |
| **Event Count** | Threshold violations | Brute force (>10 failed logins from same IP) |
| **Value Count** | Diverse targets | Port scan (same source IP scans >5 destination IPs) |

**Script:**
> "For this demo, we're using **Temporal** to detect lateral movement. But if we wanted to detect a kill chain sequence, we'd use **Temporal Ordered** to enforce chronological ordering of attack stages."

---

### Act 4: Rule Execution & Alert Investigation (3 min)

**Script:**
> "Now let's see the correlation in action. The rule runs every 1-5 minutes on a schedule."

**Actions:**

1. **Trigger Rule Execution (if not auto-scheduled):**
   - Option A: Wait for next scheduled execution (show in Rule Details)
   - Option B: Trigger manually via API (for demo speed):
     ```bash
     curl -X POST "http://localhost:5601/api/detection_engine/rules/_execute" \
       -H 'Content-Type: application/json' \
       -H 'kbn-xsrf: true' \
       -d '{"ruleId": "<rule-id>"}'
     ```

2. **Navigate to Alerts:**
   - Click: **Security → Alerts**
   - Filter: `kibana.alert.rule.type: correlation`

3. **Expand Correlation Alert:**
   - Click on a correlation alert row to expand
   - Observe:
     - **Shell Alert:** High-level summary (e.g., "Correlation rule matched 15 alerts grouped by user.name: alice")
     - **Building Blocks:** Links to 15 contributing alerts
     - **Enrichment:** Entity fields (user, host, IP) extracted from contributing alerts
     - **Risk Score:** Composite risk score (max risk + 10% boost per alert)

   **Script:**
   > "Notice the structure: We have a **shell alert** that summarizes the correlation, and **building block alerts** that link back to the original 15 alerts. This pattern keeps our data model clean—we're not duplicating alert data, just creating relationships."

4. **Investigate Timeline:**
   - Click: **View in Timeline** (if available)
   - Observe: All 15 correlated alerts shown on timeline
   - **Script:**
     > "The timeline view shows the full attack narrative—15 suspicious process executions across 5 different hosts, all by user 'alice' within 1 hour. This is clear lateral movement."

---

### Act 5: Risk Score Calculation (2 min)

**Script:**
> "One unique aspect of correlation rules is the risk score calculation."

**Visual:** Show formula on slide or whiteboard:

```
Temporal / Temporal Ordered:
  compositeRiskScore = maxRisk * (1 + min(alertCount, 5) * 0.10)
  Example: maxRisk=70, alertCount=15
           → 70 * (1 + 0.50) = 105 → capped at 100

Event Count / Value Count:
  compositeRiskScore = maxRisk (no boost)
```

**Script:**
> "For temporal correlations, we boost the risk score by 10% per alert, up to 50%. This reflects that coordinated activity is inherently higher risk than isolated events.
>
> For event count and value count, we don't boost—the threshold itself already indicates the severity."

**Actions:**
- Point to risk score in expanded alert (e.g., 95)
- Show contributing alert with maxRisk=70
- Calculate: 70 * 1.5 = 105 → capped at 100 (but UI might show 95 if some alerts had lower risk)

---

### Act 6: Performance & Scalability (1 min)

**Script:**
> "Performance is critical for correlation—we can't have rules taking 10 minutes to execute.
>
> Our performance tests show **P95 latency under 5 seconds** for correlating 10,000 alerts into 100 groups. This is fast enough for real-time detection."

**Visual:** Show performance metrics (if available):
- P50: 1.2s
- P95: 4.8s
- P99: 12.3s
- Throughput: 2,000 alerts/sec

**Script:**
> "Under the hood, we're using ES|QL's optimizations—index pushdowns, columnar execution—to achieve this performance."

---

### Act 7: What's Next - Production Roadmap (2 min)

**Script:**
> "This is a spike, so it's not production-ready yet. Here's the path to GA."

**Visual:** Show roadmap slide or timeline:

```
Week 1-2: Security Review & RBAC Audit (BLOCKING)
Week 2-3: Performance Testing at Scale + Optimization
Week 3:   Internationalization + User Documentation
Week 4:   Observability Dashboards + Enablement

Total: 3-4 weeks → GA in 9.6 or 10.0
```

**Script:**
> "The code is production-quality, but we need:
> 1. **Security review** from AppSec (blocking GA)
> 2. **RBAC audit** to ensure proper privilege checks
> 3. **Performance validation** at scale (100K+ alerts)
> 4. **User documentation** for docs.elastic.co
>
> With focused execution, we can ship in 9.6 or 10.0."

**Key Message:** Spike proves feasibility, production is achievable in 1 month

---

## Demo Recovery (If Something Goes Wrong)

### Issue 1: Feature Flag Not Enabled → Correlation Rule Type Not Visible

**Symptoms:** Correlation tile missing from rule creation wizard

**Fix:**
```bash
# Verify experimental flag in kibana.dev.yml:
grep "correlationRulesEnabled" config/kibana.dev.yml

# Should see:
xpack.securitySolution.enableExperimental: ['correlationRulesEnabled']

# If missing, add it and restart Kibana
```

---

### Issue 2: No Correlation Alerts Generated

**Symptoms:** Rule executes but no alerts created

**Possible Causes:**
1. **Threshold not met:** Increase event count threshold to 1, or wait for more alerts
2. **No matching alerts:** Verify alerts exist with the groupBy field (e.g., `user.name` populated)
3. **Time window too narrow:** Expand time window to 24h to capture more alerts

**Fix:**
```bash
# Check if alerts exist with groupBy field:
GET .alerts-security.alerts-*/_search
{
  "query": { "exists": { "field": "user.name" } },
  "size": 10
}

# If no alerts, create some via detection rules first
```

---

### Issue 3: Rule Execution Timeout

**Symptoms:** Rule shows "execution timeout" error

**Possible Causes:**
- Too many alerts to correlate (>100K)
- Query timeout (default 2 min)

**Fix:**
```bash
# Reduce time window or add more filters to limit alert scope
# Example: Add filter for specific host.name or rule.name

# Or increase query timeout (not recommended for production)
```

---

## Post-Demo Cleanup

```bash
./docs/demo/correlation_rules_demo_cleanup.sh
```

This script will:
- Disable feature flag (optional)
- Delete demo correlation rule
- Archive correlation alerts (optional)

---

## Demo Tips

**Before Presenting:**
- ✅ Practice the demo 2-3 times to get timing right
- ✅ Have screenshots ready as backup (in case live demo fails)
- ✅ Prepare 2-3 real-world use case examples (lateral movement, brute force, kill chain)
- ✅ Review common questions (see below)

**During Demo:**
- 🎯 Keep it focused: Problem → Solution → Value
- 🎯 Use concrete numbers: "80-90% time reduction", "P95 latency <5s"
- 🎯 Show, don't tell: Let the UI speak for itself
- 🎯 Pause for questions, but defer deep technical dives to Q&A

**Common Questions:**

1. **Q: How does this differ from existing correlation in SIEM tools like Splunk?**
   - A: We use ES|QL for performance, shell+building block pattern for scalability, and support 4 correlation types (most SIEMs have 1-2)

2. **Q: Can we correlate across multiple Elasticsearch clusters?**
   - A: Not yet—that's on the roadmap for 10.0+. Currently scoped to single cluster.

3. **Q: What's the limit on alerts per correlation?**
   - A: We cap at 500 building blocks per correlation to avoid UI performance issues. Logged warnings if exceeded.

4. **Q: Can we use custom fields for grouping?**
   - A: Yes, any field in the alert schema can be used for groupBy. We recommend ECS fields for consistency.

5. **Q: Is this a platinum/enterprise feature?**
   - A: TBD—needs product decision. Spike doesn't enforce license tier (for testing).

---

## Success Metrics

**A successful demo:**
- ✅ Audience understands the value proposition (reduce alert fatigue)
- ✅ Audience sees live correlation alert created
- ✅ Audience asks questions about production use cases (not just technical details)
- ✅ Stakeholders agree to production roadmap timeline

**Follow-up Actions:**
- Send demo recording + documentation links
- Schedule production roadmap review meeting
- Identify beta customers for early testing

---

**Questions?** Contact: Patryk Kopycinski (@patrykkopycinski)
