# Connector Patterns

This document describes the file structure and patterns for creating new connectors in Kibana.

## Directory Structure

Connector specs live in: `src/platform/packages/shared/kbn-connector-specs/src/specs/`

```
kbn-connector-specs/src/specs/
├── all_specs.ts                # Registration file - ADD YOUR SPEC HERE
├── slack/
│   ├── slack.ts                # Connector spec
│   ├── slack.test.ts           # Tests
│   ├── types.ts                # Zod schemas and inferred types
│   └── icon/
│       └── index.tsx           # Brand icon component
├── github/
│   ├── github.ts
│   ├── github.test.ts
│   ├── types.ts
│   └── icon/
│       └── index.tsx
└── {your_connector}/           # YOUR NEW CONNECTOR
    ├── {your_connector}.ts
    ├── {your_connector}.test.ts
    ├── types.ts
    ├── {helper}.ts             # Optional: helpers moved out of the spec file
    ├── {helper}.test.ts
    └── icon/
        └── index.tsx
```

### Keep the spec file under 500 lines

`{your_connector}.ts` should read as a table of contents: metadata, auth, config schema, and the
actions, each with a short handler. Aim for under 500 lines, and treat 1000 as a limit you must not
exceed. When the file grows past 500, move code into sibling files in the connector directory, named
for what they hold:

- request plumbing (base URL, auth headers, error mapping, pagination and polling loops) — e.g.
  `client.ts`
- response shaping and other pure transformations (mapping vendor objects to the returned shape,
  building a payload) — e.g. `format.ts`, or a name for the domain, like `gmail/mime.ts`
- token or credential exchanges — e.g. `azure_monitor/azure_ad_token.ts`
- constants shared by several of those files — `constants.ts`
- a group of related actions whose handlers stay long even after that, as an exported object of action
  definitions — e.g. `slack/events.ts`, spread into `actions` in the spec file

Handlers call those functions; they do not re-implement them. Keep one function per job, shared by
every action that needs it, rather than one copy per handler. Each helper file gets its own
`{helper}.test.ts` for its edge cases (see `gmail/mime.test.ts`); the spec's test file keeps testing
the actions end to end. Helper files follow the same rules as the spec: no Node built-ins, typed
inputs, and schemas stay in `types.ts`.

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
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { SearchInputSchema, GetItemInputSchema } from './types';
import type { SearchInput, GetItemInput } from './types';

export const YourConnector: ConnectorSpec = {
  metadata: {
    id: '.your_connector',           // MUST start with a dot
    displayName: 'Your Connector',
    description: i18n.translate('core.kibanaConnectorSpecs.yourConnector.metadata.description', {
      defaultMessage: 'Search items, list collections, and retrieve details from Your Service',
    }),
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // and others in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [{ type: 'bearer' }],     // or 'api_key_header', 'oauth_client_credentials'
  },

  schema: lazySchema(() =>
    z.object({
      // Config fields (optional — only if the connector needs user-configured settings)
    })
  ),

  actions: {
    search: {
      isTool: true,
      scope: 'read',
      description: 'Search items by keyword. Returns a ranked list of matching results with IDs and summaries.',
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        const response = await ctx.client.request({ method: 'GET', url: '/search', params: input });
        return response.data;
      },
    },
    getItem: {
      isTool: true,
      scope: 'read',
      description: 'Retrieve full details for a single item by ID. Use the IDs returned by the search action.',
      input: GetItemInputSchema,
      handler: async (ctx, input: GetItemInput) => {
        // Always encodeURIComponent() a user-supplied value interpolated into a URL
        // path segment — schemas typically only bound length, not character set, so
        // an id/slug containing "/", "?", "#", or a space would otherwise corrupt
        // the request path.
        const response = await ctx.client.request({
          method: 'GET',
          url: `/items/${encodeURIComponent(input.id)}`,
        });
        return response.data;
      },
    },
  },

  skill: [
    'To find and read an item: first call `search` with a keyword query, then call `getItem` with an ID from the results.',
    'The `search` action returns at most 20 results by default; use the `limit` parameter to request more.',
    'Item IDs are not stable across connector instances — always search before referencing an ID.',
  ].join('\n'),

  test: {
    // Must be true, or the "Test connector" button stays disabled in the UI
    // even though a handler is defined.
    enabled: true,
    description: 'Verifies the connection by calling a cheap, read-only endpoint.',
    handler: async (ctx) => {
      await ctx.client.request({ method: 'GET', url: '/ping' });
      return {};
    },
  },
};
```

## Input Schemas & Types

Define Zod schemas and inferred types in a separate `types.ts` file alongside the connector spec. This keeps schemas as the single source of truth for both runtime validation and TypeScript types.

**Path**: `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/types.ts`

```typescript
import { z, lazySchema } from '@kbn/zod/v4';

