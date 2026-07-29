---
navigation_title: "Databricks"
type: reference
description: "Use the Databricks connector to execute SQL queries, manage jobs and clusters, control SQL warehouses, and monitor alerts in Databricks."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Databricks connector [databricks-action-type]

The Databricks connector connects to the Databricks managed SQL MCP server at `https://<workspace>/api/2.0/mcp/sql` and the Databricks REST API. Agents and workflows use the connector to execute SQL statements, manage jobs and clusters, control SQL warehouses, and monitor alerts. The connector also supports other Databricks MCP servers such as Genie and AI Search by changing the server URL.

## Create connectors in {{kib}} [define-databricks-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [databricks-connector-configuration]

Databricks connectors have the following configuration properties:

MCP server URL
:   The Databricks SQL MCP server URL for your workspace (for example, `https://<workspace>.azuredatabricks.net/api/2.0/mcp/sql`). Replace `<workspace>` with your workspace hostname. For other MCP server types (Genie, AI Search), change the path accordingly.

**Authentication**
:   Supports two authentication methods:

    - **OAuth Authorization Code** (recommended): Uses the Databricks workspace-level OIDC authorization code flow. Requires a Client ID, Client Secret, Authorization URL, and Token URL from a registered Databricks OAuth application. See [OAuth credentials](#databricks-oauth-credentials) for setup instructions.
    - **Personal access token (PAT)**: A Databricks personal access token for quick testing or automated access.

## Connector actions [databricks-connector-actions]

The Databricks connector exposes the following actions:

### SQL execution

`runQuery`
:   Execute a read-only SQL query against the Databricks SQL warehouse. Only `SELECT`, `SHOW`, `DESCRIBE`, `DESC`, `EXPLAIN`, and `WITH` statements are permitted — `INSERT`, `UPDATE`, `DELETE`, and DDL are blocked by the server (`execute_sql_read_only`). For long-running queries, returns a `statement_id` — use `pollResponse` to retrieve results.
    - `statement` (required): The read-only SQL query to execute (for example, `SELECT * FROM main.default.customers LIMIT 10` or `SHOW TABLES IN main.default`).

`executeStatement`
:   Execute a SQL statement on the Databricks SQL warehouse. Supports DML (`INSERT`, `UPDATE`, `DELETE`), DDL (`CREATE`, `ALTER`, `DROP`), `SHOW`, `DESCRIBE`, and other SQL dialects supported by Databricks SQL. Use this action only when write operations are needed — prefer `runQuery` for read-only statements. This action is available to workflows but is not exposed to AI agents. For long-running queries, returns a `statement_id` — use `pollResponse` to retrieve results.
    - `statement` (required): The SQL statement to execute (for example, `INSERT INTO main.default.users VALUES (1, 'Alice')`).

`pollResponse`
:   Poll the status and retrieve results for a previously submitted SQL query. Use this when `runQuery` or `executeStatement` returns a `statement_id` instead of immediate results. Returns the query status (`RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`) and, when complete, the result set. Poll repeatedly until the status is `SUCCEEDED` or `FAILED`.
    - `statementId` (required): The statement ID returned by `runQuery` or `executeStatement` (for example, `01ef1234-5678-abcd-efab-cdef01234567`).

### Jobs

`listRuns`
:   List job runs in the workspace. Returns run metadata including state, start time, and task results. Optionally filter by job ID or active-only runs.
    - `jobId` (optional): Filter to runs from a specific job.
    - `activeOnly` (optional): If `true`, return only active runs (`PENDING`, `RUNNING`, `TERMINATING`).
    - `limit` (optional): Maximum number of runs to return (default 25, max 100).
    - `pageToken` (optional): Cursor from a previous response for pagination.

`getRun`
:   Get full details for a specific job run, including state, tasks, start/end times, and error messages.
    - `runId` (required): The run ID to retrieve (for example, `455644833`).

`getRunOutput`
:   Retrieve the output of a completed task run (notebook output, return values, logs). Requires a task-level run ID from `getRun`'s `tasks[].run_id` — **not** the top-level `run_id` returned by `runJobNow` or `listRuns`. Call `getRun` first to find the task run IDs.
    - `runId` (required): A task-level run ID from `getRun`'s `tasks[].run_id`.

`runJobNow` _(workflow only)_
:   Trigger a Databricks job run immediately. Returns a `run_id` to track progress with `getRun`.
    - `jobId` (required): The job ID to trigger.
    - `jobParameters` (optional): Key-value pairs to override job parameters (for example, `{ "env": "prod" }`).

`cancelRun` _(workflow only)_
:   Cancel an active job run. The run must be in `PENDING` or `RUNNING` state. Cancellation is asynchronous — poll `getRun` until state is `CANCELLED`.
    - `runId` (required): The run ID to cancel.

`repairRun` _(workflow only)_
:   Re-run failed tasks in a completed job run without re-running tasks that succeeded. Returns a `repair_id`.
    - `runId` (required): The run ID to repair.
    - `rerunTasks` (optional): Task keys to re-run. Omit to re-run all failed tasks.
    - `rerunAllFailedTasks` (optional): If `true`, re-run all failed tasks.
    - `latestRepairId` (optional): ID of the most recent repair when chaining multiple repairs.

### Clusters

`listClusters`
:   List all clusters in the workspace. Returns cluster metadata including `cluster_id`, `cluster_name`, `state` (`RUNNING`, `TERMINATED`, `PENDING`), `spark_version`, and node type.

`startCluster` _(workflow only)_
:   Start a terminated cluster. Startup is asynchronous — poll `listClusters` until state is `RUNNING`.
    - `clusterId` (required): The cluster ID (for example, `0923-164208-meows279`).

`restartCluster` _(workflow only)_
:   Restart a running cluster. Restart is asynchronous — poll `listClusters` until state returns to `RUNNING`.
    - `clusterId` (required): The cluster ID.

### SQL warehouses

`listWarehouses`
:   List all SQL warehouses in the workspace. Returns warehouse metadata including `id`, `name`, `state` (`RUNNING`, `STOPPED`, `STARTING`), `cluster_size`, and `auto_stop_mins`.

`startWarehouse` _(workflow only)_
:   Start a stopped SQL warehouse. Startup is asynchronous — poll `listWarehouses` until state is `RUNNING`.
    - `warehouseId` (required): The SQL warehouse ID.

`stopWarehouse` _(workflow only)_
:   Stop a running SQL warehouse to save costs. Stop is asynchronous — poll `listWarehouses` until state is `STOPPED`.
    - `warehouseId` (required): The SQL warehouse ID.

### Alerts

`listAlerts`
:   List all SQL alerts in the workspace. Returns alert metadata including `id`, `name`, `state` (`OK`, `TRIGGERED`, `UNKNOWN`), and `query_id`.

`getAlert`
:   Get full details for a specific SQL alert, including the associated query, condition, notification schedule, and current state.
    - `alertId` (required): The alert ID.

### Utilities

`listTools`
:   List all tools available on the connected Databricks MCP server. Use this to discover server capabilities and verify exact tool names before using `callTool`. Different Databricks MCP servers expose different tools — the SQL server provides `execute_sql`, `execute_sql_read_only`, and `poll_sql_result`, while the Genie server provides `query_space` and `poll_response`.

`callTool`
:   Call any tool on the Databricks MCP server directly by name. Use this as an escape hatch for tools not yet exposed as named actions, or for tools on non-SQL Databricks MCP servers such as Genie (`query_space`) or AI Search. Use `listTools` first to discover available tool names and their arguments.
    - `name` (required): Name of the Databricks MCP tool to call (for example, `execute_sql`).
    - `arguments` (optional): Arguments to pass to the tool as a key-value map.

::::{tip}
To discover available tables before querying, use SQL statements such as:
- `SHOW CATALOGS` — list all Unity Catalog catalogs
- `SHOW SCHEMAS IN <catalog>` — list schemas within a catalog
- `SHOW TABLES IN <catalog>.<schema>` — list tables in a schema
- `DESCRIBE TABLE <catalog>.<schema>.<table>` — show column definitions for a table

Always qualify table names with `catalog.schema.table` (for example, `main.default.customers`) to avoid ambiguity. Use `LIMIT` to control result size for large tables.
::::

## Async polling pattern [databricks-async-polling]

For long-running queries, `runQuery` or `executeStatement` returns a `statement_id` instead of immediate results:

1. Call `runQuery` (for read-only SQL) or `executeStatement` (for DML/DDL) with your SQL statement.
2. If the response contains a `statement_id`, the query is still running.
3. Call `pollResponse` with the `statement_id` until the status is `SUCCEEDED` or `FAILED`.
4. Once `SUCCEEDED`, the response contains the full result set.

## Connector networking configuration [databricks-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [databricks-api-credentials]

The Databricks connector supports two authentication methods: **OAuth Authorization Code** (recommended) and **Personal Access Token (PAT)**.

### OAuth Authorization Code (recommended) [databricks-oauth-credentials]

Use this method to authorize the connector using the Databricks workspace OIDC authorization code flow.

1. Log in to your Databricks workspace and go to **Settings > Developer > App connections** (or the equivalent for your workspace type).
2. Register a new OAuth application and set the redirect URI to `https://<your-kibana-host>/api/actions/connector/_oauth_callback`.
3. Note the **Client ID** and **Client Secret** for use in {{kib}}.
4. In {{kib}}, create a Databricks connector and select **OAuth Authorization Code** as the authentication method. Enter:
   - **Authorization URL**: `https://<workspace>.azuredatabricks.net/oidc/v1/authorize`
   - **Token URL**: `https://<workspace>.azuredatabricks.net/oidc/v1/token`
   - **Client ID** and **Client Secret** from step 3.
5. Authorize with your Databricks account to complete the OAuth flow.

Refer to the [Databricks OAuth user-to-machine (U2M) documentation](https://docs.databricks.com/aws/en/dev-tools/auth/oauth-u2m) for detailed setup instructions.

### Personal Access Token (PAT)

Use this method for quick testing or automated access.

1. In your Databricks workspace, go to **User Settings > Developer > Access tokens**.
2. Select **Generate new token**, enter a description and optional lifetime, then select **Generate**.
3. Copy the token and store it securely.
4. In {{kib}}, create a Databricks connector and select **Personal access token (PAT)** as the authentication method. Enter the token in the **Databricks access token** field.

::::{note}
The SQL warehouse must be running to accept queries. Start it in the Databricks workspace UI under **SQL Warehouses** if queries return connection errors.
::::
