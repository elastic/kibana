# Plan: Alerting v2 Rules for the Astronomy Shop Cluster

> Setting up alerting v2 rules against the OpenTelemetry Demo ("Astronomy Shop") running on the remote cluster.

---

## Prerequisites

### Cluster access

- **Elasticsearch**: `https://edge-rca-ccs-acjyc-slack.es.us-west2.gcp.elastic-cloud.com:443`
- **Kibana**: `http://localhost:5605` (local dev instance)
- **Auth**: `admin / C3D2MxOz2CnpUS4C8xleVlad`
- **Remote cluster prefix**: `remote_cluster:`

### Feature flag

Already enabled in `~/dev/kibana-flags.yml`:

```yaml
xpack.alerting_v2.enabled: true
```

### API details

- **Base path**: `/api/alerting/v2/rules`
- **Required headers**: `kbn-xsrf: true`, `Content-Type: application/json`, `x-elastic-internal-origin: kibana`

---

## Phase 0: Data discovery

Before creating any rules, we need to confirm the exact index patterns and field names available on the remote cluster.

### Tasks

- [ ] **0.1** — Query available OTel indices on the remote cluster via ES|QL to confirm patterns:
  ```
  FROM remote_cluster:metrics-*.otel-* | KEEP @timestamp, resource.attributes.service.name | LIMIT 1
  FROM remote_cluster:traces-*.otel-* | KEEP @timestamp, resource.attributes.service.name | LIMIT 1
  FROM remote_cluster:logs-*.otel-* | KEEP @timestamp, resource.attributes.service.name | LIMIT 1
  ```
- [ ] **0.2** — Identify available metric names, trace attributes, and log fields using `_field_caps` or ES|QL `STATS` queries
- [ ] **0.3** — Map the Astronomy Shop services to their telemetry data (which services emit metrics, which emit traces, which emit logs)
- [ ] **0.4** — Confirm `@timestamp` is the time field across all OTel indices (standard for OTel)
- [ ] **0.5** — Test that Kibana on port 5605 can execute ES|QL queries against `remote_cluster:` indices (CCS may have implications)

---

## Phase 1: Service health rules (error rates and availability)

These rules detect when core Astronomy Shop services are experiencing errors.

### Rule 1.1 — Frontend HTTP 500 error rate

The frontend service is logging Product Not Found gRPC errors and returning 500s on `/api/recommendations`.

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: Frontend error rate spike",
    "description": "Alerts when the frontend service error rate exceeds threshold",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "frontend", "error-rate", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "1m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:traces-*.otel-* | WHERE resource.attributes.service.name == \"frontend\" AND status.code == 2 | STATS error_count = COUNT(*) BY resource.attributes.service.name | WHERE error_count > 10"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": {
    "pending_count": 2
  },
  "grouping": { "fields": ["resource.attributes.service.name"] },
  "no_data": { "behavior": "recover", "timeframe": "10m" }
}
```

**Rationale**: `pending_count: 2` means the error rate must be above threshold for 2 consecutive 1-minute checks before the alert becomes active — avoids single-cycle transient spikes.

### Rule 1.2 — Checkout service errors

The checkout service orchestrates cart, product, currency, payment — errors here mean lost orders.

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: Checkout service errors",
    "description": "Alerts when the checkout service has gRPC errors",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "checkout", "error-rate", "critical", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "1m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:traces-*.otel-* | WHERE resource.attributes.service.name == \"checkout\" AND status.code == 2 | STATS error_count = COUNT(*) BY resource.attributes.service.name | WHERE error_count > 5"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": { "pending_count": 1 },
  "grouping": { "fields": ["resource.attributes.service.name"] },
  "no_data": { "behavior": "recover", "timeframe": "10m" }
}
```

### Rule 1.3 — Payment service failures

Failed payments are high-impact — tighter thresholds.

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: Payment service failures",
    "description": "Alerts when payment processing has errors",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "payment", "error-rate", "critical", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "1m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:traces-*.otel-* | WHERE resource.attributes.service.name == \"payment\" AND status.code == 2 | STATS error_count = COUNT(*) BY resource.attributes.service.name | WHERE error_count > 2"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": { "pending_count": 1 },
  "grouping": { "fields": ["resource.attributes.service.name"] }
}
```

---

## Phase 2: Latency rules

These rules detect degraded performance, potentially caused by the Chaos Mesh network delay experiments.

### Rule 2.1 — Service latency (P95) by service

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: High service latency (P95)",
    "description": "Alerts when any service P95 latency exceeds 2 seconds",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "latency", "performance", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "2m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:traces-*.otel-* | WHERE span.kind == \"SERVER\" | STATS p95_duration = PERCENTILE(duration, 95) BY resource.attributes.service.name | WHERE p95_duration > 2000000"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": {
    "pending_count": 3,
    "pending_timeframe": "5m",
    "pending_operator": "OR"
  },
  "grouping": { "fields": ["resource.attributes.service.name"] },
  "no_data": { "behavior": "last_status", "timeframe": "10m" }
}
```

