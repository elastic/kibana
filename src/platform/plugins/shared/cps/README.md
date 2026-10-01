# @kbn/cps

## Overview

This plugin implements the **Cross-Project Search (CPS)** logic for Kibana. CPS enables users to search data across multiple Elastic projects as if it were local, without needing to manually specify project names in queries.

Kibana acts as a **transparent orchestrator**. It does not execute cross-project searches itself but forwards requests with the appropriate `project_routing` context to Elasticsearch. Elasticsearch then handles the execution, security enforcement, and result aggregation.

## Client-Side (`public/`)

- **CPSManager**: The central service for managing CPS state in the browser.
  - **Project Routing**: Manages the `projectRouting$` observable (defaults to searching all projects) and allows applications to set/get the current routing.
  - **Project Fetching**: Fetches and caches project data using `ProjectFetcher`.
  - **UI Access Control**: Determines if the project picker should be editable, read-only, or disabled based on the current application and location (via `getProjectPickerAccess$`).


## Server-Side (`server/`)

- **API Routes**: Registers endpoints like `POST /internal/cps/projects_tags` to retrieve project tags from Elasticsearch (`/_project/tags`), delegating authorization to the scoped Elasticsearch client.
- **Configuration**: Exposes the `cpsEnabled` flag via its setup contract, which is used by other parts of the system (like Core's `ElasticsearchService`) to toggle CPS behaviors. `cpsEnabled` means "this deployment can do CPS" and is true on all serverless projects.
- **Start contract**: When `cpsEnabled` is true, `start()` returns:
  - `createNpreClient(request)` — a request-scoped client for named project routing expressions.
  - `getLinkedProjects(request)` — the linked projects visible to the request principal, or `undefined` when they could not be resolved (unauthorized or the call failed). `undefined` is distinct from `[]`: "unknown" must never be read as "none".
  - `isCpsActive(request)` — `true` when at least one linked project is visible to the principal, `false` when none are, and `undefined` when that could not be determined (most often a missing `read_project_routing` cluster privilege). `undefined` is not a synonym for `false`; see [Privileges](#privileges) for why, and for who decides what to do about it. Note that a plain truthiness check reads `undefined` as "do not fan out"; use `=== false` to fan out on unresolved. When `cpsEnabled` is false, `start()` returns `undefined` (capability off).

### API Routes

#### POST /internal/cps/projects_tags

Retrieves project tags from Elasticsearch using the `/_project/tags` endpoint.

**Route Details:**

- **Path:** `/internal/cps/projects_tags`
- **Body (optional):**
  - `project_routing` (optional): String parameter for project routing
- **Authorization:** Handled by the scoped Elasticsearch client
- **Response Format:**

```typescript
{
  [key: string]: Record<string, string>;
}
```

**Features:**
- Delegates authorization to the scoped Elasticsearch client
- Proxies requests to the Elasticsearch `/_project/tags` API
- Returns project tag mappings as key-value pairs
- Returns `403` when the user lacks the `read_project_routing` cluster privilege

#### GET /internal/cps/project_routing/{projectRoutingName}

Retrieves the value of a named project routing expression (NPRE) from Elasticsearch (`/_project_routing/{name}`). Used to resolve the default project routing for a space.

**Route Details:**

- **Path:** `/internal/cps/project_routing/{projectRoutingName}`
- **Authorization:** The lookup is performed as the Kibana internal user, so it succeeds regardless of the requesting user's cluster privileges. NPRE values are not considered sensitive.
- **Response:** The expression string, or `404` if no expression exists with that name (clients fall back to searching all projects).

## Privileges

Elasticsearch gates the CPS metadata APIs behind cluster privileges:

- `read_project_routing` — read access to `/_project/tags` and `/_project_routing`. **Custom roles must be granted this privilege for users to see the project picker and other CPS UI features.** Built-in roles include it; without it, `POST /internal/cps/projects_tags` returns `403` and CPS UI features hide themselves.
- `manage_project_routing` — additionally allows creating/updating NPREs (e.g. customizing a space's default project routing).

Users without `read_project_routing` can still run searches: the space default project routing is resolved via the Kibana internal user and applied to their queries, and Elasticsearch scopes cross-project results to the projects the user is authorized to access.

This is why `isCpsActive` reports those users as `undefined` rather than `false`: Kibana cannot tell whether they have linked projects, and "unknown" is not "none". Whether an unresolved scope should read origin-only or fan out and let Elasticsearch scope the result depends on what the consumer reads and how much it trusts the principal's index grants, so this plugin does not pick for everyone.

Defend and Osquery both currently read `undefined` as "do not fan out". Their reads target indices whose grants Kibana cannot inspect for custom roles, so fanning out would put exactly the principals whose grants are least visible on `asCurrentUser`. The cost is that a custom role without `read_project_routing` reads origin-only until the predefined roles carry the privilege.
