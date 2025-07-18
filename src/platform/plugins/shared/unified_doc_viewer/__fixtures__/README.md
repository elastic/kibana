# Unified Doc Viewer Fixtures

This directory contains test fixtures used by Storybook stories for the unified doc viewer components.

## Fixture Organization

Fixtures are named using the pattern: `{component_type}_{source}_{description}.json`

### Component Types
- `logs_` - Log document fixtures
- `attributes_` - Attributes overview fixtures  
- `span_` - Span overview fixtures
- `transaction_` - Transaction overview fixtures

### Sources
- `apm` - APM-generated data
- `otel` - OpenTelemetry data

### Examples
- `logs_otel_example.json` - Example log document from OpenTelemetry
- `span_apm_minimal.json` - Minimal span from APM
- `transaction_http_server_otel.json` - HTTP server transaction from OpenTelemetry
- `attributes_basic.json` - Basic attributes overview example

## Usage

All fixtures are imported in the respective story files using relative paths from the component directory:

```typescript
import fixture from '../../../__fixtures__/component_type_source_description.json';
```

## Adding New Fixtures

When adding new fixtures:
1. Follow the naming convention above
2. Place the file in this top-level `__fixtures__` directory
3. Update the appropriate story file to import and use the new fixture
4. Document the fixture purpose in this README if needed
