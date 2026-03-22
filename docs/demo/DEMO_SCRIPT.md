# Endpoint Compliance Monitoring - Demo Script

**Duration**: 10-15 minutes
**Audience**: Product managers, security leaders, customers
**Prerequisites**: Kibana running, feature flag enabled, sample data loaded

---

## Setup (Run Before Demo)

```bash
# Automated setup - run this 10 minutes before demo
./docs/demo/demo_setup.sh

# What it does:
# 1. Starts Elasticsearch and Kibana with feature flag enabled
# 2. Loads sample compliance data (100 hosts, 3 benchmarks, 1500 findings)
# 3. Deploys sample packs to Fleet
# 4. Primes caches for fast demo experience
# 5. Opens browser to compliance dashboard

# Expected output:
# ✅ Elasticsearch running on http://localhost:9200
# ✅ Kibana running on http://localhost:5601
# ✅ Feature flag enabled: endpointComplianceMonitoring
# ✅ Sample data loaded: 100 hosts, 1500 findings
# ✅ Compliance score: ~73% (intentionally mixed pass/fail)
# ✅ Browser opened to: http://localhost:5601/app/osquery/compliance/dashboard
```

---

## Demo Flow

### Act 1: The Problem (2 min) - Set Context

**Script:**

> "Before we dive in, let me set the context. Organizations need to prove their endpoints meet security baselines for compliance - think CIS benchmarks, PCI-DSS requirements, custom security policies."
>
> "Traditionally, this is done with manual audits - security teams SSH into servers, run commands, copy-paste results into spreadsheets. This is slow, error-prone, and doesn't scale."
>
> "**The Question**: Can we continuously monitor endpoint compliance at scale, with minimal agent overhead?"
>
> "**The Answer**: Yes - with osquery-based compliance monitoring. Let me show you."

**Visual**: Show slide comparing manual audits vs automated monitoring

| Manual Audits | Automated Monitoring |
|---------------|---------------------|
| Monthly snapshots | Real-time continuous |
| Human error-prone | Automated accuracy |
| Hours per endpoint | Seconds per endpoint |
| No trend analysis | Historical tracking |
| Spreadsheet reports | Interactive dashboards |

---

### Act 2: Compliance Dashboard (3 min) - Show Value

**Navigate to**: Osquery → Compliance → Dashboard

**Script:**

> "Here's our compliance dashboard showing posture across 100 production endpoints."

**Point to Compliance Score Gauge**:

> "**73% compliant** overall. Not great, but we can see exactly where the gaps are."

**Point to Compliance Trend Chart**:

> "This trend shows we've improved from 68% last week - security hardening efforts are working."

**Point to Compliance by Section Table**:

> "Breaking this down by CIS section, we see:"
> - Initial Setup: 92% (good!)
> - Access Control: 45% (needs work!)
> - Network Configuration: 78% (improving)"

**Click on "Access Control" row** → Filters findings to that section

**Point to Worst Hosts Table**:

> "And here are our problem children - `prod-web-03` is only 32% compliant. Let's investigate."

**Click on `prod-web-03`** → Navigates to host-specific findings

---

### Act 3: Findings Explorer (3 min) - Show Detail

**Now viewing**: Findings for prod-web-03

**Script:**

> "Here we see every failed compliance check for this host. Let me filter to just the failed findings..."

**Click**: Failed filter

**Point to findings table**:

> "45 failed checks total. Let's look at a critical one."

**Click first finding** → Opens finding detail flyout

**Script:**

> "This finding shows: **CIS 1.5.2 - Bootloader password not set**"
>
> "**Evidence** from osquery:"
> - Queried: `/boot/grub/grub.cfg`
> - Found: No password configuration
> - Result: **Failed**
>
> "**Remediation** is right here:"
> - `grub2-setpassword`
> - Set password in grub config
> - Reboot to apply
>
> "Security teams can immediately act on this."

**Close flyout**

---

### Act 4: Custom Rule Authoring (2 min) - Show Flexibility

**Navigate to**: Rules → Create Rule

**Script:**

> "Pre-built CIS benchmarks are great, but you need custom rules for organization-specific policies."
>
> "Let's create a rule: **No test processes in production**."

**Fill form** (talk through it):
- **Name**: "No test processes in production"
- **Query** (type in query builder):
  ```sql
  SELECT * FROM processes
  WHERE name LIKE '%test%' OR name LIKE '%debug%';
  ```
- **Platform**: Linux
- **Expected State**: Empty (no test processes should exist)
- **Remediation**: "Kill test processes and remove from startup"

**Script**:

> "The query builder provides syntax highlighting and validation."
>
> "We can even **test this query** against a live agent before saving..."

**Click**: Test Query button (if implemented)

**Script**:

> "Query returned 0 rows on our test agent - good! No debug processes."
>
> "Let's save this rule."

**Click**: Save

**Script**:

> "Rule is now saved. To activate it, we deploy the benchmark to Fleet..."

---

### Act 5: Exception Management (2 min) - Show Control

**Navigate to**: Compliance → Exceptions

**Script:**

> "Not every failed finding is a security issue. Development environments need different rules."
>
> "Let's create an exception for our dev servers."

**Click**: Create Exception

**Fill form**:
- **Scope**: Host
- **Hostname**: `dev-web-01`
- **Rule**: CIS 1.5.2 (Bootloader password)
- **Reason**: "Development environment - not exposed to internet"
- **Expiration**: 90 days (temporary exception)

**Click**: Save

**Script**:

