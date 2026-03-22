# Compliance API Reference

**Version**: 1.0.0
**Base Path**: `/internal/osquery/compliance`
**Authentication**: Kibana session auth + kbn-xsrf header

---

## Quick Start

```typescript
// Example: List all compliance rules
const response = await fetch('/internal/osquery/compliance/rules', {
  method: 'GET',
  headers: {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json',
  },
  credentials: 'include',
});

const { rules, total } = await response.json();
console.log(`Found ${total} compliance rules`);
```

---

## Authorization

All endpoints require appropriate Kibana privileges:

| Role | Privileges | Can Do |
|------|-----------|---------|
| **Viewer** | `osquery:read` | View rules, findings, scores |
| **Editor** | `osquery:all` | All viewer actions + create/update/delete rules, exceptions, deploy packs |
| **Admin** | `osquery:all` + `fleet:all` | All editor actions + cleanup, migrations |

---

## Rules API

### List Rules

```http
GET /internal/osquery/compliance/rules
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `benchmark_id` | string | No | Filter by benchmark |
| `platform` | `linux` \| `darwin` \| `windows` | No | Filter by platform |
| `enabled` | boolean | No | Filter by enabled status |
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Results per page (default: 20, max: 1000) |

**Example Request**:
```bash
curl -X GET "http://localhost:5601/internal/osquery/compliance/rules?benchmark_id=cis-linux&platform=linux&enabled=true&page=1&per_page=50" \
  -H "kbn-xsrf: true" \
  --cookie "sid=..."
```

**Example Response**:
```json
{
  "rules": [
    {
      "rule_id": "cis-linux-1.1.1",
      "name": "Ensure mounting of cramfs filesystems is disabled",
      "description": "The cramfs filesystem type is a compressed read-only Linux filesystem...",
      "query": "SELECT * FROM kernel_modules WHERE name = 'cramfs';",
      "remediation": "Edit /etc/modprobe.d/cramfs.conf and add: install cramfs /bin/true",
      "benchmark": {
        "id": "cis-linux",
        "name": "CIS Distribution Independent Linux",
        "version": "3.0.0",
        "posture_type": "endpoint"
      },
      "rule_number": "1.1.1",
      "section": "Initial Setup",
      "level": 1,
      "platform": "linux",
      "frameworks": [
        {
          "id": "cis",
          "version": "3.0",
          "control": "1.1.1"
        }
      ],
      "tags": ["filesystem", "kernel", "security"],
      "enabled": true,
      "interval": 3600,
      "prebuilt": true,
      "resource_type": "kernel_module"
    }
  ],
  "total": 127,
  "page": 1,
  "per_page": 50
}
```

---

### Create Custom Rule

```http
POST /internal/osquery/compliance/rules/_create
```

**Request Body**:
```json
{
  "rule_id": "custom-rule-001",
  "name": "No test processes running",
  "description": "Ensures no test/debug processes are running in production",
  "query": "SELECT * FROM processes WHERE name LIKE '%test%' OR name LIKE '%debug%';",
  "remediation": "Kill test processes and remove from startup scripts",
  "benchmark": {
    "id": "custom-benchmark",
    "name": "Custom Security Policies",
    "version": "1.0.0"
  },
  "rule_number": "99.1",
  "section": "Custom Rules",
  "level": 1,
  "platform": "linux",
  "tags": ["custom", "processes"],
  "enabled": true,
  "interval": 3600
}
```

**Example Response**:
```json
{
  "rule_id": "custom-rule-001",
  "name": "No test processes running",
  "enabled": true,
  "created_at": "2026-03-22T10:30:00Z",
  "created_by": "admin@elastic.co"
}
```

**Validation Rules**:
- `rule_id`: Must be unique, alphanumeric with hyphens
- `name`: 1-200 characters
- `query`: Valid osquery SQL syntax, 10+ characters
- `interval`: 60-86400 seconds (1 min - 24 hours)
- `level`: 1 or 2
- `platform`: Must be one of: linux, darwin, windows

---

### Get Rule by ID

```http
GET /internal/osquery/compliance/rules/{rule_id}
```

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rule_id` | string | Yes | Rule identifier |

**Example Response**: Same as rule object in list response

---

### Update Rule

```http
PUT /internal/osquery/compliance/rules/{rule_id}
```

**Request Body** (partial update allowed):
```json
{
  "enabled": false,
  "interval": 7200,
  "tags": ["updated", "custom"]
}
```

