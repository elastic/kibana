# `@kbn/apm-shared`

A UI-only Kibana plugin that provides ready-to-use APM UI components with data-fetching dependencies pre-bound.

## Problem

APM UI components in `@kbn/apm-ui-shared` that fetch data require two dependencies that plugins must supply as props:

- `core: CoreStart` — for HTTP and other Kibana core services
- `callApmApi: APMClientV2` — a typed APM API client

Without a shared owner, every plugin that wants to render an APM component must independently set up the `callApmApi` lazy proxy, read the CPS feature flag, and wire everything together. This leads to duplicated boilerplate across plugins.

## Solution

`apmShared` centralises this setup. On `start()` it:

1. Reads the `observability.apm.cpsEnabled` feature flag
2. Creates a single lazy `callApmApi` proxy (with optional CPS manager integration)
3. Returns pre-bound wrappers around the data-fetching components — consumers only pass domain props

## Start contract

```typescript
interface ApmSharedPluginStart {
  /** Pre-configured APM API client — use this instead of creating your own. */
  callApmApi: APMClientV2;

  /** Renders the focused (single-span) trace waterfall. Fetches data internally. */
  FocusedTraceWaterfallWithFetching: ComponentType<FocusedTraceWaterfallProps>;

  /** Renders the full trace waterfall with data fetching. */
  TraceWaterfallWithFetching: ComponentType<FullTraceWaterfallProps>;

  /** Renders the pure (non-fetching) trace waterfall — bring your own data. */
  TraceWaterfall: ComponentType<TraceWaterfallProps>;
}
```

## Usage

### 1. Declare the dependency

```jsonc
// your-plugin/kibana.jsonc
{
  "plugin": {
    "requiredPlugins": ["apmShared"]
  }
}
```

### 2. Add the type to your start deps

```typescript
import type { ApmSharedPluginStart } from '@kbn/apm-shared/public';

interface MyPluginStartDeps {
  apmShared: ApmSharedPluginStart;
}
```

### 3. Use in components

```tsx
// Option A — pre-bound component (no core/callApmApi needed)
const { FocusedTraceWaterfallWithFetching } = pluginsStart.apmShared;

<FocusedTraceWaterfallWithFetching
  traceId={traceId}
  rangeFrom={rangeFrom}
  rangeTo={rangeTo}
  docId={docId}
/>

// Option B — direct API calls
const { callApmApi } = pluginsStart.apmShared;

const result = await callApmApi('GET /internal/apm/...', { signal, params: { ... } });
```

## Dependencies

| Dependency              | Role                                               |
| ----------------------- | -------------------------------------------------- |
| `@kbn/apm-api-shared`   | `createCallApmApiV2`, `APMClientV2` type           |
| `@kbn/apm-ui-shared`    | Source components being wrapped                    |
| `@kbn/apm-types`        | Prop types for the exposed components              |
| `cps` (optional plugin) | CPS manager for Content Preview System integration |

## Adding new components

To expose a new data-fetching component from `@kbn/apm-ui-shared`:

1. Add a `dynamic(() => import('@kbn/apm-ui-shared').then(...))` lazy loader in `plugin.tsx`
2. Create a wrapper that injects `core` and/or `callApmApi` as needed
3. Add the component type to `ApmSharedPluginStart` in `types.ts`
4. Re-export the prop type from `index.ts` if consumers need it
