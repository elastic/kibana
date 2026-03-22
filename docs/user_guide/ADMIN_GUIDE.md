# Endpoint Compliance Monitoring - Administrator Guide

**Version**: 1.0.0
**Audience**: Kibana Administrators, DevOps Engineers
**Last Updated**: 2026-03-22

---

## Table of Contents

1. [Installation & Configuration](#installation--configuration)
2. [Fleet Integration Setup](#fleet-integration-setup)
3. [Transform Management](#transform-management)
4. [Performance Tuning](#performance-tuning)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Backup & Recovery](#backup--recovery)
7. [Security Hardening](#security-hardening)
8. [Troubleshooting](#troubleshooting)

---

## Installation & Configuration

### Enable Feature

**Method 1: kibana.yml (recommended for production)**

```yaml
xpack.osquery.enableExperimental:
  - endpointComplianceMonitoring
```

**Method 2: Advanced Settings UI**

1. Stack Management → Advanced Settings
2. Search: `xpack.osquery.enableExperimental`
3. Add: `endpointComplianceMonitoring`
4. Save and refresh Kibana

### Prerequisites

**Required**:
- Elasticsearch 8.15+
- Kibana 8.15+
- Fleet Server configured
- Elastic Agents deployed with osquery integration

**Cluster Requirements**:
- Transforms enabled (default: enabled)
- ILM enabled (default: enabled)
- Minimum 3 data nodes (for transform stability)

---

## Fleet Integration Setup

### Verify osquery Integration

**Check if installed**:
```bash
curl -X GET "http://localhost:5601/api/fleet/epm/packages/osquery_manager" \
  -H "kbn-xsrf: true" \
  --cookie "sid=..."
```

**Install if missing**:
1. Fleet → Integrations
2. Search: "Osquery Manager"
3. Click **Add Osquery Manager**
4. Click **Install**

### Create Agent Policy

**For compliance monitoring**:
1. Fleet → Agent Policies → **Create Agent Policy**
2. Name: `Linux Compliance Monitoring`
3. Description: `CIS Linux benchmark monitoring`
4. Namespace: `default`
5. Click **Create**

**Best Practice**: Create separate agent policies per OS:
- `Linux Compliance` → CIS Linux, custom Linux rules
- `macOS Compliance` → CIS macOS rules
- `Windows Compliance` → CIS Windows rules

### Deploy Compliance Pack

**Via UI**:
1. Osquery → Compliance → Rules
2. Select benchmark (e.g., "CIS Linux 3.0")
3. Deploy to Fleet → Select agent policy
4. Deploy

**Via API**:
```bash
curl -X POST "http://localhost:5601/internal/osquery/compliance/deploy" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "benchmark_id": "cis-linux",
    "agent_policy_ids": ["linux-compliance-policy-id"],
    "enabled": true
  }'
```

### Verify Deployment

```bash
# Check package policy was created
curl -X GET "http://localhost:5601/api/fleet/package_policies" \
  -H "kbn-xsrf: true" | jq '.items[] | select(.name | contains("osquery-compliance"))'

# Check agent received pack
# (On agent host)
cat /opt/Elastic/Agent/data/osquery/osquery.conf
```

---

## Transform Management

### Compliance Findings Transform

**Purpose**: Deduplicates findings to show latest state per host+rule combination.

**Transform ID**: `compliance-findings-latest`

**Source Index**: `compliance-findings-default`

**Destination Index**: `compliance-findings-latest-default`

### Monitoring Transform Health

**Via Kibana UI**:
1. Stack Management → Transforms
2. Search: `compliance-findings-latest`
3. Check **State** column (should be "started")
4. Check **Health** column (should be "green")

**Via API**:
```bash
GET /_transform/compliance-findings-latest/_stats
```

**Expected Output**:
```json
{
  "transforms": [{
    "id": "compliance-findings-latest",
    "state": "started",
    "health": {
      "status": "green"
    },
    "checkpointing": {
      "last": {
        "checkpoint": 145,
        "timestamp_millis": 1711099200000
      }
    }
  }]
}
```

### Transform Failures

**Symptom**: Transform state = "failed"

**Check logs**:
```bash
# Kibana logs
tail -f /var/log/kibana/kibana.log | grep compliance-findings-latest

# Elasticsearch logs
tail -f /var/log/elasticsearch/elasticsearch.log | grep transform
```

**Common Issues**:
- **Mapping conflict**: Source index mapping changed (recreate transform)
- **Insufficient memory**: Increase transform heap (Elasticsearch settings)
- **Circuit breaker**: Too many documents processing (reduce frequency)

**Recovery**:
```bash
# Stop transform
POST /_transform/compliance-findings-latest/_stop?force=true

# Delete transform
DELETE /_transform/compliance-findings-latest

# Delete destination index
DELETE /compliance-findings-latest-default

# Re-enable feature (recreates transform)
# In kibana.yml: xpack.osquery.enableExperimental: [endpointComplianceMonitoring]
# Restart Kibana
```

---

## Performance Tuning

### Query Interval Optimization

**Default intervals**:
- CIS Level 1 rules: 1 hour (3600 seconds)
- CIS Level 2 rules: 4 hours (14400 seconds)
- Custom rules: Configurable

**Tuning Guidelines**:

| Environment | Recommended Intervals | Reasoning |
|-------------|---------------------|-----------|
| **Production** | 1-2 hours | Balance freshness vs load |
| **Staging** | 4-6 hours | Less critical, reduce load |
| **Development** | 12-24 hours | Minimal monitoring needed |

**Adjust globally via API**:
```bash
# Increase all intervals by 2x
curl -X POST "http://localhost:5601/internal/osquery/compliance/rules/_bulk_update" \
  -d '{"updates": {"interval_multiplier": 2}}'
```

### Transform Performance

**Settings** (in `elasticsearch.yml`):
```yaml
# Transform thread pool
transform.num_transform_workers: 4

# Transform heap
transform.max_pages: 500
```

**Monitoring**:
```bash
# Check transform throughput
GET /_transform/compliance-findings-latest/_stats

# Look for:
# - documents_processed: Should be > 0
# - processing_time_in_ms: Should be < 1000ms
# - exponential_avg_checkpoint_duration_ms: Should be < 5000ms
```

### Index Lifecycle Management (ILM)

**Policy**: `compliance-findings-latest-policy`

**Default Settings**:
- **Hot phase**: Keep for 30 days
- **Warm phase**: After 30 days (read-only)
- **Delete phase**: After 90 days

**Customize for your retention requirements**:
```bash
PUT /_ilm/policy/compliance-findings-latest-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "30d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "readonly": {}
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

**Transform Health**:
- Transform state (should be "started")
- Documents processed rate (should be > 0)
- Processing lag (should be < 5 minutes)
- Failure count (should be 0)

**Pack Deployment Health**:
- Package policy count
- Agent count per policy
- Query execution success rate

**Finding Ingestion Rate**:
- Findings per minute
- Failed findings ratio
- Index size growth

### Alerting Rules

**Create alerts for**:

**1. Transform Stopped**
```
When: compliance-findings-latest state != "started"
Action: Email admin team
```

**2. No Findings for 2+ Hours**
```
When: No new documents in compliance-findings-* for 2h
Action: Email admin team + Slack notification
```

**3. Compliance Score Drops >10%**
```
When: Current score < (previous score - 10)
Action: Email security team
```

**4. Pack Deployment Failed**
```
When: Pack deployment status = "failed"
Action: Email admin team
```

### Setup Alerts via API

```bash
# Example: Alert on transform stopped
curl -X POST "http://localhost:5601/api/alerting/rule" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Compliance Transform Stopped",
    "rule_type_id": "transform_health",
    "schedule": { "interval": "5m" },
    "params": {
      "includeTransforms": ["compliance-findings-latest"],
      "check_health": true
    },
    "actions": [{
      "group": "transform.health.status",
      "id": "email-connector-id",
      "params": {
        "to": ["admin@example.com"],
        "subject": "Compliance Transform Stopped",
        "message": "compliance-findings-latest transform is not started"
      }
    }]
  }'
```

---

## Backup & Recovery

### Backup Saved Objects

**Export compliance rules and exceptions**:

```bash
# Export via Kibana UI
# Stack Management → Saved Objects → Export → Select:
# - osquery-compliance-rule
# - osquery-compliance-exception

# Or via API
curl -X POST "http://localhost:5601/api/saved_objects/_export" \
  -H "kbn-xsrf: true" \
  -d '{"type": ["osquery-compliance-rule", "osquery-compliance-exception"]}' \
  --output compliance_backup.ndjson
```

**Import after disaster**:
```bash
curl -X POST "http://localhost:5601/api/saved_objects/_import" \
  -H "kbn-xsrf: true" \
  --form file=@compliance_backup.ndjson
```

### Backup Findings Data

**Snapshot compliance indices**:
```bash
# Create snapshot repository (if not exists)
PUT /_snapshot/compliance_backups
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups/elasticsearch"
  }
}

# Create snapshot
PUT /_snapshot/compliance_backups/snapshot_2026-03-22
{
  "indices": "compliance-findings-*",
  "include_global_state": false
}
```

**Restore**:
```bash
POST /_snapshot/compliance_backups/snapshot_2026-03-22/_restore
{
  "indices": "compliance-findings-*"
}
```

---

## Security Hardening

### API Access Control

**Restrict compliance API access**:

```yaml
# kibana.yml
xpack.security.enabled: true

# Create role for compliance administrators only
```

**Role Definition**:
```json
{
  "compliance_admin": {
    "cluster": [],
    "indices": [
      {
        "names": ["compliance-findings-*", ".fleet-*"],
        "privileges": ["read", "write", "manage"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana",
        "privileges": ["feature_osquery.all"],
        "resources": ["*"]
      }
    ]
  }
}
```

### Encrypt Sensitive Data

**Enable encryption for saved objects** (kibana.yml):

```yaml
xpack.encryptedSavedObjects.encryptionKey: "min-32-char-encryption-key-here-change-this"
```

**Rotate encryption key**:
```bash
./bin/kibana-encryption-keys generate -q
# Update kibana.yml with new key
# Restart Kibana
```

### Audit Logging

**Enable audit logging** (kibana.yml):

```yaml
xpack.security.audit.enabled: true
xpack.security.audit.appender:
  type: file
  fileName: /var/log/kibana/kibana_audit.log
```

**Log compliance actions**:
- Rule creation/updates/deletion
- Exception creation/deletion
- Pack deployments
- Report generation

---

## Migration & Upgrades

### Upgrading Benchmark Versions

**Example: CIS Linux 2.0 → 3.0**

**Step 1: Review Changes**
```bash
GET /internal/osquery/compliance/benchmarks/cis-linux/versions
# Compare v2.0.0 vs v3.0.0 changes
```

**Step 2: Test in Staging**
- Deploy v3.0 to staging agents
- Monitor for new failures
- Adjust exceptions as needed

**Step 3: Gradual Rollout**
- Deploy v3.0 to 10% of production agents
- Monitor for 1 week
- Expand to 50%, then 100%

**Step 4: Deprecate Old Version**
- Disable v2.0 rules
- Archive v2.0 findings (keep for audit)
- Remove v2.0 packs from Fleet

### Rollback Procedures

**If upgrade causes issues**:

```bash
# 1. Stop current pack deployment
DELETE /api/fleet/package_policies/{cis-linux-v3-package-policy-id}

# 2. Re-deploy previous version
POST /internal/osquery/compliance/deploy
{
  "benchmark_id": "cis-linux",
  "version": "2.0.0",
  "agent_policy_ids": ["linux-policy"]
}

# 3. Verify findings resume
# Check compliance-findings-* indices for new documents
```

---

## Troubleshooting

### Transform Not Processing

**Symptoms**:
- Transform state = "stopped" or "failed"
- No new documents in `compliance-findings-latest-*`
- Dashboard shows stale data

**Diagnosis**:
```bash
# Check transform stats
GET /_transform/compliance-findings-latest/_stats

# Check for errors in transform
GET /_transform/compliance-findings-latest

# Check Elasticsearch logs
grep "compliance-findings-latest" /var/log/elasticsearch/elasticsearch.log
```

**Fix**:
```bash
# Reset and restart transform
POST /_transform/compliance-findings-latest/_stop?force=true
POST /_transform/compliance-findings-latest/_reset
POST /_transform/compliance-findings-latest/_start
```

### High Elasticsearch Load

**Symptoms**:
- High CPU usage on ES nodes
- Slow query performance
- Transform lag increasing

**Diagnosis**:
```bash
# Check hot threads
GET /_nodes/hot_threads

# Check slow queries
GET /compliance-findings-*/_search
{
  "profile": true,
  "query": {"match_all": {}}
}
```

**Solutions**:
1. **Reduce query frequency**: Increase rule intervals
2. **Shard optimization**: Ensure proper shard count (1 shard per 50GB)
3. **Index lifecycle**: Move old findings to warm tier faster
4. **Resource scaling**: Add data nodes if consistently loaded

### Pack Not Deploying

**Symptoms**:
- Deploy API returns error
- Package policy not created in Fleet
- Agents not receiving pack

**Diagnosis**:
```bash
# Check Fleet API health
curl -X GET "http://localhost:5601/api/status" | jq '.status.plugins.fleet'

# Check Fleet Server connectivity
curl -X GET "http://localhost:5601/api/fleet/agents" | jq '.total'

# Check Kibana logs for Fleet errors
grep "fleet" /var/log/kibana/kibana.log | grep ERROR
```

**Fixes**:
1. **Restart Fleet Server**: `sudo systemctl restart elastic-agent` (on Fleet Server host)
2. **Re-configure Fleet**: Stack Management → Fleet → Settings → Verify Fleet Server URL
3. **Check agent policy exists**: Fleet → Agent Policies → Verify target policy ID

---

## Performance Benchmarks

**Expected Performance** (with default configuration):

| Metric | Target | Acceptable | Action if Exceeded |
|--------|--------|------------|-------------------|
| Transform lag | < 2 min | < 5 min | Check transform stats, increase resources |
| Finding ingestion rate | 100-1000/min | 10-100/min | Check agent connectivity |
| Dashboard load time | < 2s | < 5s | Check index size, optimize queries |
| Score calculation time | < 500ms | < 2s | Check findings count, add caching |
| Pack deployment time | < 5s | < 15s | Check Fleet API latency |

---

## Maintenance Tasks

### Weekly
- [ ] Review transform health
- [ ] Check agent policy assignments
- [ ] Review failed pack deployments

### Monthly
- [ ] Review and renew temporary exceptions
- [ ] Analyze compliance trends
- [ ] Check for benchmark updates
- [ ] Review audit logs for unauthorized access

### Quarterly
- [ ] Review custom rules for relevance
- [ ] Update benchmark versions (if new releases)
- [ ] Performance tuning based on growth
- [ ] Capacity planning for next quarter

---

## Security Best Practices

✅ **Enable RBAC**: Restrict compliance access to authorized teams
✅ **Audit logging**: Log all compliance configuration changes
✅ **Encrypt saved objects**: Protect rules and exceptions at rest
✅ **Network segmentation**: Separate Fleet traffic from user traffic
✅ **Least privilege**: Grant minimum necessary Fleet permissions
❌ **Don't share API keys**: Use individual user authentication
❌ **Don't disable auth**: Always require authentication for APIs

---

## Support & Escalation

**Internal Support**:
1. Check Kibana logs: `/var/log/kibana/kibana.log`
2. Check Elasticsearch logs: `/var/log/elasticsearch/elasticsearch.log`
3. Check transform stats: `GET /_transform/_stats`
4. Check Fleet health: Fleet UI → Fleet Server status

**External Support**:
- 📧 **Email**: security-team@elastic.co
- 🎫 **Support Ticket**: [support.elastic.co](https://support.elastic.co)
- 💬 **Community**: [discuss.elastic.co](https://discuss.elastic.co)
- 🐛 **Bug Reports**: [github.com/elastic/kibana/issues](https://github.com/elastic/kibana/issues)

**Include in support requests**:
- Kibana version
- Elasticsearch version
- Fleet Server version
- Compliance feature enabled status
- Relevant error logs
- Transform stats output
- Agent count and policies

---

**Document Version**: 1.0
**Feature Status**: Experimental
**Last Review**: 2026-03-22