---

### Delete Rule

```http
DELETE /internal/osquery/compliance/rules/{rule_id}
```

**Response**: `204 No Content`

**Note**: Cannot delete prebuilt rules (only disable them)

---

## Findings API

### List Findings

```http
GET /internal/osquery/compliance/findings
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rule_id` | string | No | Filter by rule |
| `host_id` | string | No | Filter by host |
| `evaluation` | `passed` \| `failed` | No | Filter by result |
| `benchmark_id` | string | No | Filter by benchmark |
| `time_range` | string | No | Time range (e.g., "7d", "30d", "now-1h") |
| `page` | integer | No | Page number |
| `per_page` | integer | No | Results per page |

**Example Response**:
```json
{
  "findings": [
    {
      "@timestamp": "2026-03-22T10:30:00Z",
      "result": {
        "evaluation": "failed",
        "evidence": {
          "module_loaded": true,
          "module_name": "cramfs"
        }
      },
      "rule": {
        "id": "cis-linux-1.1.1",
        "name": "Ensure mounting of cramfs filesystems is disabled",
        "benchmark": {
          "id": "cis-linux",
          "version": "3.0.0"
        },
        "section": "Initial Setup",
        "level": 1
      },
      "host": {
        "hostname": "prod-web-01",
        "id": "host-12345",
        "ip": ["10.0.1.50"],
        "os": {
          "family": "linux",
          "platform": "ubuntu",
          "version": "20.04"
        }
      },
      "agent": {
        "id": "agent-67890",
        "version": "8.15.0"
      }
    }
  ],
  "total": 450,
  "page": 1,
  "per_page": 20
}
```

---

## Scores API

### Get Compliance Scores

```http
GET /internal/osquery/compliance/scores
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `host_id` | string | No | Score for specific host |
| `benchmark_id` | string | No | Score for specific benchmark |
| `include_exceptions` | boolean | No | Apply exceptions (default: true) |

**Example Response (Overall Scores)**:
```json
{
  "compliance_score": 87.5,
  "total_findings": 200,
  "passed_findings": 175,
  "failed_findings": 25,
  "benchmarks": [
    {
      "id": "cis-linux",
      "name": "CIS Linux",
      "version": "3.0.0",
      "score": 92.3,
      "total_rules": 127,
      "passed_rules": 117,
      "failed_rules": 10
    }
  ],
  "hosts": [
    {
      "id": "host-001",
      "hostname": "prod-web-01",
      "score": 85.0,
      "failed_checks": 15
    },
    {
      "id": "host-002",
      "hostname": "prod-web-02",
      "score": 90.0,
      "failed_checks": 10
    }
  ]
}
```

**Example Response (Single Host)**:
```bash
GET /internal/osquery/compliance/scores?host_id=host-001
```

```json
{
  "host_id": "host-001",
  "hostname": "prod-web-01",
  "compliance_score": 85.0,
  "total_checks": 100,
  "passed_checks": 85,
  "failed_checks": 15,
  "by_benchmark": [
    {
      "benchmark_id": "cis-linux",
      "score": 85.0,
      "passed": 85,
      "failed": 15
    }
  ],
  "worst_rules": [
    {
      "rule_id": "cis-linux-1.5.2",
      "name": "Ensure bootloader password is set",
      "evaluation": "failed"
    }
  ]
}
```

---

## Exceptions API

### Create Exception

```http
POST /internal/osquery/compliance/exceptions
```

**Request Body**:
```json
{
  "name": "Dev environment - cramfs allowed",
  "description": "Development machines are allowed to have cramfs module for testing",
  "scope": {
    "type": "host",
    "target_id": "host-dev-001"
  },
  "rule_criteria": {
    "rule_ids": ["cis-linux-1.1.1"]
  },
  "host_criteria": {
    "host_ids": ["host-dev-001", "host-dev-002"]
  },
  "time_scope": {
    "type": "temporary",
    "end_date": "2026-12-31T23:59:59Z"
  },
  "reason": "Development environment requires cramfs for kernel testing"
}
```

**Example Response**:
```json
{
  "exception_id": "exception-12345",
  "name": "Dev environment - cramfs allowed",
  "status": "active",
  "created_at": "2026-03-22T10:30:00Z",
  "created_by": "admin@elastic.co"
}
```

---

### List Exceptions

```http
GET /internal/osquery/compliance/exceptions
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `scope` | `host` \| `rule` \| `global` | Filter by scope type |
| `active` | boolean | Filter by active status |

