# Synthtrace Schema System

## Overview

The Synthtrace Schema System provides a declarative, configuration-based approach to generating synthetic observability data for Kibana. Instead of writing imperative TypeScript scenarios, you can define your data generation requirements in a simple JSON schema file.

## Key Features

- **Declarative Configuration**: Define data generation using JSON schemas instead of code
- **Type-Safe**: Schemas are validated against TypeScript interfaces
- **Flexible**: Supports traces, spans, metrics, and more
- **Time-Based**: Configurable time windows for data generation
- **Multi-Signal**: Generate multiple types of observability data simultaneously

## Quick Start

### 1. Create a Schema File

Create a JSON file describing your desired dataset:

```json
{
  "timeWindow": {
    "from": "now-1h",
    "to": "now"
  },
  "services": [
    {
      "id": "my-service",
      "name": "my-service",
      "environment": "production",
      "agentName": "nodejs",
      "instances": [
        {
          "id": "instance-1",
          "traces": [
            {
              "id": "checkout-trace",
              "name": "POST /api/checkout",
              "count": 20
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Apply the Schema

Run the synthtrace CLI with the `schema apply` command:

```bash
node scripts/synthtrace.js schema apply path/to/your/schema.json --target http://localhost:9200
```

## Schema Structure

### Root Schema

```typescript
{
  timeWindow: {
    from: string;  // ISO 8601 date or relative time (e.g., "now-1h")
    to: string;    // ISO 8601 date or relative time (e.g., "now")
  };
  services?: ServiceConfig[];
  hosts?: HostConfig[];
  synthetics?: SyntheticsConfig[];
}
```

### Service Configuration

```typescript
{
  id: string;              // Unique identifier
  name: string;            // Service name
  environment?: string;    // e.g., "production", "staging"
  agentName?: string;      // e.g., "nodejs", "java", "go"
  instances: InstanceConfig[];
}
```

### Instance Configuration

```typescript
{
  id: string;              // Unique identifier
  host?: string;           // Host ID reference
  traces?: TraceConfig[];
  logs?: LogConfig[];
  metrics?: MetricConfig[];
}
```

### Trace Configuration

```typescript
{
  id: string;              // Unique identifier
  name: string;            // Transaction name
  count: number;           // Number of traces to generate per interval
  spans?: SpanConfig[];    // Child spans
}
```

### Span Configuration

```typescript
{
  name: string;            // Span name
  type: string;            // e.g., "db", "external", "custom"
  duration: {
    value: number;
    unit: "ms" | "s";
  };
}
```

### Metric Configuration

```typescript
{
  name: string;            // Metric name (e.g., "system.memory.actual.free")
  behavior: number | {     // Constant or dynamic value
    type: "linear";
    from: number;
    to: number;
  };
}
```

## Examples

### Simple Trace

```json
{
  "timeWindow": {
    "from": "now-1h",
    "to": "now"
  },
  "services": [
    {
      "id": "my-app",
      "name": "my-app",
      "instances": [
        {
          "id": "instance-1",
          "traces": [
            {
              "id": "trace-1",
              "name": "GET /api/users",
              "count": 10
            }
          ]
        }
      ]
    }
  ]
}
```

### Trace with Spans

```json
{
  "timeWindow": {
    "from": "now-15m",
    "to": "now"
  },
  "services": [
    {
      "id": "checkout-service",
      "name": "checkout-service",
      "environment": "production",
      "agentName": "nodejs",
      "instances": [
        {
          "id": "instance-1",
          "traces": [
            {
              "id": "checkout-trace",
              "name": "POST /api/checkout",
              "count": 20,
              "spans": [
                {
                  "name": "GET /api/inventory",
                  "type": "external",
                  "duration": { "value": 150, "unit": "ms" }
                },
                {
                  "name": "SELECT * FROM orders",
                  "type": "db",
                  "duration": { "value": 200, "unit": "ms" }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Service with Metrics

```json
{
  "timeWindow": {
    "from": "now-10m",
    "to": "now"
  },
  "services": [
    {
      "id": "api-service",
      "name": "api-service",
      "environment": "production",
      "agentName": "nodejs",
      "instances": [
        {
          "id": "instance-1",
          "traces": [
            {
              "id": "api-trace",
              "name": "GET /api/data",
              "count": 10
            }
          ],
          "metrics": [
            {
              "name": "system.memory.actual.free",
              "behavior": 800
            },
            {
              "name": "system.process.cpu.total.norm.pct",
              "behavior": 0.65
            }
          ]
        }
      ]
    }
  ]
}
```

## CLI Commands

### Generate Schema

Generate a JSON Schema from the synthtrace API (for reference):

```bash
node scripts/synthtrace.js schema generate
```

### Validate Schema

Validate that the schema file exists and is properly formatted:

```bash
node scripts/synthtrace.js schema validate
```

### Apply Schema

Apply a schema file to generate and index data:

```bash
node scripts/synthtrace.js schema apply <file> [options]
```

Options:
- `--target <url>`: Elasticsearch target URL (default: http://localhost:9200)
- `--kibana <url>`: Kibana target URL
- `--apiKey <key>`: API key for authentication
- `--from <time>`: Override schema timeWindow from
- `--to <time>`: Override schema timeWindow to
- `--concurrency <n>`: Bulk indexing concurrency (default: 1)
- `--insecure`: Skip SSL certificate validation
- `--debug`: Enable debug logging
- `--verbose`: Enable verbose logging

## Architecture

The Synth Schema system consists of three main components:

### 1. Schema Template (`synth_schema_template.ts`)

Defines TypeScript interfaces for the schema structure. These interfaces provide type safety and IDE autocomplete support.

### 2. Schema Generator (`generator.ts`)

Automatically generates a JSON Schema from the synthtrace TypeScript API using `ts-morph`. This ensures the schema stays in sync with the underlying API.

### 3. Schema Executor (`executor.ts`)

Interprets and executes a schema configuration, making the appropriate calls to the synthtrace fluent API to generate and index data.

### 4. Schema Context (`schema_context.ts`)

Sets up the runtime context including logger, Elasticsearch client, and Kibana client.

## Future Enhancements

- Support for logs generation
- Support for hosts and infrastructure metrics
- Support for synthetics monitors
- Dynamic behaviors (piecewise functions, conditions)
- Cross-signal correlations
- Schema validation and error reporting
- Caching and optimization

## Contributing

When adding new features to the synthtrace API, ensure the schema system is updated:

1. Update `synth_schema_template.ts` with new interfaces
2. Update `executor.ts` to handle new configuration options
3. Regenerate the schema with `schema generate`
4. Add examples in the `examples/` directory
5. Update this README

## See Also

- [Synthtrace Documentation](../README.md)
- [Example Schemas](./examples/)
- [Schema Template](./synth_schema_template.ts)

