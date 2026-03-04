# @kbn/core-elasticsearch-server-internal

This package contains the internal types and implementation for Core's server-side elasticsearch service.

## ElasticsearchService

The `ElasticsearchService` is one of the Core services (instantiated in `@src/core/packages/root/server-internal/src/server.ts`) that provides connectivity to Elasticsearch for Kibana.

### Purpose
It manages the lifecycle of Elasticsearch clients, ensures the connection is healthy and compatible, and exposes APIs for plugins to interact with Elasticsearch.

### Key Features
- **Client Management**: Creates and manages `ClusterClient` instances (e.g., `data` client), providing both internal-user and request-scoped access.
- **Connection Health**: Periodically polls Elasticsearch nodes to verify version compatibility (`esNodesCompatibility$`) and calculates the overall service status (`status$`).
- **Preboot & Setup**:
  - Loads configuration (`elasticsearch.hosts`, `username`/`password` or `serviceAccountToken`, etc.).
  - Initializes the `AgentManager` for HTTP agent reuse.
  - Registers analytics context providers.
- **Startup Checks**:
  - Validates the connection to Elasticsearch.
  - Verifies that inline scripting is enabled on the cluster.
  - Fetches and exposes cluster capabilities.
- **Cross-Project Search (CPS) Handling**:
  - Configures the `CpsRequestHandler` based on the `cps.cpsEnabled` configuration flag (read from `coreContext.configService`).
  - **Behavior based on `cpsEnabled`**:
    - **Enabled (`true`)**: The `CpsRequestHandler` injects `project_routing: '_alias:_origin'` into requests if `project_routing` is missing (unless it's a PIT request, where it is stripped).
    - **Disabled (`false`)**: The `CpsRequestHandler` strictly strips any `project_routing` parameter from request bodies to prevent unintended cross-project queries.