---

## Packs API

### Deploy Pack to Fleet

```http
POST /internal/osquery/compliance/deploy
```

**Request Body**:
```json
{
  "benchmark_id": "cis-linux",
  "agent_policy_ids": ["policy-prod-linux", "policy-staging-linux"],
  "enabled": true
}
```

**Example Response**:
```json
{
  "success": true,
  "package_policy_id": "osquery-cis-linux-abc123",
  "deployed_queries": 127,
  "agent_policies": ["policy-prod-linux", "policy-staging-linux"],
  "deployment_health": "healthy"
}
```

**Deployment Process**:
1. Generates osquery pack from all enabled rules in benchmark
2. Creates Fleet package policy with generated pack
3. Assigns package policy to specified agent policies
4. Elastic agents receive pack and start executing queries
5. Results flow back to Elasticsearch as compliance findings

---

### Get Pack Deployment Status

```http
GET /internal/osquery/compliance/packs/{benchmark_id}/status
```

**Example Response**:
```json
{
  "benchmark_id": "cis-linux",
  "status": "deployed",
  "package_policy_id": "osquery-cis-linux-abc123",
  "agent_policies": [
    {
      "id": "policy-prod-linux",
      "name": "Production Linux Servers",
      "agent_count": 45
    }
  ],
  "deployment_health": "healthy",
  "last_deployed": "2026-03-22T08:00:00Z"
}
```

**Status Values**:
- `deployed`: Pack is deployed and healthy
- `deploying`: Deployment in progress
- `failed`: Deployment failed (check logs)
- `not_deployed`: Pack has not been deployed

---

## Reports API

### Generate Report

```http
POST /internal/osquery/compliance/reports
```

**Request Body**:
```json
{
  "format": "pdf",
  "scope": {
    "benchmark_ids": ["cis-linux", "cis-macos"],
    "host_ids": ["host-001", "host-002"],
    "time_range": "30d"
  },
  "title": "Q1 2026 Compliance Report",
  "include_sections": ["executive_summary", "findings", "remediation"]
}
```

**Response**: Binary PDF or CSV file

**Example (bash)**:
```bash
curl -X POST "http://localhost:5601/internal/osquery/compliance/reports" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  --cookie "sid=..." \
  -d '{"format":"pdf","scope":{"benchmark_ids":["cis-linux"]}}' \
  --output compliance_report.pdf
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed: query must be valid osquery SQL syntax"
}
```

**Common Status Codes**:
| Code | Meaning | Typical Cause |
|------|---------|---------------|
| `200` | Success | Request completed successfully |
| `201` | Created | Resource created successfully |
| `204` | No Content | Resource deleted successfully |
| `400` | Bad Request | Invalid input, validation failed |
| `401` | Unauthorized | Not authenticated |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `500` | Internal Server Error | Server error (check logs) |

---

## Rate Limiting

**Not currently implemented**, but recommended for production:
- Max 100 requests/minute per user
- Max 1000 requests/minute per cluster
- Report generation: Max 10 concurrent requests

---

## Webhooks / Events

**Not currently implemented**, but on roadmap:
- `compliance.finding.created` - New finding indexed
- `compliance.score.changed` - Compliance score changed by >5%
- `compliance.exception.created` - New exception added
- `compliance.pack.deployed` - Pack deployed to Fleet

---

## Pagination

All list endpoints support pagination:

```http
GET /internal/osquery/compliance/findings?page=2&per_page=50
```

**Response includes pagination metadata**:
```json
{
  "findings": [...],
  "total": 450,
  "page": 2,
  "per_page": 50,
  "total_pages": 9
}
```

---

## Filtering and Searching

### Time Range Formats

Supported time range formats:
- **Relative**: `7d`, `30d`, `90d`, `1h`, `24h`
- **Elasticsearch**: `now-7d`, `now-1h`, `now/d`
- **Absolute**: ISO 8601 timestamps

### Boolean Filters

Use `true`/`false` strings for boolean parameters:
```http
GET /internal/osquery/compliance/rules?enabled=true
GET /internal/osquery/compliance/exceptions?active=false
```

---

## Performance Considerations

**Optimize queries**:
1. **Use pagination**: Don't fetch all results at once
2. **Filter early**: Use query parameters to reduce result set
3. **Cache scores**: Scores are cached for 5 minutes
4. **Time range**: Limit findings queries to recent data (7-30 days)