> "This exception will suppress bootloader password findings for `dev-web-01` for the next 90 days."
>
> "After 90 days, it auto-expires and we re-evaluate if the exception is still needed."
>
> "All exceptions are **audited** - who created it, when, why, who approved it."

---

### Act 6: Fleet Deployment (2 min) - Show Scale

**Navigate to**: Rules → Select "CIS Distribution Independent Linux 3.0"

**Script:**

> "Let's deploy this entire benchmark - 127 compliance checks - to our production Linux fleet."

**Click**: Deploy to Fleet

**Select**: Agent Policies → "Production Linux Servers" (45 agents)

**Click**: Deploy

**Script:**

> "This generates an osquery pack with all 127 queries and deploys it via Fleet to 45 agents."
>
> "**Within 5 minutes**, those agents start executing queries and sending results back."
>
> "No SSH required, no manual commands, fully automated."

**Show**: Deployment status panel

**Script:**

> "Deployment successful:"
> - 127 queries deployed
> - 45 agents will execute
> - Estimated first findings: ~5 minutes
> - Full initial scan: ~1 hour (queries run at different intervals)

---

### Act 7: Reporting (1 min) - Show Compliance

**Navigate to**: Compliance → Reports

**Script:**

> "For regulatory compliance, we need audit reports."

**Click**: Generate Report

**Configure**:
- Format: PDF
- Scope: All benchmarks, last 30 days
- Sections: Executive summary, findings, remediation

**Click**: Generate

**Wait**: 3-5 seconds

**Script:**

> "PDF report generated in 5 seconds."
>
> [Open PDF]
>
> "This report includes:"
> - Executive summary for management
> - Detailed findings for security teams
> - Remediation instructions for ops teams
> - Trend charts for compliance tracking
>
> "Perfect for SOC2, ISO27001, or PCI-DSS audits."

---

### Act 8: What's Next (2 min) - Show Roadmap

**Script:**

> "This is a **spike/proof-of-concept**. It validates the approach, but it's not production-ready yet."
>
> "**For production**, we'd add:"
> - Advanced rule validation and sandbox testing
> - Benchmark version migration tools
> - Advanced exception workflows (approval, renewal)
> - Integration with Cloud Security Posture for unified view
> - Scheduled report delivery
> - Advanced analytics and ML-based anomaly detection
>
> "**Timeline**: ~8-10 weeks for production-ready feature (1 engineer), or ~4-5 weeks with 2 engineers in parallel."
>
> "**Questions?**"

---

## Demo Recovery (If Something Goes Wrong)

### Issue: Dashboard shows no data

**Quick Fix**:
```bash
# Re-run sample data load
./docs/demo/load_sample_data.sh

# Force refresh dashboard
# In browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Issue: Feature flag not working

**Quick Fix**:
```bash
# Verify feature flag via API
curl "http://localhost:5601/api/kibana/settings" | grep endpointComplianceMonitoring

# If not set, enable via API
curl -X POST "http://localhost:5601/api/kibana/settings/xpack.osquery.enableExperimental" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{"value": ["endpointComplianceMonitoring"]}'

# Hard refresh browser
```

### Issue: Kibana not responding

**Quick Fix**:
```bash
# Check Kibana status
curl http://localhost:5601/api/status

# Restart Kibana if needed
pkill -f kibana
yarn start
```

### Issue: Can't deploy pack to Fleet

**Fallback**:
- Skip Fleet deployment section
- Show pre-deployed pack status instead
- Explain: "In this demo environment, pack is already deployed"

---

## Demo Tips

### Preparation
- 🎯 **Practice 2-3 times** before live demo
- 📸 **Have backup screenshots** in case live demo fails
- ⏰ **Time yourself** - should be 10-12 minutes comfortably
- 🔊 **Test audio/video** if presenting remotely

### During Demo
- 🗣️ **Speak slowly and clearly** - technical audience needs time to absorb
- 🖱️ **Show, don't tell** - click through workflows rather than describing
- ⏸️ **Pause for questions** after each act (especially after Act 2, 4, 6)
- 📊 **Highlight numbers** - 73% score, 127 rules, 45 agents, 5 minutes to deploy

### Handling Questions
- ✅ **"How does this compare to other tools?"** → "Similar to Tenable's compliance module, but integrated with Elastic Stack - no separate agent, no data silos"
- ✅ **"What's the agent overhead?"** → "osquery uses ~50-100MB RAM, <5% CPU during query execution"
- ✅ **"Can we customize benchmarks?"** → "Absolutely - custom rules, exceptions, mixed benchmarks"
- ✅ **"Is this ready for production?"** → "This is a spike validating the approach. Production-ready in 8-10 weeks."

### Recovery Phrases (If Demo Fails)
- "Let me show you the screenshots instead..." → Flip to backup slides
- "This is a development environment, so there's some flakiness..." → Acknowledge, move on
- "The important thing is the concept, not the demo..." → Refocus on value prop

---

## Post-Demo

**Cleanup** (run after demo):
```bash
./docs/demo/demo_cleanup.sh

# What it does:
# - Disables feature flag
# - Deletes sample data
# - Stops Kibana (optional)
# - Resets to pre-demo state
```

**Follow-up Materials** (send to attendees):
- PDF of slides
- Link to spike PR
- User guide PDF
- Contact for questions: security-team@elastic.co

---

**Demo Confidence**: 🟢 **HIGH** (if setup script runs successfully)
**Demo Risk**: 🟡 **MEDIUM** (live demo always has risks - have screenshots ready)
**Demo Impact**: 🚀 **HIGH** (visual, interactive, shows real value)
