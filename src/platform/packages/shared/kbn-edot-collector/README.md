# @kbn/edot-collector

EDOT Collector (Elastic Distribution of OpenTelemetry Collector) CLI tool for Kibana development.

This package provides a developer command to easily start an EDOT Collector instance in Gateway mode and connect it to your Elasticsearch cluster.

## Usage

### Basic usage

```bash
node scripts/edot_collector.js
```

This will:

1. Read Elasticsearch connection details from `config/kibana.dev.yml`
2. Generate an OpenTelemetry Collector configuration
3. Start a Docker container named `kibana-edot-collector` with the EDOT Collector running in Gateway mode
4. Expose OTLP endpoints for application instrumentation
5. Send telemetry data to your Elasticsearch cluster

### With custom config file

```bash
node scripts/edot_collector.js --config config/<custom-kibana-config>.yml
```

### With custom OTLP ports

If you need to use different ports (e.g., when running multiple collectors or when default ports are already in use):

```bash
node scripts/edot_collector.js --grpc-port 14317 --http-port 14318
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

The command accepts the following CLI flags:

- `--config`, `-c`: Path to Kibana config file (defaults to `config/kibana.dev.yml`)
- `--grpc-port`: Host port for gRPC endpoint (defaults to `4317`)
- `--http-port`: Host port for HTTP endpoint (defaults to `4318`)

## What gets collected

The EDOT Collector is configured to collect:

- **Application traces**: Distributed traces from instrumented applications via OTLP
- **Application logs**: Logs from instrumented applications via OTLP
- **Application metrics**: Metrics from instrumented applications via OTLP
- **Aggregated APM metrics**: Pre-aggregated metrics from Elastic APM

## OTLP Endpoints

The collector exposes OTLP endpoints for application instrumentation:

- **gRPC**: `http://localhost:4317` (default, customizable with `--grpc-port`)
- **HTTP**: `http://localhost:4318` (default, customizable with `--http-port`)

Configure your OpenTelemetry SDKs to send data to these endpoints.

### Example: Minimal Express App with Traces and Logs

Create a new directory and initialize:

```bash
mkdir my-instrumented-app && cd my-instrumented-app
npm init -y
npm install express winston @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-logs-otlp-http @opentelemetry/instrumentation-winston @opentelemetry/winston-transport --save
```

Create `server.js`:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { WinstonInstrumentation } = require('@opentelemetry/instrumentation-winston');

const sdk = new NodeSDK({
  serviceName: 'my-express-app',
  traceExporter: new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' }),
  logExporter: new OTLPLogExporter({ url: 'http://localhost:4318/v1/logs' }),
  instrumentations: [getNodeAutoInstrumentations(), new WinstonInstrumentation()],
});

sdk.start();

const express = require('express');
const winston = require('winston');
const { OpenTelemetryTransportV3 } = require('@opentelemetry/winston-transport');

// Create Winston logger with OpenTelemetry transport
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console(), new OpenTelemetryTransportV3()],
});

const app = express();

app.get('/', (req, res) => {
  logger.info('Received request to /');
  res.json({ message: 'Hello! Check Kibana for traces and logs.' });
});

app.listen(3000, () => {
  logger.info('Server running on http://localhost:3000');
  logger.info('Visit http://localhost:3000 to generate traces and logs');
});
```

Run the app:

```bash
node server.js
```

Visit `http://localhost:3000` in your browser. You can now see the logs and traces of `my-express-app` in Kibana.

## Viewing the data

1. Start Kibana
2. Go to **Observability** → **Applications** to view traces and APM data
3. Go to **Discover** to explore logs and raw telemetry data

## Generated files

The command generates the following files in `data/edot_collector/`:

- `docker-compose.yaml` - Docker Compose configuration
- `otel-collector-config.yml` - OpenTelemetry Collector configuration

**Security Note:** These generated configuration files may contain non-default Elasticsearch credentials. The `data/` directory is included in `.gitignore` to prevent accidental commits of sensitive information. As you're using this script, please ensure your credentials are not committed to version control.

## Requirements

- Docker must be installed and running

## Troubleshooting

### Port conflicts

If you see errors about ports already in use, you can specify alternative ports:

```bash
node scripts/edot_collector.js --grpc-port 14317 --http-port 14318
```

### Can't see data in Kibana

1. Verify the container is running: `docker ps | grep kibana-edot-collector`
2. Check Elasticsearch connection in the logs: `docker logs kibana-edot-collector`
3. Check instrumented application logs for OTLP export errors.