**Expected Response Times**:
| Endpoint | Typical | Max Acceptable |
|----------|---------|----------------|
| List rules | <100ms | 500ms |
| List findings (100 results) | <500ms | 2s |
| Get scores | <200ms | 1s |
| Deploy pack | <3s | 10s |
| Generate report (PDF) | <5s | 30s |

---

## Examples

### Complete Workflow Example

```typescript
// 1. List available benchmarks
const benchmarksResp = await fetch('/internal/osquery/compliance/benchmarks');
const benchmarks = await benchmarksResp.json();
console.log(`Available: ${benchmarks.map(b => b.name).join(', ')}`);

// 2. Get rules for CIS Linux
const rulesResp = await fetch('/internal/osquery/compliance/rules?benchmark_id=cis-linux');
const { rules } = await rulesResp.json();
console.log(`CIS Linux has ${rules.length} rules`);

// 3. Deploy to Fleet
const deployResp = await fetch('/internal/osquery/compliance/deploy', {
  method: 'POST',
  headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    benchmark_id: 'cis-linux',
    agent_policy_ids: ['default'],
  }),
});
const deployment = await deployResp.json();
console.log(`Deployed ${deployment.deployed_queries} queries`);

// 4. Wait for findings to arrive (agents execute queries)
await new Promise(resolve => setTimeout(resolve, 60000));

// 5. Get compliance score
const scoresResp = await fetch('/internal/osquery/compliance/scores');
const scores = await scoresResp.json();
console.log(`Compliance Score: ${scores.compliance_score}%`);

// 6. List failed findings
const findingsResp = await fetch('/internal/osquery/compliance/findings?evaluation=failed');
const { findings } = await findingsResp.json();
console.log(`Failed checks: ${findings.length}`);

// 7. Create exception for dev host
const exceptionResp = await fetch('/internal/osquery/compliance/exceptions', {
  method: 'POST',
  headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Dev host exception',
    scope: { type: 'host', target_id: 'host-dev-001' },
    rule_criteria: { rule_ids: ['cis-linux-1.1.1'] },
    reason: 'Development environment'
  }),
});

// 8. Generate compliance report
const reportResp = await fetch('/internal/osquery/compliance/reports', {
  method: 'POST',
  headers: { 'kbn-xsrf': 'true', 'Content-Type': 'application/json' },
  body: JSON.stringify({ format: 'pdf' }),
});
const reportBlob = await reportResp.blob();
// Save report...
```

---

## Troubleshooting

### Rule not executing

**Symptom**: No findings for deployed rule

**Check**:
1. Verify rule is enabled: `GET /internal/osquery/compliance/rules/{rule_id}`
2. Verify pack is deployed: `GET /internal/osquery/compliance/packs/{benchmark_id}/status`
3. Check Fleet agent status: Fleet UI → Agents
4. Check osquery logs on agent: `/var/log/elastic-agent/osqueryd.log`

### Score not updating

**Symptom**: Compliance score stuck at old value

**Check**:
1. Verify transform is running: Check Kibana logs for transform errors
2. Refresh findings index: `POST compliance-findings-default/_refresh`
3. Check transform stats: Elasticsearch Dev Tools → `GET _transform/compliance-findings-latest/_stats`
4. Clear score cache: Re-save any rule to invalidate cache

### Pack deployment fails

**Symptom**: Pack deployment returns 500 error

**Check**:
1. Verify Fleet is configured: Fleet UI → Settings
2. Check agent policy exists: Fleet UI → Agent Policies
3. Verify osquery integration is installed: Fleet UI → Integrations
4. Check Kibana logs for Fleet API errors

---

## OpenAPI Specification

Full OpenAPI 3.0 spec available at: [compliance_api_spec.yaml](compliance_api_spec.yaml)

**Import into tools**:
- **Postman**: Import → Link → `<kibana-url>/docs/api/compliance_api_spec.yaml`
- **Swagger UI**: `https://editor.swagger.io/` → Import File
- **Code Generation**: `openapi-generator generate -i compliance_api_spec.yaml -g typescript-axios`

---

## Changelog

### v1.0.0 (2026-03-22)
- Initial API release
- Rules CRUD operations
- Findings querying
- Score calculations
- Exception management
- Fleet pack deployment
- Report generation
