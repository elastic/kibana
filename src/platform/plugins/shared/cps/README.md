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
- **Configuration**: Exposes the `cpsEnabled` flag via its setup contract, which is used by other parts of the system (like Core's `ElasticsearchService`) to toggle CPS behaviors.

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