**Rationale**: `pending_count: 3 OR pending_timeframe: 5m` — either 3 consecutive high-latency checks OR sustained high latency for 5 minutes triggers the alert. This handles both the Chaos Mesh experiments (which inject sustained latency) and transient spikes (which the count threshold filters out).

### Rule 2.2 — Checkout end-to-end latency

Checkout involves multiple service hops — track the full operation.

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: Checkout E2E latency",
    "description": "Alerts when checkout PlaceOrder operation takes too long",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "checkout", "latency", "critical", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "1m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:traces-*.otel-* | WHERE resource.attributes.service.name == \"checkout\" AND name == \"PlaceOrder\" | STATS p95_duration = PERCENTILE(duration, 95) | WHERE p95_duration > 5000000"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": { "pending_count": 2 }
}
```

---

## Phase 3: Infrastructure and resource rules

### Rule 3.1 — Kubernetes pod restarts

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: Frequent pod restarts",
    "description": "Alerts when a pod has restarted multiple times recently",
    "owner": "platform-team",
    "tags": ["astronomy-shop", "kubernetes", "infrastructure", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "5m", "lookback": "15m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:metrics-*.otel-* | WHERE metric.name == \"k8s.pod.restart_count\" | STATS max_restarts = MAX(metric.value) BY k8s.pod.name | WHERE max_restarts > 3"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "grouping": { "fields": ["k8s.pod.name"] },
  "no_data": { "behavior": "recover", "timeframe": "30m" }
}
```

### Rule 3.2 — Container CPU usage

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: High container CPU usage",
    "description": "Alerts when a container CPU usage is sustained above 80%",
    "owner": "platform-team",
    "tags": ["astronomy-shop", "kubernetes", "cpu", "infrastructure", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "2m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:metrics-*.otel-* | WHERE metric.name == \"container.cpu.utilization\" | STATS avg_cpu = AVG(metric.value) BY k8s.pod.name | WHERE avg_cpu > 0.8"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": {
    "pending_count": 3,
    "pending_timeframe": "10m",
    "pending_operator": "AND"
  },
  "grouping": { "fields": ["k8s.pod.name"] },
  "no_data": { "behavior": "last_status", "timeframe": "10m" }
}
```

**Rationale**: `pending_count: 3 AND pending_timeframe: 10m` — CPU must be high for **both** 3 consecutive checks **and** 10 minutes before alerting. This is intentionally conservative to avoid alerting on legitimate load spikes during deployments or scaling events.

---

## Phase 4: Business logic rules

### Rule 4.1 — Cart service availability

The cart service uses Valkey (Redis) for storage — if it's down, users can't add items.

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: Cart service unavailable",
    "description": "Alerts when the cart service has no successful operations",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "cart", "availability", "critical", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "1m", "lookback": "3m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:traces-*.otel-* | WHERE resource.attributes.service.name == \"cart\" | STATS total = COUNT(*), errors = SUM(CASE(status.code == 2, 1, 0)) | WHERE errors > 0 AND errors * 100 / total > 50"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": { "pending_count": 2 }
}
```

### Rule 4.2 — Fraud detection pipeline lag

The fraud-detection service consumes from Kafka — if it falls behind, fraud checks are delayed.

```jsonc
{
  "kind": "alert",
  "metadata": {
    "name": "Astronomy Shop: Fraud detection Kafka consumer lag",
    "description": "Alerts when the fraud detection consumer lag exceeds threshold",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "fraud-detection", "kafka", "production"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "2m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:metrics-*.otel-* | WHERE metric.name == \"kafka.consumer.lag\" AND resource.attributes.service.name == \"fraud-detection\" | STATS max_lag = MAX(metric.value) | WHERE max_lag > 1000"
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": { "pending_count": 3 }
}
```

---

## Phase 5: Signal rules

Signal rules emit events for downstream consumption without episode lifecycle management.

### Rule 5.1 — Load generator activity signal

Track load generator behavior as a signal for correlation with other alerts.

