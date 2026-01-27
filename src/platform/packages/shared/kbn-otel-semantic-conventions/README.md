# @kbn/otel-semantic-conventions

OpenTelemetry semantic conventions processor and field metadata generator for Kibana's Field Metadata Service.

## Overview

This package processes OpenTelemetry semantic conventions YAML files and generates structured TypeScript field definitions that can be consumed by Kibana's Field Metadata Service. It transforms raw semantic convention specifications into field metadata with descriptions, types, and examples.

## Features

- **YAML Processing**: Converts OpenTelemetry `resolved-semconv.yaml` files into structured TypeScript
- **Field Metadata Generation**: Creates 956+ field definitions from registry and metric groups  
- **Type Safety**: Provides full TypeScript definitions without `any` usage
- **Automated Updates**: Integrates with GitHub Actions for weekly semantic conventions updates
- **Performance Optimized**: Generates static definitions for runtime efficiency

## Generated Output

The package generates a structured field collection:

```typescript
export const semconvFlat: TSemconvFields = {
  'service.name': {
    name: 'service.name',
    description: 'Logical name of the service.',
    type: 'keyword',
    example: 'shoppingcart'
  },
  'http.method': {
    name: 'http.method',
    description: 'HTTP request method.',
    type: 'keyword',
    example: 'GET'
  },
  'metrics.go.memory.used': {
    name: 'metrics.go.memory.used',
    description: 'Memory used by the Go runtime.',
    type: 'double'
  }
  // ... 953 more field definitions
};
```

## Usage

### Importing Generated Fields

```typescript
import { semconvFlat } from '@kbn/otel-semantic-conventions';

// Get field metadata
const serviceNameField = semconvFlat['service.name'];
console.log(serviceNameField.description); // "Logical name of the service."
```

### Using with Field Metadata Service

The generated fields are automatically integrated into Kibana's Field Metadata Service and available through the standard API:

```typescript
// In your plugin
const fieldMetadata = await fieldsMetadataClient.getByName('service.name');
// Returns OpenTelemetry field metadata if not found in other repositories
```

## Generation Process

### Input Processing

The package processes two types of semantic convention groups:

1. **Registry Groups** (`registry.*`): Attribute definitions from OpenTelemetry registry
   - Extracts field names, descriptions, types, and examples
   - Converts complex type definitions to Elasticsearch field types
   - Processes 646 registry fields

2. **Metric Groups** (`metric.*`): Metric definitions and their attributes
   - Handles metric names and associated attributes
   - Maps metric types to appropriate Elasticsearch types
   - Processes 310 metric fields (347 metrics + 91 attributes)

### Type Mapping

OpenTelemetry types are automatically mapped to Elasticsearch field types:

| OpenTelemetry Type | Elasticsearch Type |
|-------------------|-------------------|
| `string`          | `keyword`         |
| `int`             | `long`            |
| `double`          | `double`          |
| `boolean`         | `boolean`         |
| `enum`            | `keyword`         |
| Complex objects   | `keyword` (fallback) |

## Scripts

### Generate Field Definitions

```bash
# From Kibana root
node scripts/generate_otel_semconv.js
```

### Run Tests

```bash
# From Kibana root
yarn test:jest src/platform/packages/shared/kbn-otel-semantic-conventions
```

## File Structure

```
src/platform/packages/shared/kbn-otel-semantic-conventions/
├── assets/
│   └── resolved-semconv.yaml           # Input YAML from OpenTelemetry
├── src/
│   ├── lib/
│   │   └── generate_semconv.ts         # Core processing logic
│   ├── types/
│   │   └── semconv_types.ts            # TypeScript definitions
│   ├── generated/
│   │   └── resolved-semconv.ts         # Generated field definitions
│   ├── cli.ts                          # CLI interface
│   └── index.ts                        # Package exports
├── __tests__/
│   └── generate_semconv.test.ts        # Unit tests
├── index.ts                            # Root exports
├── package.json
├── kibana.jsonc                        # Package metadata
└── README.md
```

## Automated Updates

The package includes GitHub Actions integration for automated maintenance:

- **Weekly Updates**: Pulls latest semantic conventions every Monday
- **Docker Integration**: Uses official `otel/weaver` for YAML generation
- **Smart PRs**: Only creates pull requests when conventions change
- **Quality Assurance**: Automatic ESLint fixing and validation

Workflow location: `.github/workflows/update-otel-semconv.yml`

## Integration with Field Metadata Service

The generated fields integrate seamlessly with Kibana's existing field metadata infrastructure:

### Priority Resolution

OpenTelemetry fields are used as fallback in this priority order:
1. **Metadata Fields** (Core Elasticsearch fields)
2. **Integration Fields** (Package-specific definitions)  
3. **ECS Fields** (Elastic Common Schema)
4. **OpenTelemetry Fields** (This package)

### Repository Pattern

The package follows the established repository pattern used by ECS and integration field repositories, providing consistent APIs and performance characteristics.

## Development

### Adding New Processing Logic

Field processing logic is in `src/lib/generate_semconv.ts`. Key functions:

- `processRegistryGroups()`: Handles registry attribute groups
- `processMetricGroups()`: Processes metric definitions
- `mapOtelTypeToEsType()`: Converts OpenTelemetry types to Elasticsearch types
- `extractFirstExample()`: Extracts examples from YAML arrays

### Testing

The package includes comprehensive tests covering:

- YAML processing for registry and metric groups
- Type mapping edge cases  
- Error handling for malformed input
- Generated output validation

Run tests with `yarn test` or from Kibana root:
```bash
yarn test:jest src/platform/packages/shared/kbn-otel-semantic-conventions
```

## Troubleshooting

### Common Issues

**YAML Processing Errors**: Ensure the input `resolved-semconv.yaml` file is valid and follows the expected structure.

**Type Mapping Issues**: The package handles unknown OpenTelemetry types by defaulting to `keyword`. Check console output for mapping warnings.

**Generation Failures**: Verify file permissions and that the `generated/` directory is writable.

### Debugging

Enable verbose logging by running the CLI with debug output:
```bash
DEBUG=* node scripts/generate_otel_semconv.js
```

## Contributing

This package is maintained by the `@elastic/obs-onboarding-team`. When contributing:

1. Add tests for new functionality
2. Update type definitions as needed
3. Ensure generated files follow Kibana coding standards
4. Update documentation for API changes

## Related

- [OpenTelemetry Semantic Conventions](https://github.com/open-telemetry/semantic-conventions)
- [Kibana Field Metadata Service](../../../../../../x-pack/platform/plugins/shared/fields_metadata/)
- [Docker OTel Weaver](https://github.com/open-telemetry/weaver)