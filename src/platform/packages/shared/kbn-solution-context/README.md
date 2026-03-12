# @kbn/solution-context

Resolves which Kibana solution (observability, security, search, or classic) is active for the current user. Merges two data sources — the Cloud plugin's serverless project type and the Spaces plugin's solution view — into a single normalized `SolutionContext`.

## Why this exists

Kibana has two independent mechanisms for "which solution am I in":

- **Cloud plugin** — in serverless, `cloud.serverless.projectType` is the source of truth (`'observability'`, `'security'`, `'search'`). The Spaces `solution` field is forbidden and stripped from API responses in serverless.
- **Spaces plugin** — in non-serverless (ESS, self-managed), each space has a `solution` field (`'oblt'`, `'es'`, `'security'`, `'classic'`). These use abbreviated names that differ from the Cloud values.

This package normalizes both into a single `solution` value, with serverless project type taking precedence.

### Relationship to `chrome.getActiveSolutionNavId$()`

The Chrome service already provides `getActiveSolutionNavId$()` which merges serverless project type and space solution into a single observable. This package differs in several ways:

| | `chrome.getActiveSolutionNavId$()` | `@kbn/solution-context` |
|---|---|---|
| Values | Raw abbreviations: `'oblt'`, `'es'`, `null` | Normalized: `'observability'`, `'search'`, `'classic'` |
| Classic spaces | `null` | `'classic'` |
| Serverless metadata | Not exposed | `isServerless`, `serverlessProjectType` |
| Reactive | Observable | Hook (async with loading state) |
| Server-side | No (Chrome is browser-only) | Yes (`getSolutionContext` is pure) |

If all you need is "which solution nav is active" on the client, the Chrome API is sufficient. This package is for cases where you need normalized values, serverless metadata, or server-side access.

## Usage

### React hook (client-side)

```typescript
import { useSolutionContext } from '@kbn/solution-context';

const solutionContext = useSolutionContext(cloud, spaces);

// undefined while loading (non-serverless only)
if (!solutionContext) return <Loading />;

// solutionContext.solution is 'observability' | 'security' | 'search' | 'classic'
```

### Pure function (server or client)

```typescript
import { getSolutionContext } from '@kbn/solution-context';

const ctx = getSolutionContext(cloud, spaceSolution);
```

## Resolution logic

| Environment | Source of truth | `solution` value |
|---|---|---|
| Serverless | `cloud.serverless.projectType` | `'observability'`, `'security'`, `'search'`, `'workplaceai'` |
| Non-serverless, solution space | `activeSpace.solution` | Normalized: `'oblt'` → `'observability'`, `'es'` → `'search'`, `'security'`, `'classic'` |
| Non-serverless, classic space | `activeSpace.solution` | `'classic'` |

Serverless project type always takes precedence. In serverless, the Spaces plugin does not expose the `solution` field (it is stripped from API responses), so only the Cloud plugin is consulted.

## Exports

| Export | Type | Description |
|---|---|---|
| `getSolutionContext(cloud, spaceSolution?)` | function | Pure computation, no async. Usable server and client. |
| `useSolutionContext(cloud?, spaces?)` | React hook | Async space fetch, returns `undefined` while loading. |
| `normalizeSolutionView(solutionView?)` | function | Maps space abbreviations to full names. |
| `SolutionContext` | type | The resolved context object. |
| `Solution` | type | `KibanaSolution \| 'classic'` |

## Related

- Issue: https://github.com/elastic/kibana/issues/257418
