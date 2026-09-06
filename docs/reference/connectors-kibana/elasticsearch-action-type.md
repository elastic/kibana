---
navigation_title: "External Elasticsearch"
type: reference
description: "Use the External Elasticsearch connector to search and explore data on a remote cluster, retrieve mappings and aliases, and run ES|QL queries."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# External Elasticsearch connector [elasticsearch-action-type]

The External Elasticsearch connector calls the [Elasticsearch REST API](https://www.elastic.co/docs/api/doc/elasticsearch) on a remote cluster so a workflow or agent can search and explore data, inspect index mappings and aliases, run ES|QL analytics queries, and retrieve cluster information. Use this connector when you cannot connect via cross-cluster search (CCS) — for example, separate Cloud deployments, on-prem clusters behind a firewall, or multi-tenant Kibana. It supports both [Elastic Cloud](https://www.elastic.co/cloud) deployments and self-managed Elasticsearch clusters.

## Create connectors in {{kib}} [define-elasticsearch-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [elasticsearch-connector-configuration]

Elasticsearch connectors have the following configuration properties:

Elasticsearch URL
:   The cluster endpoint URL. For Elastic Cloud, use the Elasticsearch endpoint shown in your deployment in the Elastic Cloud console (for example, `https://my-deployment.es.us-east-1.aws.elastic.cloud`). For self-managed clusters, use the full URL including port, for example `https://elasticsearch.example.com:9200`.

### Authentication [elasticsearch-connector-authentication]

**Elasticsearch API key (recommended)**

API Key
:   The encoded API key value, in the form `ApiKey <encoded>` where `<encoded>` is the base64-encoded `id:api_key` string from the [create API key](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key) response (`POST /_security/api_key`). Grant the key at minimum: `read` privilege on the indices you search.

**Username and password**

Username
:   An Elasticsearch user with at minimum `read` privilege on the indices you search.

Password
:   The password for that user.

## Test connectors [elasticsearch-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test calls `GET /` to verify connectivity and return cluster name and version information.

## Connector actions [elasticsearch-connector-actions]

The Elasticsearch connector has the following actions:

`search`
:   Search documents in one or more indices using the [Elasticsearch Query DSL](https://www.elastic.co/docs/reference/query-languages/querydsl). Pass the full query body in the `query` parameter. Supports aggregations (`aggs`), sorting, field filtering (`_source`), and pagination (`size`, `from`). Use `listIndices` first if you do not know the index name, and `getMapping` to understand the available fields.

`esql`
:   Run an [ES|QL](https://www.elastic.co/docs/reference/query-languages/esql) query — a pipe-based analytics language optimized for time-series exploration and aggregations. Returns a columnar result set with column names and row values. Requires Elasticsearch 8.11 or later.

`listIndices`
:   List indices and data streams with their health, status, document count, and storage size. Optionally filter by name pattern (for example, `logs-*`). Use this to discover available indices before calling `search`, `getMapping`, or `esql`.

`getMapping`
:   Retrieve the field mapping for an index: field names, types, and configured analyzers or sub-fields. Use this to understand which fields are available before constructing a query.

`request`
:   Make an arbitrary `GET` request to any Elasticsearch REST API path. Use this as an escape hatch when no typed action covers the endpoint you need — for example, `GET /_cluster/health`, `GET /_alias`, or `GET /_nodes`. The base cluster URL is prepended automatically.

`getClusterInfo`
:   Get basic information about the cluster: name, version, and build. To check shard/node counts and cluster status, use the `request` action with path `/_cluster/health`.

## Get API credentials [elasticsearch-api-credentials]

**Elasticsearch API key**

1. Log in to Kibana and go to **{{stack-manage-app}} > API Keys**.
2. Click **Create API key**.
3. Give the key a name and, under **Control security privileges**, grant at minimum:
   - `read` indices privilege on the index patterns you intend to search.
4. Click **Create API key**, then copy the **Encoded** value.
5. Enter the Elasticsearch endpoint URL and the encoded key (prefixed with `ApiKey `, for example `ApiKey dGhpcyBpcyBhIHRlc3Q=`) when configuring the connector in {{kib}}.

Alternatively, create the key via the API:

```console
POST /_security/api_key
{
  "name": "kibana-elasticsearch-connector",
  "role_descriptors": {
    "connector-role": {
      "cluster": [],
      "indices": [
        {
          "names": ["logs-*", "metrics-*"],
          "privileges": ["read"]
        }
      ]
    }
  }
}
```

Use the `encoded` field from the response as the **API Key** value, prepended with `ApiKey `.

**Username and password (self-managed clusters)**

1. Create a dedicated Elasticsearch user (for example, using the [Create or update users API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user)).
2. Assign a role granting at minimum `read` on the indices you search.
3. Enter the cluster URL, username, and password when configuring the connector in {{kib}}.
