# @kbn/otel-demo

Development tool for running OpenTelemetry demo applications on Kubernetes (minikube) with full APM-compatible telemetry exported to Elasticsearch.

By default the **EDOT Collector** (Elastic Distribution of OpenTelemetry) is used, which produces APM-compatible documents (`processor.event`, service transaction metrics) so demo services appear correctly in the APM UI with infrastructure correlation. Pass `--vanilla` to use the upstream `otel-collector-contrib` instead.

## Prerequisites

1. **minikube** - Install from https://minikube.sigs.k8s.io/docs/start/
2. **kubectl** - Usually installed with minikube, or install separately
3. **Docker** - Required for minikube and EDOT image version resolution
4. **Elasticsearch** running locally on `localhost:9200`
5. **Kibana** running locally

## Quick Start

```bash
# Start minikube (if not already running)
minikube start --driver=docker --memory=4096 --cpus=4

# Start the OTel Demo (EDOT Collector, APM-compatible)
node scripts/otel_demo.js

# Use vanilla otel-collector-contrib instead
node scripts/otel_demo.js --vanilla

# Stop the demo
node scripts/otel_demo.js --teardown
```

## What This Does

1. **Ensures minikube is running** - Starts it if needed
2. **Enables Streams in Kibana** - Calls `POST /api/streams/_enable` to set up the logs.otel index
3. **Resolves host.minikube.internal** - Injects `hostAliases` so pods can reach host Elasticsearch
4. **Deploys demo to Kubernetes** - Creates namespace, deployments, services, RBAC
5. **Configures OTel Collector**:
   - **EDOT (default):** `elasticapm` connector for APM data, `kubeletstats`/`k8s_cluster`/`hostmetrics` for infrastructure, `filelog` for container logs, `k8sobjects` for K8s events
   - **Vanilla (`--vanilla`):** `filelog` receiver, `k8sattributes` processor, `elasticsearchexporter`

## Collector Comparison

| Feature | EDOT (default) | Vanilla (`--vanilla`) |
|---------|----------------|----------------------|
| APM-compatible traces | Yes | No |
| Service transaction metrics | Yes | No |
| Infrastructure metrics (host/pod/container) | Yes | No |
| Container logs | Yes | Yes |
| K8s events | Yes | No |
| Custom `logsIndex` | Yes (via `elasticsearch.index` attribute) | Yes (via fixed `logs_index`) |

## Log Collection

The collector reads container logs directly from the Kubernetes node filesystem:
- Mounts `/var/log/pods`, `/var/log/containers`, and `/var/lib/docker/containers`
- Parses Docker JSON log format
- Groups multiline logs (stack traces with indented lines)
- Enriches with Kubernetes metadata via `k8sattributes` processor

### Metadata Enrichment

Each log entry is enriched with:
- `k8s.pod.name`
- `k8s.container.name`
- `k8s.namespace.name`
- `k8s.deployment.name`
- `k8s.pod.uid`
- `container.id`
- `container.image.name`
- Pod labels (app, app.kubernetes.io/name, etc.)

## Configuration

The script reads Elasticsearch credentials from `config/kibana.dev.yml`:

```yaml
elasticsearch.hosts: ["http://localhost:9200"]
elasticsearch.username: "elastic"
elasticsearch.password: "changeme"
```

Or via environment variables:
- `ELASTICSEARCH_HOSTS`
- `ELASTICSEARCH_USERNAME`
- `ELASTICSEARCH_PASSWORD`

## CLI Options

```bash
node scripts/otel_demo.js [options]

Options:
  --config, -c         Path to Kibana config file (default: config/kibana.dev.yml)
  --vanilla            Use vanilla otel-collector-contrib instead of EDOT Collector
  --logs-index         Index name for logs (default: "logs.otel", vanilla only)
  --teardown           Stop and remove the OTel Demo from Kubernetes
  --scenario, -s       Apply a failure scenario (can be repeated)
  --patch, -p          Patch scenarios onto running cluster (no redeploy)
  --reset, -r          Reset all scenarios to defaults (no redeploy)
  --list-scenarios     List all available failure scenarios
```

## Failure Scenarios

The script supports injecting failure scenarios to simulate real-world issues and test observability.

### Listing Available Scenarios

```bash
node scripts/otel_demo.js --list-scenarios
```

### Running with Scenarios (Full Deploy)