```jsonc
{
  "kind": "signal",
  "metadata": {
    "name": "Astronomy Shop: Load generator activity",
    "description": "Signal tracking load generator request volume for correlation",
    "owner": "sre-team",
    "tags": ["astronomy-shop", "load-generator", "signal"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "5m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM remote_cluster:traces-*.otel-* | WHERE resource.attributes.service.name == \"load-generator\" | STATS request_count = COUNT(*)"
    }
  }
}
```

---

## Phase 6: Advanced features (after basic rules are validated)

### 6.1 — Recovery queries

Once basic rules are working, upgrade selected rules with independent recovery queries:

- **CPU alert**: Recover when the autoscaler reports a scaling event, not just when CPU drops
- **Checkout errors**: Recover when a health check endpoint returns success, not just when errors stop

### 6.2 — Notification policies

Create notification policies to route alerts:

```jsonc
// Critical production alerts → SRE workflow
{
  "name": "Critical production alerts",
  "description": "Routes critical production alerts to SRE on-call",
  "destinations": [{ "type": "workflow", "id": "<sre-workflow-id>" }],
  "matcher": "tags: \"critical\" AND tags: \"production\"",
  "groupingMode": "per_episode",
  "throttle": { "strategy": "on_status_change" }
}
```

```jsonc
// Infrastructure alerts → Platform team workflow
{
  "name": "Infrastructure alerts",
  "description": "Routes infrastructure alerts to platform team",
  "destinations": [{ "type": "workflow", "id": "<platform-workflow-id>" }],
  "matcher": "tags: \"infrastructure\"",
  "groupingMode": "per_episode",
  "throttle": { "strategy": "per_status_interval", "interval": "15m" }
}
```

### 6.3 — Tuning with state transitions

After rules have run for a period, analyze episode patterns and tune:

- Rules with short-lived episodes (< 1 cycle): Increase `pending_count`
- Rules that flap: Increase `recovering_count` or add `recovering_timeframe`
- Rules that are slow to detect: Reduce `pending_count` or switch `pending_operator` to `OR`

---

## Execution plan

| Step | Phase | Action | Dependency |
|------|-------|--------|------------|
| 1 | 0 | Start Kibana via `./start-kbn.sh` | Feature flag set |
| 2 | 0 | Run ES|QL discovery queries against remote cluster | Kibana running |
| 3 | 0 | Adjust field names in rule templates based on actual OTel schema | Discovery complete |
| 4 | 1 | Create frontend error rate rule via API | Templates adjusted |
| 5 | 1 | Create checkout error rule | Templates adjusted |
| 6 | 1 | Create payment failure rule | Templates adjusted |
| 7 | 2 | Create service latency rule | Templates adjusted |
| 8 | 2 | Create checkout E2E latency rule | Templates adjusted |
| 9 | 3 | Create pod restart rule | Templates adjusted |
| 10 | 3 | Create container CPU rule | Templates adjusted |
| 11 | 4 | Create cart availability rule | Templates adjusted |
| 12 | 4 | Create Kafka lag rule | Templates adjusted |
| 13 | 5 | Create load generator signal rule | Templates adjusted |
| 14 | — | Verify all rules via `GET /api/alerting/v2/rules` | Rules created |
| 15 | — | Monitor episode generation for ~15 minutes | Rules running |
| 16 | 6 | Upgrade selected rules with recovery queries | Episode data available |
| 17 | 6 | Create notification policies | Workflow IDs known |
| 18 | 6 | Analyze and tune state transitions | Episode history available |

---

## Important notes

### CCS and ES|QL

All queries use the `remote_cluster:` prefix in `FROM` clauses because the OTel data lives on the remote cluster. ES|QL supports cross-cluster search with this prefix.

### Field name uncertainty

The rule templates above use **assumed** OTel field names based on common OTel conventions (`resource.attributes.service.name`, `status.code`, `duration`, `span.kind`). Phase 0 discovery is critical — the actual field names in the ECS/OTel mapping may differ (e.g., `service.name` vs `resource.attributes.service.name`, `span.status.code` vs `status.code`).

### Chaos Mesh impact

The cluster is running network delay experiments via Chaos Mesh. This means:
- Latency rules will likely fire immediately — this is expected and useful for validating the alerting pipeline
- Error rules may also fire due to timeout-induced failures
- This provides a natural test bed for state transition tuning (distinguishing sustained degradation from transient noise)

### Rate of rule creation

Create rules one at a time initially. Verify each rule is accepted and begins executing before moving to the next. The alerting v2 system uses Task Manager for scheduling — bulk creation should work fine, but sequential creation with verification is safer for initial setup.