export const SearchInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(1000).describe('Search query string'),
    limit: z.number().optional().describe('Maximum results (default: 20)'),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const GetItemInputSchema = lazySchema(() =>
  z.object({
    id: z.string().max(255).describe('The item ID'),
  })
);
export type GetItemInput = z.infer<typeof GetItemInputSchema>;
```

This pattern (used by ServiceNow, Slack, GitHub connectors):
- Eliminates drift between schemas and types — `z.infer` derives the type from the schema
- Keeps the main connector file focused on handler logic
- Gives handlers full autocomplete without inline `as` casts

**Every Zod schema assigned to a variable is wrapped in `lazySchema()`** — not only the exported
input schemas, but module-level helpers too:

```typescript
const IpAddressSchema = lazySchema(() => z.union([z.ipv4(), z.ipv6()]));
```

`lazySchema` defers building the schema until first use, so loading the connector registry does not
build every connector's schemas at import time. The spec's `schema` and any inline action `input` are
wrapped the same way.

## MCP-Native Connector Pattern

For connectors backed by an MCP server. Uses `withMcpClient` from `lib/mcp` to wrap MCP tool calls as typed actions.

```typescript
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import { withMcpClient } from '../../lib/mcp/with_mcp_client';
import { UISchemas } from '../../connector_spec_ui';

