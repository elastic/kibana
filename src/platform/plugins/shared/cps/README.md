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
