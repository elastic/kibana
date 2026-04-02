# Connector Patterns

This document describes the file structure and patterns for creating new connectors with workflows in Kibana.

## Directory Structure

Connector specs live in: `src/platform/packages/shared/kbn-connector-specs/src/specs/`

```
kbn-connector-specs/src/specs/
├── all_specs.ts                # Registration file - ADD YOUR SPEC HERE
├── slack/
│   ├── slack.ts                # Connector spec
│   ├── slack.test.ts           # Tests
│   ├── types.ts                # Zod schemas and inferred types
│   ├── icon/
│   │   └── index.tsx           # Brand icon component
│   └── workflows/
│       ├── search_messages.yaml
│       └── send_message.yaml
├── github/
│   ├── github.ts
│   ├── github.test.ts
│   ├── types.ts
│   ├── icon/
│   │   └── index.tsx
│   └── workflows/
│       ├── search_code.yaml
│       ├── search_issues.yaml
│       └── ...
└── {your_connector}/           # YOUR NEW CONNECTOR
    ├── {your_connector}.ts
    ├── {your_connector}.test.ts
    ├── types.ts
    ├── icon/
    │   └── index.tsx
    └── workflows/
        └── *.yaml
```

## Scaffold Generator

For new connectors, run:

```bash
node scripts/generate connector <name> --id ".<id>" --owner "<team>"
```

Replace `<team>` with the owning GitHub team. Ask the user if unsure.

The generator creates:
- Connector spec stub, test stub, icon placeholder
- Documentation page at `docs/reference/connectors-kibana/`
- Updates to `all_specs.ts`, `connector_icons_map.ts`, CODEOWNERS, docs TOC

After running the generator, fill in the TODO placeholders.

## Connector Spec Structure

```typescript
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { SearchInputSchema, GetItemInputSchema } from './types';
import type { SearchInput, GetItemInput } from './types';

import searchWorkflow from './workflows/search.yaml';
import getItemWorkflow from './workflows/get_item.yaml';

export const YourConnector: ConnectorSpec = {
  metadata: {
    id: '.your_connector',           // MUST start with a dot
    displayName: 'Your Connector',
    description: 'Search items, list collections, and retrieve details from Your Service',
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [{ type: 'bearer' }],     // or 'api_key_header', 'oauth_client_credentials'
  },

  schema: z.object({
    // Config fields (optional — only if the connector needs user-configured settings)
  }),

  actions: {
    search: {
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        const response = await ctx.request({ method: 'GET', url: '/search', params: input });
        return response.data;
      },
    },
    getItem: {
      input: GetItemInputSchema,
      handler: async (ctx, input: GetItemInput) => {
        const response = await ctx.request({ method: 'GET', url: `/items/${input.id}` });
        return response.data;
      },
    },
  },

  agentBuilderWorkflows: [searchWorkflow, getItemWorkflow],
};
```

## Input Schemas & Types

Define Zod schemas and inferred types in a separate `types.ts` file alongside the connector spec. This keeps schemas as the single source of truth for both runtime validation and TypeScript types.

**Path**: `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/types.ts`

```typescript
import { z } from '@kbn/zod/v4';

export const SearchInputSchema = z.object({
  query: z.string().describe('Search query string'),
  limit: z.number().optional().describe('Maximum results (default: 20)'),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const GetItemInputSchema = z.object({
  id: z.string().describe('The item ID'),
});
export type GetItemInput = z.infer<typeof GetItemInputSchema>;
```

This pattern (used by ServiceNow, Slack, GitHub connectors):
- Eliminates drift between schemas and types — `z.infer` derives the type from the schema
- Keeps the main connector file focused on handler logic
- Gives handlers full autocomplete without inline `as` casts

## MCP-Native Connector Pattern

For connectors backed by an MCP server. Uses `withMcpClient` from `lib/mcp` to wrap MCP tool calls as typed actions.

```typescript
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { withMcpClient } from '../../lib/mcp/with_mcp_client';
import { UISchemas } from '../../connector_spec_ui';

import searchWorkflow from './workflows/search.yaml';

export const YourMcpConnector: ConnectorSpec = {
  metadata: {
    id: '.your_mcp_connector',
    displayName: 'Your MCP Connector',
    description: 'Search and retrieve data via Your Service MCP server',
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [{ type: 'bearer' }],
  },

  schema: z.object({
    serverUrl: UISchemas.url('https://mcp.example.com/mcp/')
      .describe('MCP server URL')
      .meta({ label: 'Server URL' }),
  }),

  actions: {
    search: {
      input: z.object({ query: z.string() }),
      handler: withMcpClient(async (client, input) => {
        return client.callTool({ name: 'your_search', arguments: input });
      }),
    },
    // Escape hatches for dynamic tool discovery
    listTools: {
      input: z.object({}),
      handler: withMcpClient(async (client) => {
        return client.listTools();
      }),
    },
    callTool: {
      input: z.object({
        name: z.string(),
        arguments: z.record(z.unknown()).optional(),
      }),
      handler: withMcpClient(async (client, input) => {
        return client.callTool(input);
      }),
    },
  },

  agentBuilderWorkflows: [searchWorkflow],
};
```

**Reference connectors:**
- GitHub: `src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.ts`
- Tavily: `src/platform/packages/shared/kbn-connector-specs/src/specs/tavily/tavily.ts`

## Schema UI Configuration

Schema config fields define the "Connector settings" section of the creation form. Every field in the `schema` object **must** have `.meta()` with at least a `label`, or the field will render as an unlabeled input.

