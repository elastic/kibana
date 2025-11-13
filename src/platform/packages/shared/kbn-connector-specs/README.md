# @kbn/connector-specs

A TypeScript-based specification framework for defining Kibana connectors using a **single-file approach**. This package enables developers to define complete connector specifications that are automatically discovered and registered to the actions registry.

## Overview

The `@kbn/connector-specs` package provides a simplified, declarative way to define connectors for Kibana's Stack Connectors system. Instead of manually registering connectors across multiple files, you can define a complete connector specification in a single TypeScript file, and it will be automatically picked up and registered.

### Key Features

- **Single-File Connector Definitions**: Define complete connector specs in one TypeScript file
- **Automatic Registration**: Connectors are automatically discovered and registered to the actions registry
- **Type-Safe**: Built on Zod schemas for validation and type safety
- **UI Derivation**: UI forms are automatically generated from schemas using metadata extensions
- **Standard Auth Patterns**: Reusable authentication schemas (Basic, Bearer, Headers)
- **Policy-Based Configuration**: Built-in support for rate limiting, retry policies, pagination, and more

## The 1.5 Files Approach

This package implements a **1.5 files approach** for defining connectors:

1. **1 file**: Create a single TypeScript file (e.g., `src/specs/my_connector.ts`) that exports a `SingleFileConnectorDefinition`
2. **0.5 file**: Add a single export line to `src/all_specs.ts`:
   ```typescript
   export * from './specs/my_connector';
   ```

That's it! Once exported from `all_specs.ts`, the connector spec is automatically discovered and registered to the actions registry during plugin initialization.

### How It Works

The registration happens automatically in both server and public plugin setup:

- **Server-side**: Connector specs are iterated and registered via `actions.registerSubActionConnectorType()`
- **Public-side**: Connector specs are registered to the UI registry

The `createConnectorTypeFromSpec()` function converts the `SingleFileConnectorDefinition` into the format expected by the actions registry.

## Quick Start

### Creating a New Connector

1. **Create the spec file** in `src/specs/`:

```typescript
// src/specs/my_connector.ts
import { z } from '@kbn/zod';
import type { SingleFileConnectorDefinition } from '../connector_spec';
import { BearerAuthSchema, UISchemas } from '../connector_spec';

export const MyConnector: SingleFileConnectorDefinition = {
  metadata: {
    id: '.my_connector',
    displayName: 'My Connector',
    description: 'A custom connector example',
    minimumLicense: 'gold',
    supportedFeatureIds: ['alerting'],
  },

  schema: z.object({
    url: z.string().url().describe('API URL'),
    ...BearerAuthSchema.shape,
  }),

  actions: {
    execute: {
      isTool: true,
      input: z.object({
        message: z.string().describe('Message to send'),
      }),
      handler: async (ctx, input) => {
        const response = await ctx.client.post(`${ctx.config.url}/api/endpoint`, {
          data: input,
        });
        return response.data;
      },
    },
  },

  test: {
    handler: async (ctx) => {
      await ctx.client.get(`${ctx.config.url}/health`);
      return { ok: true, message: 'Connection successful' };
    },
  },
};
```

2. **Export from `all_specs.ts`**:

```typescript
// src/all_specs.ts
export * from './specs/my_connector';
```

3. **Done!** The connector will automatically appear in the Kibana UI.

## Architecture

### Core Components

#### `connector_spec.ts`
The main specification file that defines:
- `SingleFileConnectorDefinition` - The main interface for connector definitions
- Standard authentication schemas (Basic, Bearer, Headers)
- Policy interfaces (RateLimit, Pagination, Retry, Error, Streaming)
- Action definitions and context types
- Helper utilities

#### `connector_spec_ui.ts`
UI metadata extension system that enables:
- Automatic UI form generation from Zod schemas
- Field-level UI hints (sensitive fields, widgets, sections, ordering)
- Conditional field visibility
- Dynamic option loading from actions
- Pre-configured schema helpers (`UISchemas.secret()`, `UISchemas.textarea()`, etc.)

#### `specs/`
Directory containing actual connector implementations:
- `virustotal.ts` - Threat intelligence connector
- `shodan.ts` - Asset discovery connector
- `abuseipdb.ts`, `alienvault_otx.ts`, `greynoise.ts`, `urlvoid.ts` - Security connectors

### Design Principles

1. **Single Schema**: Config and secrets are defined together in one schema, with secrets marked using `meta.sensitive`
2. **Zod as Source of Truth**: Validation and UI are both derived from Zod schemas
3. **Standard Auth Patterns**: Reusable authentication schemas reduce boilerplate
4. **UI Derivation**: Forms are automatically generated from schemas with optional metadata hints
5. **Type Safety**: Full TypeScript support with proper typing throughout

## Connector Definition Structure

A `SingleFileConnectorDefinition` consists of:

### Metadata

```typescript
metadata: {
  id: '.connector_id',              // Unique connector identifier
  displayName: 'Connector Name',     // User-facing name
  icon?: string,                     // Base64-encoded icon (SVG or PNG)
  description: 'Description',        // Connector description
  docsUrl?: string,                  // Link to documentation
  minimumLicense: 'basic' | 'gold' | 'platinum' | 'enterprise',
  supportedFeatureIds: ['alerting', 'cases', ...],
}
```