export const YourMcpConnector: ConnectorSpec = {
  metadata: {
    id: '.your_mcp_connector',
    displayName: 'Your MCP Connector',
    description: 'Search and retrieve data via Your Service MCP server',
    minimumLicense: 'enterprise',
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // and others in a follow-up PR.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [{ type: 'bearer' }],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url('https://mcp.example.com/mcp/')
        .describe('MCP server URL')
        .meta({ label: 'Server URL' }),
    })
  ),

  actions: {
    search: {
      isTool: true,
      scope: 'read',
      description: 'Search Your Service by keyword using the underlying MCP tool.',
      input: lazySchema(() =>
        z.object({
          query: z.string().max(1000).describe('Keyword or natural-language search query'),
        })
      ),
      handler: withMcpClient(async (client, input) => {
        return client.callTool({ name: 'your_search', arguments: input });
      }),
    },
    // Escape hatches for dynamic tool discovery
    listTools: {
      isTool: true,
      scope: 'read',
      description: 'List all MCP tools exposed by the server. Useful for dynamic discovery.',
      input: lazySchema(() => z.object({})),
      handler: withMcpClient(async (client) => {
        return client.listTools();
      }),
    },
    callTool: {
      isTool: true,
      scope: 'destroy',
      description: 'Call any MCP tool by name with arbitrary arguments. Use listTools first to discover available tools.',
      input: lazySchema(() =>
        z.object({
          name: z.string().min(1).max(200).describe('The MCP tool name (from listTools)'),
          arguments: z.record(z.string().max(200), z.unknown()).optional().describe('Tool arguments as a key/value map'),
        })
      ),
      handler: withMcpClient(async (client, input) => {
        return client.callTool(input);
      }),
    },
  },

  skill: [
    'To search: call `search` with a keyword query.',
    'For tools not covered by typed actions, use `listTools` to discover available MCP tools, then call them with `callTool`.',
  ].join('\n'),
};
```

**Reference connectors:**
- GitHub: `src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.ts`
- Tavily: `src/platform/packages/shared/kbn-connector-specs/src/specs/tavily/tavily.ts`

## HTTP Response Handling in Handlers

`ctx.client` is the authenticated `AxiosInstance` (`ActionContext.client` in `src/connector_spec.ts`), and
three of its defaults are wrong for a connector action. Each one produces a bug that type-checks, lints,
and passes mocked unit tests — a mock returns whatever you tell it to, so none of these surface until a
real service responds.

### Do not let a request follow redirects when it carries a credential in a custom header

Axios follows redirects by default and strips only the *standard* authorization headers on a cross-host
redirect. A credential in a vendor-specific header (`x-functions-key`, `x-api-key`, `private-token`) is
forwarded to whatever host the redirect names — a live credential leak to a third party.

Set `maxRedirects: 0` on any request that sends a credential in a custom header. `maxRedirects: 0` alone
is not enough to return the 3xx: Axios's default `validateStatus` rejects it, so the handler throws and
the caller never sees the `Location`. Accept the 3xx explicitly as well:

```typescript
const response = await ctx.client.request({
  method,
  url: `https://${host}/${path}`,
  headers: { 'x-functions-key': input.functionKey },
  maxRedirects: 0,
  validateStatus: (status: number) => status >= 200 && status < 400,
});
```

`jenkins.ts` sets both, for this reason. This is not theoretical: a function app that redirects to its
identity provider forwards the key there.

### Return the service's HTTP response as a result, not an exception

Axios rejects any non-2xx status, so a service deliberately answering `400`, `409`, or `500` takes the
`catch` path. An agent then sees a connector error instead of the response it needs to handle, and cannot
read the status, headers, or error body.

For any action that proxies a call whose non-2xx answers are meaningful, pass a `validateStatus`
predicate and return `{ status, headers, body }`:

```typescript
validateStatus: () => true,
```

**Within such an action, classify on evidence, not on the status code alone.** It is tempting to keep
`401`/`403` exceptional on the grounds that they mean a bad credential — but a service whose own code
enforces user authorization returns those statuses too, and the status cannot tell the two apart.
Excluding them by number makes the service's intended authorization response unreadable. Return every
HTTP status as a result and say so in the action `description` and the `skill` text ("check the `status`
field"); reserve exceptions for transport failures, which have no status at all.

This applies only inside an action whose contract is to proxy the service's answer. Everywhere else a
non-2xx is still an error: an ordinary `GET` that 404s or 401s has failed, and a connectivity `test`
handler **must** fail when its authentication fails — it exists to report whether the credential works,
so returning a 401 as a successful result reports a broken connector as healthy. Do not add
`validateStatus: () => true` to a `test` handler or a plain read.

### Follow the vendor's pagination continuation links

A list action that returns only the first page silently under-reports. An agent that asks "what apps do I
have?" and acts on a partial inventory is worse off than one that gets an error. Check the vendor's
response envelope for a continuation field (`nextLink`, `next`, `next_cursor`, a `Link` header) and
follow it in a helper shared by every list action, including the connectivity `test` handler if it counts
anything.

**First decide which of the two kinds of continuation the vendor gives you**, because they are submitted
differently and the wrong treatment silently stops the list after page one:

- **A URL continuation** (`nextLink`, `next`, a `Link` header) is a link. Resolve it and request the
  resolved URL, as the rest of this section describes.
- **A cursor token** (`next_cursor`, `nextPageToken`, `continuationToken`) is an opaque string, not a
  link. Send it back as the parameter the vendor names (`?cursor=...`), together with the original
  `params` — the filters are not encoded in the token, so dropping them re-queries the whole
  collection. Never pass a cursor to `new URL()`: a bare token has no path, so resolving it against the
  request URL produces a sibling path the connector never meant to call, and an origin check on that
  result passes while the request is wrong.

The remaining three details apply to a **URL** continuation:

- **Check the origin of a continuation URL before requesting it.** A vendor-supplied link is
  caller-untrusted data, and `ctx.client` carries the connector's credentials. Axios strips a standard
  authorization header on a cross-host *redirect*, but an explicit new request gets no such protection,
  so an attacker-influenced `nextLink` sends the credentials to the host it names and can reach an
  internal address. Stop paginating unless the link's origin matches the request you sent (or an
  explicitly allowed host).

  Resolve the link against the URL the client actually requested, and request the *resolved* URL.
  `new URL(nextLink)` alone throws on a relative link (`?page=2`, `/items?page=2`), which a `Link`
  header commonly carries, so a bare parse both breaks those vendors and reads as if every link were
  absolute.

  Take the base from `ctx.client.getUri()`, not from `new URL(url, baseURL)`. Axios does not resolve a
  path the way the `URL` constructor does: it *concatenates* `baseURL` and `url` (`combineURLs`
  strips the leading slash), so `baseURL: 'https://api.example/v1'` with `url: '/items'` is requested as
  `https://api.example/v1/items`, while `new URL('/items', 'https://api.example/v1')` gives
  `https://api.example/items`. Resolving a `?page=2` link against that wrong base silently continues
  paginating at an endpoint the connector never called:

  ```typescript
  const requested = new URL(ctx.client.getUri({ url, params }));
  const next = new URL(nextLink, requested); // resolves '?page=2' against the real request
  if (next.origin !== requested.origin) {
    break;
  }
  // request next.href, so a query-only link keeps the path it was relative to
  ```

- A continuation URL already carries the api-version and any skip token, whether the vendor gives it
  absolute or relative, so do not re-apply your own `params` — that corrupts it. Request the resolved
  URL as the vendor composed it, once the origin check above passes. This is the opposite of the cursor
  case above, where the original `params` must be re-sent alongside the token.