```bash
# Single scenario
node scripts/otel_demo.js --scenario cart-redis-cutoff

# Multiple scenarios
node scripts/otel_demo.js -s checkout-memory-pressure -s load-generator-ramp
```

### Patching Scenarios on Running Cluster

Apply or remove scenarios without redeploying:

```bash
# Apply a scenario to running cluster (fast!)
node scripts/otel_demo.js --patch --scenario cart-redis-cutoff

# Apply multiple scenarios
node scripts/otel_demo.js -p -s checkout-memory-pressure -s load-generator-ramp

# Reset all scenarios to defaults
node scripts/otel_demo.js --reset
```

### Available Scenarios

**Dramatic (service-breaking):**
| Scenario ID | Description |
|-------------|-------------|
| `cart-redis-cutoff` | Cart points to invalid Valkey port, all cart operations fail |
| `checkout-memory-starvation` | Checkout Go runtime clamped to 4MiB, causes GC thrash and crashes |
| `currency-unreachable` | Currency service unreachable, price conversions fail |
| `product-catalog-unreachable` | Frontend can't reach product catalog |
| `payment-unreachable` | Checkout can't reach payment service |

**Subtle (degraded performance/observability):**
| Scenario ID | Description |
|-------------|-------------|
| `checkout-memory-pressure` | Checkout memory halved, increased latency under load |
| `load-generator-ramp` | Triple Locust users, creates resource pressure |
| `frontend-telemetry-drift` | Frontend exports with shadow service name |
| `recommendation-telemetry-alias` | Recommendation exports with different service name |
| `frontend-telemetry-silence` | Frontend OTLP goes to wrong port, spans vanish |
| `flagd-unreachable` | Feature flag service unreachable |

### Resetting Scenarios

Quick reset (patches running pods):
```bash
node scripts/otel_demo.js --reset
```

Or full redeploy without scenarios:
```bash
node scripts/otel_demo.js --teardown
node scripts/otel_demo.js
```

## Accessing the Demo

After deployment, the frontend can be accessed via NodePort.

### On macOS with Docker driver:

```bash
# Use minikube service command (keep terminal open)
minikube service frontend-external -n online-boutique

# Or for otel-demo:
minikube service frontend-external -n otel-demo
```

**Note:** On macOS with the Docker driver, the `minikube service` command creates a tunnel and must be kept running in a separate terminal to maintain access to the service.

### On Linux or with other drivers:

```bash
# Get the minikube IP
minikube ip

# Access directly via NodePort
# http://<minikube-ip>:30080
```

## Viewing Logs

```bash
# View collector logs
kubectl logs -f -n otel-demo -l app=otel-collector

# View specific service logs
kubectl logs -f -n otel-demo -l app=frontend
```

## Deployed Services

| Service | Description | Port |
|---------|-------------|------|
| frontend | Web store UI | 8080 (NodePort: 30080) |
| cart | Shopping cart service | 7070 |
| checkout | Checkout service | 5050 |
| currency | Currency conversion | 7285 |
| email | Email service | 6060 |
| payment | Payment processing | 50051 |
| product-catalog | Product catalog | 3550 |
| recommendation | Recommendations | 9001 |
| shipping | Shipping quotes | 50051 |
| ad | Advertisement service | 9555 |
| quote | Quote service | 8090 |
| load-generator | Traffic generator | 8089 |
| otel-collector | Telemetry collector | 4317, 4318 |
| flagd | Feature flags | 8013 |
| valkey | Redis-compatible cache | 6379 |

## Troubleshooting

### Pods not starting

```bash
kubectl get pods -n otel-demo
kubectl describe pod -n otel-demo <pod-name>
kubectl get events -n otel-demo --sort-by='.lastTimestamp'
```

### Minikube issues

```bash
minikube status
minikube stop && minikube start --driver=docker --memory=4096 --cpus=4
```

### Elasticsearch connectivity

The collector connects via `host.minikube.internal`. Ensure Elasticsearch is running on the host.

## Development

Key files:
- `src/ensure_otel_demo.ts` - Main orchestration logic
- `src/get_edot_k8s_collector_config.ts` - EDOT Collector config with K8s receivers and APM pipelines
- `src/get_otel_collector_config.ts` - Vanilla OTel Collector config with filelog + k8sattributes
- `src/util/resolve_edot_collector_version.ts` - Resolves latest available EDOT Collector image tag
- `src/util/assert_minikube_available.ts` - Minikube/kubectl utilities
- `src/demos/*/` - Per-demo configurations and manifest generators
