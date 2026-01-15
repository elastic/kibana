# @kbn/connector-specs

A TypeScript-based specification framework for defining Kibana connectors using a **single-file approach**. This package enables developers to define complete connector specifications that are automatically discovered and registered to the actions registry.

## Overview

The `@kbn/connector-specs` package provides a simplified, declarative way to define connectors for Kibana's Stack Connectors system. Instead of manually registering connectors across multiple files, you define a connector spec in `src/specs/<connector>/<connector>.ts`, and it will be automatically picked up and registered once exported from `src/all_specs.ts`.

### Key Features

- **Single-File Connector Definitions**: Define complete connector specs in one TypeScript file
- **Automatic Registration**: Connectors are automatically discovered and registered to the actions registry
- **Type-Safe**: Built on Zod schemas for validation and type safety
- **UI Derivation**: UI forms are automatically generated from schemas using metadata extensions
- **Standard Auth Patterns**: Reusable authentication schemas (Basic, Bearer, Headers)
- **Policy-Based Configuration**: Built-in support for rate limiting, retry policies, pagination, and more

## Quick Start (Recommended): Generate a New Connector Spec

Use the generator to create the folder structure and wire everything up:

```bash
node scripts/generate connector my_connector --id ".myConnector" --owner "@elastic/<team-name>"
```

This will:
- Create `src/specs/my_connector/my_connector.ts` (spec scaffold)
- Create `src/specs/my_connector/icon/index.tsx` (placeholder icon component)
- Update `src/all_specs.ts`
- Update `src/connector_icons_map.ts`
- Append a CODEOWNERS rule for the new folder

### Connector ID constraints

- Must start with `.`
- Allowed characters: `A-Z`, `a-z`, `0-9`, `.`, `_`, `-`
- Max length: **64**

## The “1.5 Files” Approach (Manual)

This package still follows a **1.5 files approach** for defining connectors:

1. **1 folder**: Create a connector folder (e.g., `src/specs/my_connector/`) containing `my_connector.ts`
2. **0.5 file**: Add a single export line to `src/all_specs.ts`:
   ```typescript
   export * from './specs/my_connector/my_connector';
   ```

That's it! Once exported from `all_specs.ts`, the connector spec is automatically discovered and registered to the actions registry during plugin initialization.

### How It Works

The registration happens automatically in both server and public plugin setup:

- **Server-side**: Connector specs are iterated and registered via `actions.registerSubActionConnectorType()`
- **Public-side**: Connector specs are registered to the UI registry

The `createConnectorTypeFromSpec()` function converts the `SingleFileConnectorDefinition` into the format expected by the actions registry.

## Quick Start

### Creating a New Connector

1. **Create the spec file** in `src/specs/<connector>/<connector>.ts`:

```typescript
// src/specs/my_connector/my_connector.ts
import { z } from '@kbn/zod';
import type { ConnectorSpec } from '../../connector_spec';

export const MyConnector: ConnectorSpec = {
  metadata: {
    id: '.my_connector',
    displayName: 'My Connector',
    description: 'A custom connector example',
    minimumLicense: 'gold',
    supportedFeatureIds: ['workflows'],
  },

  auth: {
    types: ['bearer'],
    headers: {
      'Content-Type': 'application/json',
    }
  },

  schema: z.object({
    url: z.string().url().describe('API URL'),
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
export * from './specs/my_connector/my_connector';
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
Directory containing actual connector implementations

#### `specs/<connector>/icon/`
Directory containing per-connector icon components (and optional assets)

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
  description: 'Description',        // Connector description
  icon?: string,                     // EUI icon name (e.g., 'addDataApp', 'globe') - only for built-in EUI icons
  docsUrl?: string,                  // Link to documentation
  minimumLicense: 'basic' | 'gold' | 'platinum' | 'enterprise',
  supportedFeatureIds: ['workflows', 'alerting', 'cases', ...],
}
```

### Auth Type

Specify which standard auth schemas (if any) are supported by this connector. If none
are specified, defaults to no authentication. Can also specify a custom schema for the authType
which will be used in place of the default

```typescript
auth: {
  types: [
    // use basic auth type with the default schema
    'basic',
    // use api_key_header auth type with a custom header field
    {
      type: 'api_key_header',
      defaults: {
        headerField: 'custom-api-key-field'
      }
    }
  ],
  // optionally add headers that will be added to all requests
  headers: {
    'Content-Type': 'application/json',
  }
}
```

### Schema

A single Zod schema containing all connector config fields and any secrets fields outside of the standard auth schemas