- Cap the number of pages followed, and report the cap in the result (e.g. `truncated: true`) so an agent
  narrows its query rather than treating a capped list as complete.

**Give every list action the same treatment.** Once one list action follows its continuation, check the
others in the same file. A list action that can return `hasMore: true` with no way to request the next
page is the same bug: the Bitbucket connector fixed `listCommits` and shipped `listCommitBuildStatuses`
without a cursor, so an agent checking statuses before a merge saw only the first page.

**Confirm the continuation kind from a live response, not only from the docs.** Vendors document one
endpoint's pagination and use another shape elsewhere. Log a real `next` value for each list endpoint
during live testing and decide URL versus cursor from what it contains.

### Never request a URL taken from a response or from the caller without checking it

The origin check above is not specific to pagination. Any URL the connector did not build itself and then
requests with `ctx.client` sends the connector's credentials to whatever host it names. That covers:

- **Async operation polling**: a `Location`, `Azure-AsyncOperation`, or `Operation-Location` header, or
  an operation `selfLink` in a response body. The AKS `runCommand` poller followed `Location` unchecked
  with the OAuth client, whose default `Authorization` header goes with every request.
- **Caller-supplied cursors that are full URLs**: a `nextCursor` returned to the agent and passed back as
  input is caller-controlled. Checking the host is not enough: the Bitbucket `listCommits` cursor passed
  an `api.bitbucket.org` check while naming another workspace's repository, so the connector's
  credentials read commits outside its configured workspace.

Resolve the URL against `ctx.client.getUri()` and check the origin, as above. For a caller-supplied URL,
also check that its path is the endpoint this action calls, for the configured tenant (workspace,
project, subscription) and the requested resource. Where the vendor's `next` link carries an opaque
token (`?cursor=...`, `?after=...`), prefer extracting that token and returning only the token to the
agent. The connector then rebuilds the request from its own path, and the caller never supplies a URL.

### Retry and poll only on transient statuses

A poll or retry loop that swallows every error turns a permanent failure into a timeout. The AKS
`runCommand` poller ignored every `GET` error, so a 403 on the operation-result endpoint surfaced as
"timed out after 60 seconds" instead of the missing permission. Retry only what can succeed on a
second try (a short-lived 404 while an operation is created, 429, 5xx); rethrow 400, 401, and 403
immediately with the vendor's message.

The same applies to friendly error explanations. A 401 means the credential was rejected; a 403 means it
was accepted but lacks a permission or scope. Do not give both the same explanation: the Bitbucket
connectivity test called every bearer 401 "expected for a repository-scoped token", which told a user
with an expired token that it still worked.

## Handler Context

`ctx.config` holds the connector's non-secret config fields. `ctx.secrets` holds the auth fields,
**including the `authType` discriminator** for a connector with more than one auth type. Branch on
`ctx.secrets?.authType`, as `slack.ts` does. The Bitbucket connector read `ctx.config.authType`, which is
always undefined, and its test passed because it put `authType` in `config` too. Build test contexts in
the same shape the executor does: config fields in `config`, auth fields and `authType` in `secrets`.

## Action Outputs

### A returned handle must carry everything the follow-up action needs

When an action returns something an agent is expected to pass to another action (an operation ID, a job
ID, a pipeline UUID, a discovered resource), include every input that follow-up call needs, especially
any value that overrides a connector default: project, subscription, region, workspace. The GKE
connector returned `operationId` and `location` but not `projectId`. An agent polling an operation
started in a non-default project with only those two values polled the default project instead.

The reverse applies to discovery actions. If an action lists subscriptions, projects, or workspaces, the
actions that operate inside one must accept it as an input override. The AKS connector's
`listSubscriptions` returned IDs that no other action accepted, since each read the subscription only from
config, so discovery led nowhere without a user editing the connector.

### Do not present a computed value as a vendor fact

Return what the vendor returned. If a field is derived (a count multiplied by zones, a status inferred
from two others), name it as what it is (`totalNodeCountEstimate`) and say in its description when it is
wrong, or leave it out. The GKE connector returned `initialNodeCount × zones` as `totalNodeCount`, which
is wrong for any autoscaled pool, and a capacity-remediation agent would act on it.

### Build derived blocks from every alternative field

When an output block depends on one of several alternative vendor fields (an IP endpoint or a DNS
endpoint; a legacy ID or a new one), build it when *any* of them is present. The GKE connector's
Kubernetes connector hand-off was gated on the IP `endpoint` alone, so DNS-only clusters lost the whole
block even though the DNS URL was already read.

