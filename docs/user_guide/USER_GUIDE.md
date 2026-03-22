# Endpoint Compliance Monitoring - User Guide

**Version**: 1.0.0
**Last Updated**: 2026-03-22

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Compliance Dashboard](#compliance-dashboard)
4. [Findings Explorer](#findings-explorer)
5. [Rules Management](#rules-management)
6. [Custom Rule Authoring](#custom-rule-authoring)
7. [Exception Management](#exception-management)
8. [Reports](#reports)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Endpoint Compliance Monitoring uses osquery to continuously assess endpoint configuration compliance against industry benchmarks (CIS, PCI-DSS, etc.) and custom security policies.

### Key Features

✅ **Pre-built Benchmarks**: CIS benchmarks for Linux, macOS, Windows
✅ **Custom Rules**: Create organization-specific compliance checks
✅ **Real-time Monitoring**: Continuous assessment via Fleet-deployed osquery packs
✅ **Exception Management**: Suppress rules for specific hosts or scenarios
✅ **Compliance Scoring**: Automated scoring with trend analysis
✅ **Audit Reports**: PDF/CSV reports for regulatory compliance

### How It Works

```
┌─────────────┐
│ CIS Benchmark│
│   Rules      │ ──┐
└──────────────┘   │
                   │ Generate
┌──────────────┐   │ osquery
│ Custom Rules │ ──┤ pack
└──────────────┘   │
                   ▼
              ┌──────────────┐
              │ Fleet Pack   │
              │  Deployment  │
              └───────┬──────┘
                      │ Deploy to
                      ▼
              ┌───────────────┐
              │ Elastic Agents│
              │  (Endpoints)  │
              └───────┬───────┘
                      │ Execute queries
                      │ every N seconds
                      ▼
              ┌───────────────┐
              │  Compliance   │
              │   Findings    │
              └───────┬───────┘
                      │ Deduplicate
                      │ via Transform
                      ▼
              ┌───────────────┐
              │   Latest      │
              │  Findings     │
              └───────┬───────┘
                      │ Calculate
                      ▼
              ┌───────────────┐
              │ Compliance    │
              │    Score      │
              └───────────────┘
```

---

## Getting Started

### Prerequisites

Before using Endpoint Compliance Monitoring, ensure:

1. ✅ **Fleet is configured** in Kibana
2. ✅ **Elastic Agents deployed** to endpoints you want to monitor
3. ✅ **Osquery integration installed** in Fleet (automatically included)
4. ✅ **Compliance feature enabled** (see below)

### Enable Compliance Feature

**Step 1**: Navigate to **Stack Management → Advanced Settings**

**Step 2**: Search for: `xpack.osquery.enableExperimental`

**Step 3**: Add value: `endpointComplianceMonitoring`

**Step 4**: Click **Save**

**Step 5**: **Hard refresh** Kibana (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### First-Time Setup

**Step 1: Deploy Your First Benchmark**

1. Navigate to **Osquery → Compliance → Rules**
2. Select a benchmark card (e.g., "CIS Distribution Independent Linux v3.0")
3. Click **Deploy to Fleet**
4. Select agent policies (e.g., "Linux Servers")
5. Click **Deploy**

**Step 2: Wait for Findings** (~5-10 minutes)

Agents will begin executing queries and sending results back. Initial findings appear within 5-10 minutes (depending on query intervals).

**Step 3: View Compliance Score**

Navigate to **Osquery → Compliance → Dashboard** to see your compliance score.

---

## Compliance Dashboard

### Overview

The dashboard provides an at-a-glance view of your endpoint compliance posture.

### Widgets

**1. Compliance Score Gauge**
- Shows overall compliance percentage (0-100%)
- Color-coded: 🟢 90-100% (Good), 🟡 70-89% (Fair), 🔴 <70% (Poor)
- Click to see detailed breakdown

**2. Compliance Trend Chart**
- Shows score changes over time (last 7, 30, or 90 days)
- Helps identify compliance degradation or improvement

**3. Compliance by Section**
- Table showing scores by CIS section (e.g., "Initial Setup", "Services")
- Click section to filter findings

**4. Worst Hosts**
- Lists hosts with lowest compliance scores
- Click hostname to view host-specific findings

**5. Recent Findings**
- Latest failed findings across all hosts
- Click to view finding details

### Actions

- 🔄 **Refresh**: Update dashboard with latest data
- 📥 **Export**: Download dashboard data as CSV
- ⚙️ **Configure**: Customize dashboard widgets (admin only)

---

## Findings Explorer

### Viewing Findings

Navigate to **Osquery → Compliance → Findings** to explore all compliance findings.

### Filtering

**By Status**:
- 🔴 **Failed**: Shows only failed compliance checks
- 🟢 **Passed**: Shows only passed checks
- ⚪ **All**: Shows all findings

**By Benchmark**:
- Click benchmark dropdown
- Select one or more benchmarks
- Findings update automatically

**By Host**:
- Enter hostname in search box
- Use wildcards: `prod-web-*`

**By Time Range**:
- Use global time picker (top-right)
- Common selections: Last 7 days, Last 30 days, Today

### Finding Details

Click any finding row to open detail flyout:

**Details include**:
- **Rule Information**: Name, description, remediation
- **Host Information**: Hostname, IP, OS details
- **Evidence**: Query results showing why check failed
- **Timestamp**: When check was performed
- **Agent Information**: Which agent reported the finding

### Bulk Actions

Select multiple findings using checkboxes:
- ✅ **Create Exception**: Suppress selected findings
- 📧 **Email**: Send findings to security team
- 🔗 **Create Detection Rule**: Convert to Elastic Security detection rule

---

## Rules Management

### Viewing Rules

Navigate to **Osquery → Compliance → Rules**.

**View Modes**:
- **By Benchmark**: Grouped into benchmark cards (default)
- **Flat List**: All rules in a sortable table

### Managing Rules

**Enable/Disable Rules**:
1. Find rule in table
2. Click toggle switch in "Enabled" column
3. Confirmation toast appears

**View Rule Details**:
- Click rule row to open detail flyout
- Shows: Query, remediation, benchmark mapping, frameworks

**Deploy Rules to Fleet**:
1. Select benchmark card
2. Click **Deploy to Fleet**
3. Select target agent policies
4. Click **Deploy**
5. Agents begin executing queries within minutes

---

## Custom Rule Authoring

### Creating Custom Rules

Navigate to **Osquery → Compliance → Rules → Create Rule**.

**Step 1: Basic Information**
- **Rule ID**: Unique identifier (e.g., `custom-no-debug-processes`)
- **Name**: Human-readable name (e.g., "No debug processes in production")
- **Description**: Explain what the rule checks

**Step 2: Osquery Query**
- Write osquery SQL query
- Use query builder for syntax highlighting
- **Example**:
  ```sql
  SELECT * FROM processes
  WHERE name LIKE '%debug%' OR name LIKE '%test%';
  ```

**Step 3: Evaluation Logic**
- **Expected State**: What constitutes compliance?
  - `empty`: No results = passed (default)
  - `not_empty`: Has results = passed
  - `threshold`: Result count must meet condition

- **Example**: "Ensure no debug processes running"
  - Query: `SELECT * FROM processes WHERE name LIKE '%debug%';`
  - Expected: `empty` (no rows = passed)

**Step 4: Rule Metadata**
- **Platform**: linux, darwin, or windows
- **Benchmark**: Select existing or create custom
- **Section**: Group related rules (e.g., "Process Management")
- **Rule Number**: Numbering scheme (e.g., "99.1.1")
- **Level**: 1 (stricter) or 2 (more lenient)
- **Interval**: How often to run (seconds)

**Step 5: Remediation**
- Provide clear remediation steps
- **Example**: "Kill debug processes: `pkill -f debug`"

**Step 6: Test Query** (optional)
- Click **Test Query** to run against sample agent
- Verify query syntax is valid
- See example results

**Step 7: Save**
- Click **Save Rule**
- Rule added to benchmark
- Deploy benchmark to Fleet to activate

### Query Builder Tips

**Syntax Highlighting**: Editor highlights SQL keywords, table names

**Common Tables**:
- `processes`: Running processes
- `users`: User accounts
- `kernel_modules`: Loaded kernel modules
- `listening_ports`: Network listeners
- `file`: File system queries

**Best Practices**:
- ✅ Use `LIKE` for pattern matching
- ✅ Limit results: `LIMIT 100`
- ✅ Filter early: `WHERE` clauses reduce data
- ❌ Avoid `SELECT *` on large tables (use specific columns)
- ❌ Avoid expensive joins (slow on endpoints)

---

## Exception Management

### When to Use Exceptions

Use exceptions to suppress findings for:
- **Development/staging environments**: Different security requirements
- **Known exceptions**: Approved deviations from policy
- **False positives**: Rule incorrectly flags compliant configuration
- **Temporary overrides**: Short-term exceptions with expiration

### Creating Exceptions

Navigate to **Osquery → Compliance → Exceptions → Create Exception**.

**Step 1: Exception Scope**

Choose scope type:

**Host-Scoped** (most common):
- Suppresses rule for specific host(s)
- Use for: Dev machines, special-purpose servers
- Example: "Allow cramfs module on kernel testing server"

**Rule-Scoped**:
- Suppresses rule for ALL hosts
- Use for: Deprecated rules, organization-wide exceptions
- Example: "Rule 1.2.3 not applicable to our environment"

**Global**:
- Suppresses all findings for rule+host combinations
- Use sparingly (broadest impact)

**Step 2: Rule Criteria**
- Select which rules to suppress
- Can select multiple rules

**Step 3: Host Criteria** (if host-scoped)
- Select which hosts to apply to
- Search by hostname or IP
- Can select multiple hosts

**Step 4: Time Scope** (optional)
- **Permanent**: Exception never expires (default)
- **Temporary**: Set expiration date
  - Use for: Planned maintenance windows, temporary fixes
  - Example: "Allow until security patch is deployed on 2026-04-01"

**Step 5: Justification**
- **Reason**: Why is this exception necessary?
- **Business Justification**: Regulatory or business need
- **Risk Assessment**: What risk does this introduce?

**Step 6: Approval** (if configured)
- Submit for approval (enterprise feature)
- Auto-approved for low-risk exceptions

### Managing Exceptions

**View Active Exceptions**:
- Navigate to **Osquery → Compliance → Exceptions**
- Filter by scope, status, expiration

**Edit Exception**:
- Click exception row
- Modify scope, time range, or justification
- Requires re-approval if configured

**Delete Exception**:
- Click delete icon
- Confirm deletion
- Findings will re-appear in score calculations

**Audit Trail**:
- Click exception row → Audit tab
- Shows: Created by, approved by, modifications, deletions

---

## Reports

### Generating Reports

Navigate to **Osquery → Compliance → Reports → Generate Report**.

**Step 1: Report Format**
- **PDF**: Executive summary with charts (for management)
- **CSV**: Detailed findings data (for analysis)

**Step 2: Report Scope**
- **Benchmarks**: Select which benchmarks to include
- **Hosts**: Select specific hosts or "All"
- **Time Range**: Last 7 days, 30 days, custom range

**Step 3: Sections** (PDF only)
- ✅ Executive Summary: High-level compliance score
- ✅ Findings: Detailed failed checks
- ✅ Remediation: Actionable fix recommendations
- ✅ Trend Analysis: Score changes over time
- ✅ Host Breakdown: Per-host compliance scores

**Step 4: Generate**
- Click **Generate Report**
- Report downloads automatically (may take 5-30 seconds for large scopes)

### Scheduled Reports

**Enterprise Feature** (on roadmap):
- Schedule daily/weekly/monthly reports
- Email to distribution list
- Automated delivery for regulatory audits

---

## Best Practices

### Rule Management

✅ **Start with pre-built benchmarks**: Don't reinvent CIS benchmarks
✅ **Enable gradually**: Deploy to dev → staging → production
✅ **Review quarterly**: Benchmarks update annually (CIS releases new versions)
✅ **Customize selectively**: Only create custom rules for organization-specific needs
❌ **Don't enable all rules**: Some CIS rules may not apply to your environment

### Exception Management

✅ **Document why**: Always provide clear justification
✅ **Use time-bounds**: Temporary exceptions should expire
✅ **Review regularly**: Quarterly exception review workflow
✅ **Least privilege**: Use host-scoped over global
❌ **Don't use for convenience**: Exceptions reduce security posture

### Performance

✅ **Limit query intervals**: 1-hour minimum for most rules
✅ **Stagger deployments**: Don't deploy all benchmarks to all agents at once
✅ **Monitor agent load**: osquery queries consume CPU/memory
❌ **Don't run expensive queries**: Avoid joins, large tables

---

## Troubleshooting

### No findings appearing

**Symptom**: Deployed pack but no findings after 15 minutes

**Check**:
1. **Is pack deployed?** → Compliance → Rules → Check "Deployment Status"
2. **Are agents online?** → Fleet → Agents → Check agent status
3. **Are queries executing?** → Check agent logs: `/var/log/elastic-agent/osqueryd.log`

**Common Causes**:
- Agent not online
- osquery integration not installed in Fleet
- Query syntax error (check logs)
- Network connectivity issues

---

### Score not updating

**Symptom**: Findings arrive but compliance score doesn't change

**Check**:
1. **Refresh dashboard** → Click refresh icon
2. **Check transform health** → Stack Management → Transforms → `compliance-findings-latest`
3. **Force refresh** → Wait 5 minutes for cache to expire

**Common Causes**:
- Transform stopped (restart in Stack Management)
- Score cache not expired (wait 5 minutes)
- Elasticsearch index issue (check Kibana logs)

---

### Exception not working

**Symptom**: Created exception but findings still appear in score

**Check**:
1. **Is exception active?** → Exceptions page → Status column
2. **Does scope match?** → Verify host ID, rule ID are correct
3. **Expiration date?** → Check exception hasn't expired
4. **Include exceptions enabled?** → Dashboard → Settings → "Include exceptions in score"

**Common Causes**:
- Exception scope doesn't match finding (typo in host ID)
- Exception expired
- Exception disabled

---

### High CPU usage from osquery

**Symptom**: Endpoints showing high CPU usage from osqueryd

**Solutions**:
1. **Increase query intervals**: Change interval from 1h → 4h for non-critical rules
2. **Disable expensive queries**: Identify slow queries in logs, disable temporarily
3. **Reduce scope**: Deploy different benchmarks to different agent policies (not all-to-all)
4. **Optimize queries**: Use `WHERE` filters, `LIMIT` results, avoid joins

**Example**:
```sql
-- ❌ Expensive (scans entire process table)
SELECT * FROM processes;

-- ✅ Optimized (filters and limits)
SELECT name, pid FROM processes
WHERE name LIKE '%suspicious%'
LIMIT 100;
```

---

## FAQs

### Q: How often are findings refreshed?
**A**: Findings refresh at the query interval (default: 1 hour). Dashboard shows latest findings with ~5 minute lag (transform processing + cache).

### Q: Can I use this for PCI-DSS compliance?
**A**: Yes! Create custom rules mapped to PCI-DSS controls. Pre-built PCI-DSS benchmarks coming in Q2 2026.

### Q: What's the difference between compliance monitoring and runtime protection?
**A**: Compliance monitors **configuration state** (is password policy configured?). Runtime protection detects **malicious behavior** (is malware executing?). Both are complementary.

### Q: How do I map findings to detection rules?
**A**: In Findings Explorer, select findings → Bulk Actions → Create Detection Rule. This creates Elastic Security detection rules for runtime alerting.

### Q: Can I export data for external SIEM?
**A**: Yes! Use CSV export or query Elasticsearch directly (`compliance-findings-*` indices).

---

## Getting Help

- 📘 **Documentation**: [API Reference](../api/API_REFERENCE.md)
- 🛠️ **Administrator Guide**: [Admin Guide](ADMIN_GUIDE.md)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/elastic/kibana/issues)
- 💬 **Community**: [Elastic Discuss](https://discuss.elastic.co/)

---

**Document Version**: 1.0
**Feature Status**: Experimental (behind feature flag)
**Feedback**: security-team@elastic.co