```typescript
schema: z.object({
  // Config fields
  url: z.string().url().describe('API URL'),
  
  // Secret fields (marked with meta.sensitive)
  apiKey: UISchemas.secret().describe('API Key'),
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

Icons can be provided in two ways: **built-in EUI icons** (for simple cases) or **lazy-loaded React components** (for custom icons).

### Method 1: Built-in EUI Icons

For connectors that don't need custom branding, you can use any built-in EUI icon by setting the icon name in metadata:

```typescript
metadata: {
  id: '.my_connector',
  displayName: 'My Connector',
  icon: 'addDataApp',  // Any EUI icon name (e.g., 'globe', 'link', 'cloud', etc.)
}
```

**Pros**: Simple, no additional files needed, no bundle size impact  
**Cons**: Limited to EUI's built-in icon set

**Note**: The `icon` field in metadata should **only** be used for EUI icon names. For custom icons, use the lazy-loaded approach below.

### Method 2: Lazy-Loaded Custom Icons (For Custom Branding)

For custom icons (logos, branded images, etc.), use lazy-loaded React components. This approach keeps custom icon assets out of the main bundle and loads them on-demand. To use lazy icons:

1. **Create an icon component** in `src/specs/{connector_folder}/icon/`:

**Option A: Using EuiIcon with an image file**

```typescript
// src/specs/my_connector/icon/index.tsx
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';
import myIcon from './my_connector.png'; // or .jpg, .svg

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={myIcon} {...props} />;
};
```

**Option B: Using a custom SVG component**

```typescript
// src/icons/my_connector.tsx
import React from 'react';
import type { ConnectorIconProps } from '../types';

export default (props: ConnectorIconProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#00A6C1" {...props}>
      <path d="M88.5,20.3c0-3.5-3.8-6.7-7.8-6.7H46V30h42.5L88.5,20.3z" />
    </svg>
  );
};
```

2. **Register the icon** in `src/connector_icons_map.ts`:

```typescript
// src/connector_icons_map.ts
import { lazy } from 'react';
import type { ConnectorIconProps } from './types';

export const ConnectorIconsMap: Map<
  string,
  React.LazyExoticComponent<React.ComponentType<ConnectorIconProps>>
> = new Map([
  // ... existing icons ...
  [
    '.my_connector',
    lazy(() => import(/* webpackChunkName: "connectorIconMyConnector" */ './specs/my_connector/icon')),
  ],
]);
```

3. **Omit the icon from metadata** (or leave it undefined):

```typescript
// src/specs/my_connector.ts
export const MyConnector: SingleFileConnectorDefinition = {
  metadata: {
    id: '.my_connector',  // Must match the key in ConnectorIconsMap
    displayName: 'My Connector',
    // icon is optional - will be resolved from ConnectorIconsMap
  },
  // ... rest of the definition
};
```

**Pros**: Better performance, code splitting, icons loaded on-demand, supports custom branding  
**Cons**: Requires additional files and registration

### Icon Resolution Priority

The system resolves icons in the following order:

1. If `metadata.icon` is set (EUI icon name), it's used directly
2. If `metadata.icon` is not set, the system looks up the connector ID in `ConnectorIconsMap`
3. If no icon is found, defaults to the `'globe'` icon

## TypeScript Support

The package provides full TypeScript support:

```typescript
import type { 
  ConnectorSpec,
  ActionDefinition,
  ConnectorMetadata,
} from '@kbn/connector-specs';
```

## Related Documentation

- [Connector Spec](./src/connector_spec.ts) - Full API reference
- [UI Metadata System](./src/connector_spec_ui.ts) - UI derivation documentation

## Contributing

When adding a new connector:

1. Create the connector folder in `src/specs/<connector>/` with `<connector>.ts`
2. Export it from `src/all_specs.ts`
3. (Optional) Add an icon:
   - For simple cases: Use a built-in EUI icon by setting `metadata.icon` to an EUI icon name (e.g., `'globe'`, `'addDataApp'`)
   - For custom branding: Create a lazy icon component in `src/specs/<connector>/icon/` and register it in `src/connector_icons_map.ts`
4. Follow the existing patterns for consistency
5. Include proper TypeScript types
6. Add appropriate UI metadata for better UX
7. Consider adding a test file (`src/specs/{connector}.test.ts`) to validate your action handlers. See existing connector tests for examples.
8. End-user documentation for connectors lives in `docs/reference/connectors-kibana/{connector-name}-action-type.md`. See existing connector docs for the expected structure. Don't forget to update the TOC and relevant `_snippets/` files!

### Adding a Lazy Icon

When creating a new connector with a lazy icon:

1. Create the icon component file(s):
   - For simple SVGs: `src/specs/{connector_folder}/icon/index.tsx`
   - For icons with assets: `src/specs/{connector_folder}/icon/index.tsx` and asset files
2. Register in `src/connector_icons_map.ts`:
   ```typescript
   [
     '.your_connector_id',
     lazy(() => import(/* webpackChunkName: "connectorIconYourConnector" */ './specs/your_connector_folder/icon')),
   ],
   ```
3. Ensure `metadata.id` in your spec matches the key in the map (including the leading dot)

## License

Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0