## Schema UI Configuration

Schema config fields define the "Connector settings" section of the creation form. Every field in the `schema` object **must** have `.meta()` with at least a `label`, or the field will render as an unlabeled input.

```typescript
schema: lazySchema(() =>
  z.object({
    instanceUrl: z
      .string()
      .url()
      .describe('ServiceNow instance URL')
      .meta({
        label: 'Instance URL',           // REQUIRED - displayed as the field label
        widget: 'text',                   // Widget type (text, password, select, etc.)
        placeholder: 'https://your-instance.service-now.com',
      }),
  })
),
```

Available `.meta()` options: `label`, `widget`, `placeholder`, `helpText`, `hidden`, `sensitive`, `disabled`, `order`.

**Config fields must use a type the form-generator has a widget for.** The widget registry
(`x-pack/platform/packages/shared/response-ops/form-generator/src/widgets/registry.ts`) picks a widget
from the field's Zod type: strings, numbers (`z.number()`, `z.int()`), enums, objects, discriminated
unions, literals, and URLs. Any other type in the connector-level `config` schema — a `z.boolean()`, a
`z.array()`, a `z.record()` — throws `Error: No widget found for schema type: ... Please specify a
widget in the schema metadata.` when the creation form renders it. It is a runtime UI error, so type
check and unit tests do not catch it. Use a supported type, or set `widget` in `.meta()` explicitly.

A numeric config field is fine: the MySQL connector's `port` is a `z.number().int()` rendered by the
number widget.

This only applies to **connector-level `config` fields** (rendered by the form-generator). Action `input`
schemas are never rendered as a form.

**ICU-unsafe characters in translated help text**: `metadata.description` and any `helpText`/label string
that goes through `i18n.translate()` is parsed as an ICU message. A literal `<placeholder>` (e.g.
`'found in the URL: example.com/<slug>/'`) is parsed as an unclosed XML tag and throws a `FORMAT_ERROR`
when the spec is serialized to JSON schema for Agent Builder/Workflows — this only surfaces at runtime,
not at compile time or in a quick manual glance at the UI. Write placeholders without angle brackets, e.g.
`'found in the URL: example.com/your-slug/'`.

For URL fields, use the `UISchemas.url()` helper from `connector_spec_ui.ts`:

```typescript
import { UISchemas } from '../../connector_spec_ui';

schema: lazySchema(() =>
  z.object({
    apiUrl: UISchemas.url('https://api.example.com')
      .describe('API endpoint URL')
      .meta({ label: 'API URL' }),
  })
),
```

## OAuth Auth Configuration

When using `oauth_client_credentials` or `oauth_authorization_code`, customize the auth form to minimize user friction. Use `defaults` with `{ hidden: true }` for values that should be hardcoded, and `overrides.meta` with `placeholder` for values the user must provide.

### Defaults vs Placeholders

**Defaults** set the actual value of a field. On "Edit", defaults re-appear even though the user's original values are encrypted and cannot be read back. This means:

- **If a field has a true default** (a value that is always correct and the user should never change), set it as a `default` AND mark it `{ hidden: true }` so the user never sees it. Good examples: `scope` values, fixed OAuth endpoints (e.g. Google's `https://accounts.google.com/o/oauth2/v2/auth`).
- **If a field needs an example** (the user must enter their own value, like a tenant-specific URL), use a `placeholder` instead of a `default`. This way, on "Edit", the field appears empty rather than showing a misleading template value.

### Example: Fixed endpoints (Google, Notion, Figma, Zoom)

When the OAuth provider has a single, fixed set of endpoints, use hidden defaults for everything:

```typescript
auth: {
  types: [
    {
      type: 'oauth_authorization_code',
      defaults: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
      },
      overrides: {
        meta: {
          authorizationUrl: { hidden: true },
          tokenUrl: { hidden: true },
          scope: { hidden: true },
        },
      },
    },
  ],
},
```

### Example: Tenant-specific endpoints (SharePoint, ServiceNow)

When URLs vary per tenant/instance, use placeholders for URLs and hidden defaults for scope:

```typescript
auth: {
  types: [
    {
      type: 'oauth_client_credentials',
      defaults: {
        scope: 'https://graph.microsoft.com/.default',
      },
      overrides: {
        meta: {
          scope: { hidden: true },
          tokenUrl: {
            placeholder: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
            helpText: "Replace '{tenant-id}' with your Azure AD tenant ID.",
          },
        },
      },
    },
  ],
},
```

### Example: Variable endpoints (Salesforce)

When the provider has standard URLs that advanced users may change (e.g. sandbox vs production), use placeholders:

```typescript
auth: {
  types: [
    {
      type: 'oauth_authorization_code',
      defaults: {
        scope: 'api refresh_token',
      },
      overrides: {
        meta: {
          authorizationUrl: {
            placeholder: 'https://login.salesforce.com/services/oauth2/authorize',
          },
          tokenUrl: {
            placeholder: 'https://login.salesforce.com/services/oauth2/token',
          },
          scope: { hidden: true },
        },
      },
    },
  ],
},
```

**Key rules:**
- Never use `defaults` for a field the user sees on "Edit" — the default will overwrite their encrypted value.
- Always pair a `default` with `{ hidden: true }` so the field is invisible in the form.
- Use `placeholder` to show examples for fields the user must fill in.
- Use `{ disabled: true }` only when the value should be visible but not editable (rare).

## Icon Patterns

### Option 1: SVG File + EuiIcon (preferred)

Save the brand SVG as a separate file, then load it via `EuiIcon`. This matches the pattern used by `amazon_s3`, `bigquery`, `azure_blob`, `figma`, and most other connectors.

**`icon/box.svg`** — plain SVG markup (no JSX, no React imports):
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <!-- SVG paths from the original logo -->
</svg>
```

**`icon/index.tsx`**:
```typescript
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';

import connectorIcon from './connector_name.svg';

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={connectorIcon} {...props} />;
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
| TypeScript files | snake_case.ts | `types.ts`                                 |
| Export names | PascalCase for specs | `SharepointOnline`                         |
| Test files | {name}.test.ts | `sharepoint_online.test.ts`                |

## Critical ID Alignment

The following IDs **MUST all match exactly**:

1. `ConnectorSpec.metadata.id` in the connector spec
2. Key in `ConnectorIconsMap` in `connector_icons_map.ts`

If a connector already exists with a given ID, use a unique variant (like `.servicenow_search`).

## LLM-Quality Descriptions and Skill Content

Connectors surface three levels of natural-language guidance to AI agents: the connector-level `metadata.description`, per-action `description` fields, and an optional top-level `skill` property. All three are read by the agent at runtime — write them as if you were briefing a capable but uninformed assistant.

### `isTool` — exposing actions to Agent Builder

Set `isTool: true` on actions that should be discoverable by AI agents in Agent Builder. This is the common case — most actions should be tools. The default is `false`, so omitting it silently hides the action from agents.

Set `isTool: false` (or omit it) for actions that exist for completeness but should not be invoked by an agent autonomously — for example, destructive operations, admin-only actions, or low-level helpers that are only useful as building blocks for other actions.

On a first-PR connector with `supportedFeatureIds: ['agentBuilder']`, an `isTool: false` action is not
reachable from any UI: agents cannot see it and workflows are not enabled yet. It can only be called
through the `_execute` API. Say so on the docs page rather than listing it alongside the agent actions,
as the GKE docs did for `createCluster` and `deleteCluster`.

### `scope` — classifying side effects for every `isTool: true` action

Every `isTool: true` action **must** include an explicit `scope` field. This is an advisory signal to the LLM and orchestration layer about what side effects the action may have — it does not enforce access control at runtime.

| Value | When to use |
|---|---|
| `'read'` | Action only reads data; no external state is modified. Pure lookups, searches, listings, downloads. |
| `'write'` | Action creates or appends new data but does not overwrite or delete existing state. Examples: send a message, create a resource, add a comment, post an event. |
| `'destroy'` | Action may overwrite, update, or delete existing data. Examples: resolve an issue, update a record, delete a resource, patch an entity, scale a workload. Also use for generic escape-hatch actions (`request`, `callTool`, `callRestApi`, `callGraphAPI`) since they can do anything. |

**Decision rule**: if the action only sends GET requests (or equivalent read-only API calls), use `'read'`. If it creates new, distinct records without touching existing ones, use `'write'`. If it can overwrite, update, or remove, use `'destroy'`. When uncertain, prefer `'destroy'` — it's safer to over-classify than under-classify.

**Classify on the HTTP method and the documented side effect, not on the action's name.** A vendor route
whose name reads like a read can still mutate: `listSyncFunctionTriggers` is a `POST` that
re-synchronizes an app's deployed trigger metadata, so it is `'destroy'`, not `'read'`. Go through every
action and ask what the request *does* to the service; a `list`/`get`/`sync` prefix on a `POST` or
`PATCH` is a signal to re-check, not a reason to trust the name.

A `create`/`post`/`set` prefix is not evidence of `'write'` either. A call that writes under a
caller-chosen key and replaces whatever is already stored there is an overwrite, so it is `'destroy'`.
Bitbucket's `createCommitBuildStatus` replaces the previous status with the same `key`, which can turn
a failing merge gate green; it shipped as `'write'` and had to be reclassified.

**When live testing disproves a vendor's documented behaviour, fix every place that encoded the old
assumption.** Correcting only the `description` leaves the `scope`, the test mock, the auth `helpText`,
the `skill` text, and the docs page still asserting something you now know is false. Grep the connector
directory and the docs page for the disproven claim and change all of them in one pass.

```typescript
// Read-only lookup
listIssues: {
  isTool: true,
  scope: 'read',
  description: '...',
  ...
},

// Creates a new record
createIssue: {
  isTool: true,
  scope: 'write',
  description: '...',
  ...
},

// Modifies existing state
resolveIssue: {
  isTool: true,
  scope: 'destroy',
  description: '...',
  ...
},
```

### Action descriptions

Every action should have a `description` that answers: "What does this do, and when should I call it?"

- **Use plain strings** — action descriptions are for LLM consumption only, not shown in the UI. Do NOT wrap them in `i18n.translate()`.
- State the operation in plain terms (what it fetches, creates, or sends).
- Mention what the response contains so the agent knows what it can do next.
- If there is an obvious ordering relationship with another action, note it here.
- **Download/binary actions**: If the action returns base64-encoded or binary data, include a WARNING in the description advising agents to only call it when they have a plan to process the data (e.g. via an Elasticsearch ingest pipeline attachment processor). Warn about potentially large payloads.

**ServiceNow examples:**
- `'Search incidents by keyword, status, or assignee. Returns incident numbers, short descriptions, and state.'`
- `'Retrieve the full details of a single incident by sys_id. Use the sys_id values returned by searchIncidents.'`

**Slack examples:**
- `'Send a message to a Slack channel or DM. Returns the message timestamp, which can be used to post a reply in a thread.'`
- `'Search Slack messages by keyword. Returns matching messages with channel, author, and timestamp.'`

### Parameter `.describe()`

Every Zod parameter should have a `.describe()` call that gives the agent the context it needs to fill in a correct value.

- Include the expected format or type when it is not obvious (`'ISO 8601 date string, e.g. 2024-01-15'`).
- State the unit for numeric fields (`'Maximum number of results to return (1–100, default 20)'`).
- For ID fields, say where the value comes from (`'The sys_id of the incident, returned by searchIncidents'`).
- For enum-like strings, list the accepted values inline (`'Filter by state: "new", "in_progress", or "resolved"'`).
- **Bound user-input strings** — add `.max()` to string fields that accept free-form user input (search queries, AI prompts, natural-language descriptions). Use the service's documented API limit if available; otherwise 2000 for queries and 10000 for AI prompts are safe defaults. Do not bound ID fields or pagination tokens — those have fixed service-side formats.
- **Bound `z.record()` key strings too** — `z.record(z.string(), z.unknown())` (used for flexible/dynamic
  objects like alert-rule conditions or config maps) has the same unbounded-input DoS risk as a bare
  `z.string()`. Apply the same `.max(200)`-style bound to the key type: `z.record(z.string().max(200), z.unknown())`.
  This also applies to string keys inside `z.array(z.record(...))`.
- **Bound the collection size too, not just the string lengths inside it** — a `z.array()` needs `.max(N)`
  on the array itself (e.g. `z.array(z.string().max(64)).max(50)` for a list of IDs), and a `z.record()`
  needs an entry-count cap via `.refine()` since Zod has no built-in one:
  `z.record(z.string().max(100), z.string().max(200)).refine((v) => Object.keys(v).length <= 50, { message: '...' })`.
  Bounding only the elements' string length still leaves an unbounded *number* of elements/entries as a DoS
  vector, and if the array is later joined into a query string, an oversized array also risks an oversized
  upstream request.
- **Bound a free-form JSON body by its serialized size** — a field typed `z.unknown()`/`z.any()` (a
  request body forwarded verbatim to the service) has no shape to constrain, but it still gets allocated
  and serialized on the Kibana server. Bound it in a `.refine()` that serializes the value, and reject a
  value that cannot be serialized at all (a cycle, a `BigInt`) there rather than letting it fail opaquely
  inside the HTTP client.
- **Measure a byte bound in bytes, not in `String.length`** — `JSON.stringify(value).length` counts
  UTF-16 code units, so a limit advertised as "1 MiB" lets roughly 1 M CJK characters through and sends
  roughly 3 MiB upstream. Use `Buffer.byteLength(serialized, 'utf8')` when the bound is stated in bytes,
  and add a non-ASCII boundary test — an ASCII-only test passes either way and proves nothing.
- **A path/route pattern must be checked in both directions** — a regex that constrains a value
  interpolated into a URL has two jobs: accept every legitimate value and reject every escape. Test both
  sets explicitly, because a pattern can fail at both at once. An allowlist like `[A-Za-z0-9._~/-]`
  rejects a legitimately percent-encoded segment (`api/users/alice%40example.com`) *and* accepts
  `//evil.com/x`, which a client reads as a protocol-relative URL to another host. Allow the RFC 3986
  `pchar` set minus `:` plus `%XX` triplets, exclude a leading `//`, and pin the accept and reject cases
  as table-driven tests. Dropping `:` is what stops `http://evil.com` parsing as a relative path.
- **Require "at least one of" for optional-only update inputs** — if an action updates a resource and
  every field is `.optional()`, an empty/no-op call is a silent bug. Add `.refine((v) => v.fieldA !== undefined || v.fieldB !== undefined, { message: '...' })`
  to the schema.
- **Regex-validate ID/GUID fields that flow into a query or filter string** — if a field's value gets
  interpolated into a search/filter expression (not just used as a URL path segment or opaque body value),
  constrain it to the expected character set (e.g. `.regex(/^[A-Za-z0-9+/=_-]+$/)` for a base64url GUID) so
  it can't be used to inject query syntax.
- **`encodeURIComponent()` every ID/slug used as a URL path segment** — this is a handler-side fix, not a
  schema constraint (a `.max()`-bound string is still a valid path segment value; it just needs escaping
  before interpolation). Any handler that builds a URL with `` `${baseUrl}/things/${input.id}/` `` must wrap
  the interpolated value: `` `${baseUrl}/things/${encodeURIComponent(input.id)}/` ``. Apply this to every
  id/slug in the URL, including a connector-config value like an org slug (encode it once at the point
  it's read from config, so every handler that uses it is safe automatically). Without this, a value
  containing `/`, `?`, `#`, or a space corrupts the request path instead of erroring — and it's easy to
  miss because unit tests that hardcode a plain alphanumeric ID in both the input and the expected URL
  never exercise the encoding path.

```typescript
export const SearchInputSchema = lazySchema(() =>
  z.object({
    query: z.string().max(1000).describe('Keyword or natural-language search query'),
    limit: z.number().optional().describe('Maximum results to return (1–100, default 20)'),
    state: z.string().max(50).optional().describe('Filter by state: "new", "in_progress", or "resolved"'),
  })
);

export const GetItemInputSchema = lazySchema(() =>
  z.object({
    id: z.string().max(255).describe('The item sys_id, returned by the search action'),
  })
);
```

### `skill` property

The top-level `skill` field is a markdown string with usage guidance that does not fit neatly inside a single action description. Use it for:

- **Multi-step patterns**: e.g., "search first, then fetch by ID".
- **Gotchas**: rate limits, pagination, fields that require a prior lookup.
- **Cross-action references**: when one action's output feeds another.

Use the `[...].join('\n')` pattern to keep each point on its own line and avoid a long string literal:

```typescript
skill: [
  'To find and read an incident: call `searchIncidents` first, then pass the `sys_id` from the result to `getIncident`.',
  'The `searchIncidents` action returns at most 20 results by default; use `limit` to request up to 100.',
  'To post a threaded reply in Slack, call `sendMessage` with the `thread_ts` value returned by a previous `sendMessage` call.',
].join('\n'),
```

**ServiceNow** (`src/platform/packages/shared/kbn-connector-specs/src/specs/servicenow/`) and **Slack** (`src/platform/packages/shared/kbn-connector-specs/src/specs/slack/`) are the reference connectors for these patterns.

**Trace every recipe to the code.** For each step in a `skill` pattern, name the action that performs
it and the output field it reads, and confirm both exist. The Bitbucket skill told agents to confirm
build statuses "via `getPullRequest`", whose output has no status fields, so an agent following the
merge recipe could not check the policy it was told to check.

**Check that every state an action can create has a way out.** If an action can put a resource into a
state (draft, stopped, paused, locked), either another action takes it out of that state, or the
`skill` text says the vendor UI is needed. The Bitbucket connector could create a draft pull request
but not mark it ready, and a draft cannot be merged.

## `metadata.description` Quality

The description is shown in the UI tile picker and surfaced to AI agents. Write it to accurately reflect capabilities.

**Rules:**
- **MUST use `i18n.translate()`** — this string is shown in the UI and must be internationalized
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
