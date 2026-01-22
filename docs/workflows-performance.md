# Workflows Performance & Scaling Guide

This guide helps you understand and optimize workflow performance in Elastic. Whether you're planning capacity for a new deployment or troubleshooting performance issues, you'll find the information you need here.

---

## Quick Navigation

| I want to... | Go to |
|--------------|-------|
| Understand how many workflows I can run | [Quick Start: Capacity Planning](#quick-start-capacity-planning) |
| Make my workflows run faster | [Optimization Checklist](#optimization-checklist) |
| Fix performance problems | [Troubleshooting Guide](#troubleshooting-guide) |
| Understand the technical details | [Deep Dive: How It Works](#deep-dive-how-it-works) |

---

# Part 1: Essential Guide

*For users who want to plan capacity and optimize performance without diving into internals.*

---

## Quick Start: Capacity Planning

### The Simple Formula

To estimate how many workflows your deployment can handle:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Workflows per minute = Kibana Size × Speed Factor                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Capacity by Deployment Size

| Deployment Size | Kibana Memory | Workflows/min (fast)¹ | Workflows/min (typical)² |
|-----------------|---------------|----------------------|-------------------------|
| **Development** | 1 GB | 60 | 12 |
| **Small** | 4 GB | 600 | 120 |
| **Medium** | 8 GB | 600 | 120 |
| **Standard** | 16 GB (2 nodes) | 1,200 | 240 |
| **Large** | 32 GB (4 nodes) | 2,400 | 480 |
| **Enterprise** | 64 GB (8 nodes) | 4,800 | 960 |

> ¹ *Fast workflows: ~1 second duration (simple logging, basic transforms)*  
> ² *Typical workflows: ~5 seconds duration (API calls, ES queries, enrichment)*

### Which Size Do I Need?

**Count your workflows and their schedules:**

| Your Workload | Recommended Size |
|---------------|------------------|
| < 50 workflows running every minute | Small (4 GB) |
| 50-200 workflows/minute | Standard (16 GB) |
| 200-500 workflows/minute | Large (32 GB) |
| 500+ workflows/minute | Enterprise (64 GB+) |

> 💡 **Tip**: If your workflows are triggered by alerts (not scheduled), plan for **burst capacity**—size for 2-3x your expected peak alert rate.

---

## Optimization Checklist

### ✅ Quick Wins (No Technical Knowledge Required)

| Action | Impact | How |
|--------|--------|-----|
| **Increase schedule intervals** | ⭐⭐⭐ | Change `every: 10s` to `every: 60s` if real-time isn't needed |
| **Reduce workflow steps** | ⭐⭐⭐ | Combine related operations, remove unnecessary steps |
| **Add more Kibana capacity** | ⭐⭐⭐ | Scale up in Elastic Cloud console |
| **Disable unused workflows** | ⭐⭐ | Turn off workflows you're not actively using |
| **Batch similar operations** | ⭐⭐ | Process multiple items in one workflow instead of one workflow per item |

### 📊 Understanding Your Current Performance

**Signs your deployment is healthy:**
- ✅ Workflows run on schedule (within a few seconds)
- ✅ No "workflow delayed" warnings in logs
- ✅ Kibana memory usage stable

**Signs you need more capacity:**
- ⚠️ Workflows running late (schedule drift)
- ⚠️ Increasing delay over time
- ⚠️ Kibana restarts or out-of-memory errors

---

## Troubleshooting Guide

### "My workflows are running late"

**What's happening**: More workflows are scheduled than your deployment can execute on time.

**Solutions** (try in order):
1. **Reduce load**: Increase schedule intervals or disable non-critical workflows
2. **Add capacity**: Increase Kibana memory in Elastic Cloud
3. **Optimize workflows**: Make individual workflows faster (see [Optimization Checklist](#optimization-checklist))

### "Kibana keeps restarting"

**What's happening**: Workflows are consuming too much memory.

**Solutions**:
1. **Reduce concurrent workflows**: Lower the number of workflows running simultaneously
2. **Increase memory**: Scale up Kibana in Elastic Cloud
3. **Check for large payloads**: Workflows processing very large data sets use more memory

### "Some workflows never run"

**What's happening**: System tasks or other workflows are consuming all available capacity.

**Solutions**:
1. **Check system health**: Ensure Elasticsearch cluster is healthy
2. **Review background load**: Detection rules and alerting rules also use workflow capacity
3. **Prioritize critical workflows**: Disable less important workflows during high load

### Getting Help

If you've tried these solutions and still have issues:
1. Check the [Elastic Community Forums](https://discuss.elastic.co/)
2. Review Kibana logs for specific error messages
3. Contact Elastic Support (for licensed customers)

---

## Frequently Asked Questions

<details>
<summary><strong>How many workflows can I create?</strong></summary>

There's no hard limit on the number of workflow definitions. The limit is on **concurrent executions**—how many can run at the same time. A deployment with 1,000 workflows scheduled hourly is fine; 1,000 workflows scheduled every second would overwhelm most deployments.
</details>

<details>
<summary><strong>Do workflows affect Elasticsearch performance?</strong></summary>

Workflows that query or write to Elasticsearch do add load. Heavy ES operations in workflows (large queries, bulk writes) can impact cluster performance. Monitor your ES cluster alongside workflow performance.
</details>

<details>
<summary><strong>Can I run workflows on a schedule AND trigger them from alerts?</strong></summary>

Yes! But plan capacity for both. Scheduled workflows provide baseline load; alert-triggered workflows add burst load during incidents. Size your deployment for: `scheduled baseline + expected alert bursts`.
</details>

<details>
<summary><strong>What happens if a workflow fails?</strong></summary>

Failed workflows are automatically retried based on their configuration. Repeated failures are logged and the workflow may be temporarily disabled to prevent resource waste.
</details>

<details>
<summary><strong>How do I monitor workflow performance?</strong></summary>

- **Kibana Stack Monitoring**: Shows Task Manager health and queue depth
- **Workflow execution history**: View in the Workflows UI
- **APM**: Detailed traces for individual workflow executions (if enabled)
</details>

---
---

# Part 2: Deep Dive

*For technical users who want to understand the internals and methodology.*

---

## Architecture Overview

### How Workflows Execute

Workflows run as **Kibana Task Manager background tasks**. Understanding this architecture is key to performance optimization.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW EXECUTION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │   Trigger    │────▶│ Task Manager │────▶│   Workflow   │                 │
│  │  (Schedule/  │     │    Queue     │     │  Execution   │                 │
│  │   Alert)     │     │ (.kibana_tm) │     │              │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
│                              │                    │                          │
│                              ▼                    ▼                          │
│                       ┌──────────────┐     ┌──────────────┐                 │
│                       │   Polling    │     │    Steps     │                 │
│                       │  (500ms)     │     │  Execute     │                 │
│                       └──────────────┘     └──────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Task Manager Execution Model

| Component | Description | Default |
|-----------|-------------|---------|
| **Task Store** | Tasks persisted in `.kibana_task_manager` index | — |
| **Polling Interval** | How often Kibana checks for due tasks | 500ms |
| **Concurrency** | Max simultaneous tasks per Kibana node | 10 |
| **Claiming Strategy** | How tasks are claimed (`mget` strategy) | mget |
| **Task Cost** | Resource weight per task type | 2 (Normal) |

### The Throughput Equation (Detailed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Max Throughput = N × C × (60 / D) × E                                     │
│                                                                             │
│   Where:                                                                    │
│     N = Number of Kibana nodes                                              │
│     C = Task Manager concurrency per node (default: 10)                     │
│     D = Average workflow duration in seconds                                │
│     E = Efficiency factor (typically 0.6-0.8)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why the efficiency factor?**

Real-world throughput is 60-80% of theoretical maximum due to:
- Polling overhead (500ms intervals between checks)
- Task claiming contention (multiple nodes competing)
- Elasticsearch indexing latency for task state
- Background system tasks consuming slots

### Capacity Calculation Examples

**Example 1: Standard Deployment**
```
Nodes (N) = 2
Concurrency (C) = 10  
Avg Duration (D) = 2 seconds
Efficiency (E) = 0.7

Max Throughput = 2 × 10 × (60/2) × 0.7
              = 2 × 10 × 30 × 0.7
              = 420 workflows/minute
```

**Example 2: High-Volume Deployment**
```
Nodes (N) = 8
Concurrency (C) = 10
Avg Duration (D) = 1 second
Efficiency (E) = 0.7

Max Throughput = 8 × 10 × (60/1) × 0.7
              = 8 × 10 × 60 × 0.7
              = 3,360 workflows/minute
```

---

## Task Manager Internals

### Polling & Claiming Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TASK MANAGER POLLING CYCLE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Every 500ms:                                                                │
│                                                                              │
│  1. SEARCH    ─▶ Query .kibana_task_manager for overdue tasks               │
│                  (runAt <= now, status = idle)                               │
│                                                                              │
│  2. CLAIM     ─▶ Attempt to claim tasks up to available capacity            │
│                  (updateByQuery with version conflict handling)              │
│                                                                              │
│  3. EXECUTE   ─▶ Run claimed tasks in parallel (up to concurrency limit)    │
│                                                                              │
│  4. UPDATE    ─▶ Mark tasks complete, schedule next run                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Task Cost Model

Task Manager uses a cost-based capacity model:

```yaml
# Default capacity configuration
xpack.task_manager.capacity: 20  # Total cost units available

# Task costs by type:
# - Tiny: 1
# - Normal: 2  (workflows use this)
# - Large: 10

# Effective concurrent workflows:
# 20 capacity / 2 cost = 10 concurrent workflows
```

### Schedule Drift

**Definition**: The delay between when a workflow *should* run and when it *actually* runs.

```
Schedule Drift = Actual Start Time - Scheduled Run Time

Example:
  Scheduled: 10:00:00.000
  Actual:    10:00:02.345
  Drift:     2.345 seconds
```

**Acceptable drift by use case:**

| Use Case | Acceptable Drift |
|----------|------------------|
| Near-real-time response | < 1 second |
| Operational workflows | < 5 seconds |
| Periodic maintenance | < 30 seconds |
| Reporting/batch jobs | < 5 minutes |

---

## Trigger Types: Technical Analysis

### Scheduled Triggers

```yaml
triggers:
  - type: scheduled
    with:
      every: 60s
```

**Task Manager behavior:**
- Creates recurring task with fixed `schedule` interval
- Task re-schedules itself after each execution
- Predictable, evenly distributed load

**Capacity formula:**
```
Required Capacity = Σ(1 / interval_seconds) × 60 × avg_duration

Example: 100 workflows @ 60s interval, 2s duration each
  = 100 × (1/60) × 60 × 2
  = 100 × 2
  = 200 task-seconds per minute
  = ~3.3 concurrent slots needed
```

### Rule-Triggered (Alert-Based)

```yaml
triggers:
  - type: rule
    with:
      rule_types: ["siem.queryRule"]
```

**Task Manager behavior:**
- Creates ad-hoc task when alert fires
- Burst-driven, correlated with detection activity
- Can spike dramatically during incidents

**Capacity formula:**
```
Required Capacity = Peak Alerts/min × Workflows per Alert × avg_duration / 60

Example: 500 alerts/min peak, 1 workflow each, 2s duration
  = 500 × 1 × 2 / 60
  = 16.7 concurrent slots needed at peak
```

### Mixed Trigger Environments

**Worst-case capacity planning:**
```
Total Required = Scheduled Baseline + (2 × Expected Burst)

Example:
  Scheduled: 100 workflows @ 60s = 3.3 slots
  Alert burst: 500 alerts × 2s = 16.7 slots
  
  Recommended capacity: 3.3 + (2 × 16.7) = 36.7 slots
  With default concurrency (10): Need 4 Kibana nodes
```

---

## Configuration Reference

### Task Manager Settings

```yaml
# kibana.yml

# Total capacity (cost units) - default: 20
xpack.task_manager.capacity: 20

# Polling interval (ms) - default: 500
xpack.task_manager.poll_interval: 500

# Max poll inactivity before warning (ms) - default: 60000
xpack.task_manager.max_poll_inactivity_cycles: 10

# Request timeouts
xpack.task_manager.request_timeouts:
  update_by_query: 30000
```

### Tuning for Higher Throughput

```yaml
# High-throughput configuration (use with caution)
xpack.task_manager.capacity: 40           # Double default
xpack.task_manager.poll_interval: 250     # Faster polling

# Requires:
# - Sufficient Kibana memory (8GB+ recommended)
# - Healthy Elasticsearch cluster
# - Monitoring for increased ES load
```

### Tuning for Stability

```yaml
# Conservative configuration (prioritize stability)
xpack.task_manager.capacity: 10           # Reduce concurrent tasks
xpack.task_manager.poll_interval: 1000    # Slower polling

# Use when:
# - Memory-constrained environment
# - Elasticsearch under pressure
# - Prioritizing reliability over throughput
```

---

## Monitoring & Metrics

### Task Manager Health API

```bash
GET /api/task_manager/_health
```

**Key metrics to monitor:**

```json
{
  "stats": {
    "runtime": {
      "value": {
        "drift": {
          "p50": 467,    // Median drift (ms) - target: < 1000
          "p95": 1145,   // 95th percentile - target: < 5000
          "p99": 2500    // 99th percentile - watch for spikes
        },
        "load": {
          "p50": 75,     // % capacity used - warning: > 90
          "p95": 100     // At capacity indicates saturation
        },
        "polling": {
          "result_frequency_percent_as_number": {
            "NoAvailableWorkers": 0,      // Should be 0
            "RunningAtCapacity": 30,      // % time at capacity
            "NoTasksClaimed": 40,         // Idle time (good)
            "PoolFilled": 30              // Normal operation
          }
        },
        "execution": {
          "duration": {
            "workflow:scheduled": {
              "p50": 628,    // Median workflow duration (ms)
              "p95": 1203,   // 95th percentile
              "p99": 1500    // Watch for outliers
            }
          }
        }
      }
    }
  }
}
```

### Interpreting Health Metrics

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| `drift.p50` | < 500ms | 500ms - 2s | > 2s |
| `drift.p95` | < 2s | 2s - 10s | > 10s |
| `load.p50` | < 70% | 70-90% | > 90% |
| `NoAvailableWorkers` | 0% | 1-5% | > 5% |
| `RunningAtCapacity` | < 50% | 50-80% | > 80% |

### APM Transaction Tracing

Workflows are instrumented with Elastic APM:

| Transaction | Description |
|-------------|-------------|
| `workflow:scheduled` | Scheduled workflow execution |
| `workflow:run` | Generic workflow execution |
| `mark-task-as-claimed` | Task claiming operation |

**Key spans within workflow transaction:**
- `run` - Workflow step execution
- `process result` - Result processing and state update
- Elasticsearch spans - Individual ES operations

### Prometheus Metrics (if enabled)

```
# Task Manager metrics
kibana_task_manager_drift_seconds{quantile="0.5"}
kibana_task_manager_drift_seconds{quantile="0.95"}
kibana_task_manager_load_percent
kibana_task_manager_tasks_running
kibana_task_manager_tasks_claimed_total
```

---

## Performance Testing Methodology

### Test Scenarios

| Scenario | Description | Purpose |
|----------|-------------|---------|
| **Sanity** | 1-2 steps, minimal logic | Baseline measurement |
| **I/O Heavy** | Multiple ES queries | Test ES impact |
| **Wait Steps** | Explicit delays | Scheduling accuracy |
| **High Step Count** | 10+ steps | Duration scaling |
| **Memory Intensive** | Large payload processing | Memory limits |
| **Nested Workflows** | Workflow spawns workflows | Capacity multiplication |

### Background Load Conditions

| Condition | Description | Impact |
|-----------|-------------|--------|
| **None** | Clean system | Best-case baseline |
| **Light Detection** | ~50 detection rules | Minimal contention |
| **Heavy Detection** | 500+ detection rules | Significant contention |
| **Combined** | Detection + Alerting | Worst-case realistic |

### Concurrency Test Levels

| Level | Target/min | Purpose |
|-------|------------|---------|
| **Low** | 10 | Below capacity (should succeed) |
| **Medium** | 100 | Expected normal load |
| **High** | 1,000 | Near single-instance limit |
| **Stress** | 10,000 | Intentional saturation |

### Running Benchmarks

```bash
#!/bin/bash
# create_test_workflows.sh

KIBANA_URL="http://localhost:5601"
API_KEY="your-api-key"
COUNT=${1:-100}

for i in $(seq 1 $COUNT); do
  curl -sL -X POST "$KIBANA_URL/api/workflows" \
    -H "Authorization: ApiKey $API_KEY" \
    -H "Content-Type: application/json" \
    -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: kibana" \
    -d "{
      \"yaml\": \"name: perf-test-$i\nenabled: true\ntriggers:\n  - type: scheduled\n    with:\n      every: 10s\nsteps:\n  - name: log\n    type: console\n    with:\n      message: test\"
    }"
done
```

### Metrics to Capture

| Category | Metrics |
|----------|---------|
| **Throughput** | Workflows/min, success rate |
| **Latency** | Duration p50/p95/p99 |
| **Scheduling** | Drift p50/p95/p99 |
| **System** | CPU, memory, ES load |
| **Task Manager** | Queue depth, claim rate, capacity utilization |

---

## Platform Reference Configurations

### Elastic Cloud Deployment Sizes

| Size | Kibana | Elasticsearch | Max Throughput* | Use Case |
|------|--------|---------------|-----------------|----------|
| **Baseline** | 1 × 1GB | 1 × 2GB | ~100/min | Dev/Test only |
| **Small** | 1 × 4GB | 2 × 4GB | ~400/min | Light production |
| **Standard** | 2 × 8GB | 3 × 8GB | ~1,200/min | Standard Security |
| **Large** | 4 × 8GB | 6 × 16GB | ~2,400/min | High-volume |
| **Enterprise** | 8 × 8GB | 12 × 32GB | ~4,800/min | Enterprise |
| **Max** | 32 × 8GB | Max | ~19,200/min | Extreme scale |

*Assuming 1-second average workflow duration

### Memory Requirements

```
Minimum Memory per Node = Base + (Concurrency × Per-Workflow) + Buffer

Where:
  Base = 600 MB (Kibana core)
  Per-Workflow = 10-50 MB (depends on payload size)
  Buffer = 20% headroom

Example (10 concurrent, medium payloads):
  600 + (10 × 30) + 200 = 1,100 MB minimum
  Recommended: 2 GB+ for stability
```

---

## Troubleshooting: Technical Details

### Diagnostic Queries

**Check pending workflow tasks:**
```bash
GET .kibana_task_manager/_search
{
  "query": {
    "bool": {
      "must": [
        { "prefix": { "task.taskType": "workflow:" } },
        { "term": { "task.status": "idle" } },
        { "range": { "task.runAt": { "lte": "now" } } }
      ]
    }
  },
  "size": 0,
  "aggs": {
    "by_type": { "terms": { "field": "task.taskType" } }
  }
}
```

**Check task execution durations:**
```bash
GET .kibana_task_manager/_search
{
  "query": {
    "prefix": { "task.taskType": "workflow:" }
  },
  "size": 0,
  "aggs": {
    "duration_stats": {
      "stats": { "field": "task.schedule.interval" }
    }
  }
}
```

### Common Issues: Root Cause Analysis

#### High Schedule Drift

**Symptoms:**
- `drift.p95` > 5 seconds
- `RunningAtCapacity` > 80%

**Root causes:**
1. Insufficient Task Manager capacity
2. Long-running workflows blocking slots
3. Elasticsearch slow to respond
4. Too many scheduled workflows

**Resolution:**
```yaml
# Option 1: Increase capacity
xpack.task_manager.capacity: 30

# Option 2: Add Kibana nodes (preferred for production)
# Scale horizontally in Elastic Cloud

# Option 3: Optimize workflow duration
# Review and optimize slow workflows
```

#### Out of Memory (OOM)

**Symptoms:**
- Kibana restarts
- Heap snapshot files generated
- `FATAL ERROR: Ineffective mark-compacts near heap limit`

**Root causes:**
1. Too many concurrent workflows
2. Large payloads in workflow state
3. Memory leaks (rare, report as bug)

**Resolution:**
```yaml
# Reduce concurrent workflows
xpack.task_manager.capacity: 10

# Or increase memory (Elastic Cloud)
# Or optimize workflow payloads
```

**Debugging with heap snapshots:**
```bash
# Enable heap snapshots near OOM
NODE_OPTIONS="--max-old-space-size=4096 --heapsnapshot-near-heap-limit=3"

# Analyze in Chrome DevTools:
# 1. chrome://inspect
# 2. Open dedicated DevTools for Node
# 3. Memory tab → Load snapshot
# 4. Sort by Retained Size
```

---

## Additional Resources

- [Task Manager Production Considerations](https://www.elastic.co/guide/en/kibana/current/task-manager-production-considerations.html)
- [Kibana Production Guide](https://www.elastic.co/guide/en/kibana/current/production.html)
- [Elastic APM Documentation](https://www.elastic.co/guide/en/apm/guide/current/index.html)
- [Elasticsearch Performance Tuning](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-indexing-speed.html)

---

*Last updated: January 2026*
