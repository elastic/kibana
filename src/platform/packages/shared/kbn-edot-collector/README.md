# @kbn/edot-collector

EDOT Collector (Elastic Distribution of OpenTelemetry Collector) CLI tool for Kibana development.

This package provides a developer command to easily start an EDOT Collector instance in Gateway mode and connect it to your Elasticsearch cluster.

## Usage

### Basic usage

```bash
node scripts/edot_collector.js
```

This will:

1. Read Elasticsearch connection details from `config/kibana.yml` and `config/kibana.dev.yml`
2. Generate an OpenTelemetry Collector configuration
3. Start a Docker container named `kibana-dev-edot-collector` with the EDOT Collector running in Gateway mode
4. Expose OTLP endpoints (gRPC on 4317, HTTP on 4318) for application instrumentation
5. Send telemetry data to your Elasticsearch cluster

### With custom config file

```bash
# Single config file
node scripts/edot_collector.js --config path/to/custom/kibana.yml

# Short form
node scripts/edot_collector.js -c path/to/custom/kibana.yml

# Multiple config files (later files override earlier ones)
node scripts/edot_collector.js --config config/kibana.yml --config config/kibana.dev.yml
```

### Using environment variables

You can override Elasticsearch connection settings using environment variables:

```bash
ELASTICSEARCH_HOST=https://my-cluster.es.cloud:443 \
ELASTICSEARCH_USERNAME=elastic \
ELASTICSEARCH_PASSWORD=secret \
node scripts/edot_collector.js
```

## Configuration

The command reads the following settings from your Kibana configuration:

- `elasticsearch.hosts` - Elasticsearch endpoint URL
- `elasticsearch.username` - Elasticsearch username
- `elasticsearch.password` - Elasticsearch password

Default values if not specified:

- `elasticsearch.hosts`: `http://localhost:9200`
- `elasticsearch.username`: `elastic`
- `elasticsearch.password`: `changeme`

## What gets collected

The EDOT Collector is configured to collect:

- **Application traces**: Distributed traces from instrumented applications via OTLP
- **Application logs**: Logs from instrumented applications via OTLP
- **Application metrics**: Metrics from instrumented applications via OTLP
- **Aggregated APM metrics**: Pre-aggregated metrics from Elastic APM

## OTLP Endpoints

The collector exposes OTLP endpoints for application instrumentation:

- **gRPC**: `http://localhost:4317`
- **HTTP**: `http://localhost:4318`

Configure your OpenTelemetry SDKs to send data to these endpoints.

### Example: Instrumenting a Node.js Application

```javascript
// Set environment variables
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
process.env.OTEL_SERVICE_NAME = 'my-service';

// Use OpenTelemetry auto-instrumentation
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
});

sdk.start();
```

## Viewing the data

1. Start Kibana
2. Go to **Observability** → **Applications** to view traces and APM data
3. Go to **Discover** to explore logs and raw telemetry data
4. Create custom dashboards for your application metrics

## Managing the container

The EDOT Collector runs in a Docker container named `kibana-dev-edot-collector`.

```bash
# Check container status
docker ps | grep kibana-dev-edot-collector

# View logs
docker logs kibana-dev-edot-collector

# Stop the container
docker stop kibana-dev-edot-collector

# Remove the container
docker rm kibana-dev-edot-collector

# Stop via docker-compose
docker compose -f data/edot_collector/docker-compose.yaml down
```

## Generated files

The command generates the following files in `data/edot_collector/`:

- `docker-compose.yaml` - Docker Compose configuration
- `otel-collector-config.yml` - OpenTelemetry Collector configuration

## Requirements

- Docker must be installed and running

## Troubleshooting

### Docker not available

If you see "Docker is not available", make sure Docker is installed and running:

```bash
docker info
```

### Container fails to start

Check the logs:

```bash
docker logs kibana-dev-edot-collector
```

### Can't see data in Kibana

1. Verify the container is running: `docker ps | grep kibana-dev-edot-collector`
2. Check Elasticsearch connection in the logs: `docker logs kibana-dev-edot-collector`
3. Verify your Elasticsearch credentials are correct
4. Make sure you've installed the OpenTelemetry Assets integrations