### Schema

A single Zod schema containing all connector fields (config + secrets):

```typescript
schema: z.object({
  // Config fields
  url: z.string().url().describe('API URL'),
  
  // Secret fields (marked with meta.sensitive)
  apiKey: UISchemas.secret().describe('API Key'),
  
  // Or use standard auth schemas
  ...BearerAuthSchema.shape,
})
```

### Actions

Actions define what the connector can do:

```typescript
actions: {
  actionName: {
    isTool?: boolean,              // Whether this action is a tool (for AI workflows)
    input: z.ZodSchema,            // Input validation schema
    output?: z.ZodSchema,          // Output validation schema (optional)
    handler: async (ctx, input) => {
      // Action implementation
      return result;
    },
    description?: string,
    actionGroup?: string,
    supportsStreaming?: boolean,
  },
}
```

### Test

Optional connection test:

```typescript
test: {
  handler: async (ctx) => {
    // Test connection logic
    return { ok: boolean, message?: string };
  },
  description?: string,
}
```

### Policies (Optional)

Configure connector behavior:

```typescript
policies: {
  rateLimit?: RateLimitPolicy,
  pagination?: PaginationPolicy,
  retry?: RetryPolicy,
  error?: ErrorPolicy,
  streaming?: StreamingPolicy,
}
```

## Authentication Patterns

### Header-Based Authentication

```typescript
import { HeaderAuthSchema } from '../connector_spec';

schema: z.discriminatedUnion('method', [
  z.object({
    method: z.literal('headers'),
    headers: z.object({
      'X-API-Key': UISchemas.secret().describe('API Key'),
    }),
  }),
])
```

### Bearer Token Authentication

```typescript
import { BearerAuthSchema } from '../connector_spec';

schema: z.object({
  url: z.string().url(),
  ...BearerAuthSchema.shape,
})
```

### Basic Authentication

```typescript
import { BasicAuthSchema } from '../connector_spec';

schema: z.object({
  url: z.string().url(),
  ...BasicAuthSchema.shape,
})
```

## UI Metadata

Use the `withUIMeta` helper or `UISchemas` to add UI hints:

```typescript
import { withUIMeta, UISchemas } from '../connector_spec_ui';

// Sensitive field (password/token)
apiKey: UISchemas.secret('sk-...').describe('API Key')

// Multi-line text
message: UISchemas.textarea({ rows: 5 }).describe('Message')

// JSON editor
config: UISchemas.json().describe('Configuration')

// With custom metadata
field: withUIMeta(z.string(), {
  sensitive: true,
  section: 'Authentication',
  order: 1,
  placeholder: 'Enter value...',
  helpText: 'Additional help text',
}).describe('Field Label')
```

## Examples

### VirusTotal Connector

See `src/specs/virustotal.ts` for a complete example with:
- Header-based authentication
- Multiple tool actions (scanFileHash, scanUrl, submitFile, getIpReport)
- Base64-encoded icon
- Connection testing

### Shodan Connector

See `src/specs/shodan.ts` for an example with:
- API key authentication
- Search and lookup actions
- Pagination support

## Advanced Features

### Dynamic Options

Load dropdown options from another action:

```typescript
channel: z.string().meta({
  optionsFrom: {
    action: 'getChannels',
    map: (result) => result.channels.map(c => ({ 
      value: c.id, 
      label: c.name 
    })),
    cacheDuration: 300,
  },
}).describe('Channel')
```

### Conditional Fields

Show/hide fields based on other field values:

```typescript
customHost: z.string().meta({
  when: {
    field: 'serviceType',
    is: 'custom',
    then: 'show',
  },
}).describe('Custom Host')
```

### Streaming Support

Enable streaming responses:

```typescript
policies: {
  streaming: {
    enabled: true,
    mechanism: 'sse',  // or 'chunked', 'websocket'
    parser: 'ndjson',  // or 'json', 'text', 'custom'
  },
}
```

### Rate Limiting

Configure rate limit handling:

```typescript
policies: {
  rateLimit: {
    strategy: 'header',
    remainingHeader: 'X-RateLimit-Remaining',
    resetHeader: 'X-RateLimit-Reset',
  },
}
```

## Icons

Icons can be set using base64 encoding. Both SVG and PNG formats are supported:

```typescript
metadata: {
  icon: `data:image/png;base64,${getIconPngBase64()}`,
  // or
  icon: `data:image/svg+xml;base64,${getIconSvgBase64()}`,
}
```

See `src/specs/virustotal.ts` for a complete example.

## TypeScript Support

The package provides full TypeScript support:

```typescript
import type { 
  SingleFileConnectorDefinition,
  ActionDefinition,
  ConnectorMetadata,
} from '@kbn/connector-specs';
```

## Related Documentation

- [Examples README](./src/examples/README.md) - Detailed examples from real connectors
- [Connector Spec](./src/connector_spec.ts) - Full API reference
- [UI Metadata System](./src/connector_spec_ui.ts) - UI derivation documentation

## Contributing

When adding a new connector:

1. Create the spec file in `src/specs/`
2. Export it from `src/all_specs.ts`
3. Follow the existing patterns for consistency
4. Include proper TypeScript types
5. Add appropriate UI metadata for better UX

## License

Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0
