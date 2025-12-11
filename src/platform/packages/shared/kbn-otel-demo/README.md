# @kbn/otel-demo

Development tool for running the OpenTelemetry Demo on Kubernetes (minikube) with container logs exported to Elasticsearch.

## Prerequisites

1. **minikube** - Install from https://minikube.sigs.k8s.io/docs/start/
2. **kubectl** - Usually installed with minikube, or install separately
3. **Elasticsearch** running locally on `localhost:9200`
4. **Kibana** running locally

## Quick Start

```bash
# Start minikube (if not already running)
minikube start --driver=docker --memory=4096 --cpus=4

# Start the OTel Demo
node scripts/otel_demo.js

# Stop the demo
node scripts/otel_demo.js --teardown
```

## What This Does

1. **Ensures minikube is running** - Starts it if needed
2. **Enables Streams in Kibana** - Calls `POST /api/streams/_enable` to set up the logs index
3. **Deploys OTel Demo to Kubernetes** - Creates namespace, deployments, services
4. **Configures OTel Collector** with:
   - `filelog` receiver to collect container logs from `/var/log/pods`
   - `k8sattributes` processor for pod/container metadata enrichment
   - `recombine` operator for multiline log grouping (stack traces)
   - `elasticsearchexporter` to send logs to Elasticsearch

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
  --config <path>      Path to Kibana config file (default: config/kibana.dev.yml)
  --logs-index <name>  Index name for logs (default: "logs")
  --teardown           Stop and remove the OTel Demo from Kubernetes
```

## Accessing the Demo

After deployment:

```bash
# Access the web store frontend
minikube service frontend-external -n otel-demo

# Or use the NodePort directly (http://<minikube-ip>:30080)
minikube ip
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
- `src/get_kubernetes_manifests.ts` - Generates Kubernetes YAML
- `src/get_otel_collector_config.ts` - OTel Collector config with filelog + k8sattributes
- `src/util/assert_minikube_available.ts` - Minikube/kubectl utilities