```typescript
schema: z.object({
  instanceUrl: z
    .string()
    .url()
    .describe('ServiceNow instance URL')
    .meta({
      label: 'Instance URL',           // REQUIRED - displayed as the field label
      widget: 'text',                   // Widget type (text, password, select, etc.)
      placeholder: 'https://your-instance.service-now.com',
    }),
}),
```

Available `.meta()` options: `label`, `widget`, `placeholder`, `helpText`, `hidden`, `sensitive`, `disabled`, `order`.

For URL fields, use the `UISchemas.url()` helper from `connector_spec_ui.ts`:

```typescript
import { UISchemas } from '../../connector_spec_ui';

schema: z.object({
  apiUrl: UISchemas.url('https://api.example.com')
    .describe('API endpoint URL')
    .meta({ label: 'API URL' }),
}),
```

## OAuth Auth Configuration

When using `oauth_client_credentials`, customize the auth form to minimize user friction. Use `defaults` to pre-populate known values and `overrides.meta` to hide or relabel fields.

```typescript
auth: {
  types: [
    {
      type: 'oauth_client_credentials',
      defaults: {
        tokenUrl: 'https://{instance}.service-now.com/oauth_token.do',
      },
      overrides: {
        meta: {
          scope: { hidden: true },
          tokenUrl: {
            placeholder: 'https://your-instance.service-now.com/oauth_token.do',
          },
        },
      },
    },
  ],
},
```

**Goal**: The user should only need to fill in values they actually know (instance URL, client ID, client secret). Everything else should be pre-populated or hidden.

## Icon Patterns

### Option 1: SVG Icon Component

**Path**: `src/platform/packages/shared/kbn-connector-specs/src/specs/{name}/icon/index.tsx`

```typescript
import React from 'react';
import type { ConnectorIconProps } from '../../../types';

export default (props: ConnectorIconProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" {...props}>
      {/* SVG paths from the original logo */}
    </svg>
  );
};
```

### Option 2: PNG Image

```typescript
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';
import iconImage from './icon.png';

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={iconImage} {...props} />;
};
```

### Register the Icon

Add to `src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts`:

```typescript
[
  '.your_connector',
  lazy(
    () => import(/* webpackChunkName: "connectorIconYourConnector" */ './specs/your_connector/icon')
  ),
],
```

## Where to Find Existing Logos

1. **Connector Specs** (SVG components):
   `src/platform/packages/shared/kbn-connector-specs/src/specs/{name}/icon/`

2. **Stack Connectors** (SVG components):
   `x-pack/platform/plugins/shared/stack_connectors/public/connector_types/{connector}/logo.tsx`

3. **Data Connectors Plugin** (various formats):
   `packages/kbn-data-connectors-plugin/`

## Naming Conventions

| Item | Convention | Example                                    |
|------|------------|--------------------------------------------|
| Directory name | snake_case | `sharepoint_online`                        |
| Connector ID | **MUST start with dot**, snake_case | `.sharepoint-online`, `.servicenow_search` |
| Workflow files | snake_case.yaml | `search_code.yaml`                         |
| TypeScript files | snake_case.ts | `types.ts`                                 |
| Export names | PascalCase for specs | `SharepointOnline`                         |
| Test files | {name}.test.ts | `sharepoint_online.test.ts`                |

## Critical ID Alignment

The following IDs **MUST all match exactly**:

1. `ConnectorSpec.metadata.id` in the connector spec
2. Key in `ConnectorIconsMap` in `connector_icons_map.ts`

If a connector already exists with a given ID, use a unique variant (like `.servicenow_search`).

## Workflow YAML in Connector Specs

Workflow YAML files are imported as raw strings and listed in `agentBuilderWorkflows`:

```typescript
import searchWorkflow from './workflows/search.yaml';
import getItemWorkflow from './workflows/get_item.yaml';

export const YourConnector: ConnectorSpec = {
  // ...
  agentBuilderWorkflows: [searchWorkflow, getItemWorkflow],
};
```

### Connector ID Template Variables

The `connector-id` field in workflow YAML uses a template variable derived from the connector type:

```
<%= {trimStart(connectorType, '.')}-stack-connector-id %>
```

Examples:
- `.slack2` → `<%= slack2-stack-connector-id %>`
- `.github` → `<%= github-stack-connector-id %>`
- `.tavily` → `<%= tavily-stack-connector-id %>`

### Workflow Auto-Creation

When `agentBuilder:connectorsEnabled` is true:
1. User creates a connector instance of type X
2. The connector lifecycle handler reads `agentBuilderWorkflows` from the spec
3. For each YAML template: renders the template, creates workflow, and (if tagged `agent-builder-tool`) creates an Agent Builder tool
4. Everything is tagged with `connector:{connectorId}` for cleanup on delete

## `metadata.description` Quality

The description is shown in the UI and surfaced to AI agents. Write it to accurately reflect capabilities.

**Rules:**
- **List the key verbs/actions** the connector supports (e.g., "search", "list", "download", "send")
- **Name the objects** those actions operate on (e.g., "messages", "issues", "files")
- **Keep to one sentence** — ~15 words max
- **Don't start with "Connect to X"** — that's implied
- **Don't say "Kibana Stack Connector for X"** — that's an implementation detail

**Good examples:**
- `'Search messages, list public channels, and send messages in Slack'`
- `'Search repositories, issues, and pull requests, browse file contents, and list branches in GitHub'`

**Bad examples:**
- `'Connect to Jira to pull data from your project.'` — too vague
- `'Kibana Stack Connector for SharePoint Online.'` — says nothing about capabilities
