---
navigation_title: "BigQuery"
type: reference
description: "Use the BigQuery connector to run GoogleSQL queries and retrieve results from Google BigQuery."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# BigQuery connector [bigquery-action-type]

The BigQuery connector wraps the [BigQuery REST API](https://cloud.google.com/bigquery/docs/reference/rest) to run GoogleSQL queries, retrieve query results, and list datasets. Use it to query data in BigQuery from workflows and AI agents. Workflow authors can also run write or DDL statements through a separate action that is not exposed to AI agents.

## Create connectors in {{kib}} [define-bigquery-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [bigquery-connector-configuration]

BigQuery connectors have the following configuration properties:

Project ID
:   The default Google Cloud project ID for BigQuery jobs, such as `elastic-edm-prod`.

Default location
:   (Optional) The default BigQuery processing location, such as `US`, `EU`, `us-central1`, or `europe-west1`. Defaults to `US`. Can be overridden per request.

Maximum bytes billed
:   (Optional) Maximum bytes billed for each query, as an integer string. BigQuery rejects queries that exceed this limit.

## Test connectors [bigquery-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies BigQuery API access by running a lightweight `SELECT 1` query in the configured project.

The BigQuery connector has the following actions:

Run query
:   Run a read-only GoogleSQL query. Accepts `SELECT`, `WITH` (CTE), and `EXPLAIN` statements only. Write operations, DDL, scripts, stored procedures, and semicolon-delimited multi-statement submissions are rejected before the request is sent. Returns normalized rows as objects plus the BigQuery job reference and pagination token when more rows are available.
    - `query` (required): Read-only GoogleSQL query. Use fully-qualified table names such as `project.dataset.table`.
    - `location` (optional): BigQuery processing location. If omitted, uses the connector default location.
    - `maxResults` (optional): Maximum number of rows to return in the first response (1-10000). Defaults to 1000.
    - `timeoutMs` (optional): How long BigQuery should wait for query completion before returning a job reference, in milliseconds (0-300000).
    - `useQueryCache` (optional): Whether BigQuery can use cached query results.

Execute query
:   Run any GoogleSQL query. This action is available to workflow authors and direct API callers only. It is not exposed to AI agents. Use it for deliberate write, DDL, script, stored procedure, dry run, or multi-statement requests.
    - `query` (required): GoogleSQL query to run.
    - `location`, `maxResults`, `timeoutMs`, `useQueryCache` (optional): Same semantics as *Run query*.
    - `dryRun` (optional): If `true`, BigQuery validates the query and returns estimated bytes processed without running it.

Get query results
:   Poll or page through results for a BigQuery job returned by *Run query* or *Execute query*.
    - `jobId` (required): BigQuery job ID returned from a previous query action.
    - `projectId` (optional): Project ID that owns the BigQuery job. If omitted, uses the connector project ID.
    - `location` (optional): BigQuery job location. Use the location returned in `jobReference` when present.
    - `maxResults` (optional): Maximum number of result rows to return (1-10000).
    - `pageToken` (optional): Pagination token returned by a previous BigQuery response.
    - `timeoutMs` (optional): How long BigQuery should wait for query results before returning job status.

List datasets
:   List BigQuery datasets visible to the configured service account in a project.
    - `projectId` (optional): Project ID whose datasets to list. If omitted, uses the connector project ID.
    - `maxResults` (optional): Maximum number of datasets to return (1-1000).
    - `pageToken` (optional): Pagination token returned by a previous list datasets response.

:::::{tip}
Use *Run query* to submit read-only SQL, then poll with *Get query results* using the returned `jobReference.jobId`, `jobReference.location`, and `pageToken` when present. Prefer explicit date ranges, partition filters, and `LIMIT` clauses to control cost and result size.
:::::

## Security model [bigquery-action-security-model]

The connector splits SQL execution across two actions with different exposure:

- *Run query* is available to AI agents and is restricted to read-only statements (`SELECT`, `WITH`, and `EXPLAIN`). The restriction is enforced before the request is sent, so write, DDL, script, stored procedure, and multi-statement submissions never reach BigQuery.
- *Execute query* is available only to workflow authors and direct API callers. AI agents cannot invoke it. Use it when you deliberately want a workflow to write data, modify schema, dry run a statement, or run a script.

For defense in depth, grant the connector service account only the BigQuery permissions the intended use case requires. A read-only service account paired with *Run query* keeps agents within query-only access even if workflow authors can use *Execute query* for separate automation.

## Connector networking configuration [bigquery-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [bigquery-api-credentials]

The BigQuery connector uses a Google Cloud service account JSON key.

1. In the [Google Cloud console](https://console.cloud.google.com/), select or create the project that contains the BigQuery data.
2. Enable the **BigQuery API** if it is not already enabled.
3. Create a service account for {{kib}}.
4. Grant the service account the minimum required BigQuery roles for the datasets you want to query. For read-only use cases, grant dataset-level read permissions instead of project-wide administrative roles.
5. Create and download a JSON key for the service account.
6. In {{kib}}, create a BigQuery connector and upload the service account JSON key.
