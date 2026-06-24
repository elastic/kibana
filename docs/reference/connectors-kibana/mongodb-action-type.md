---
navigation_title: "MongoDB"
type: reference
description: "Use the MongoDB connector to query collections, run aggregation pipelines, and manage documents in MongoDB."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# MongoDB connector [mongodb-action-type]

The MongoDB connector uses the native MongoDB wire protocol to query collections, run aggregation pipelines, list collections, and write documents. Use it to read and analyse data in MongoDB from workflows and AI agents. Workflow authors can also insert, update, and delete documents through separate actions that are not exposed to AI agents.

## Create connectors in {{kib}} [define-mongodb-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [mongodb-connector-configuration]

MongoDB connectors have the following configuration properties:

Connection URI
:   Full MongoDB connection string, such as `mongodb://hostname:27017/mydb` or `mongodb+srv://cluster.example.com/mydb`. Include the database name in the URI path (for example `/mydb`) to use it as the default database for actions that do not specify one. TLS, authentication source, replica set, and other connection options can be appended as query parameters.

### Authentication

MongoDB connectors authenticate with a username and password (HTTP Basic). The credentials are stored as secrets and passed to MongoDB over the native wire protocol.

## Test connectors [mongodb-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by sending a `ping` command to the `admin` database and confirming a successful response.

The MongoDB connector has the following actions:

Find
:   Query a MongoDB collection and return matching documents. Available to AI agents and workflow authors.
    - `collection` (required): Name of the MongoDB collection to query.
    - `database` (optional): Database name. If omitted, uses the connector default database.
    - `filter` (optional): MongoDB query filter document, such as `{ "status": "active", "age": { "$gt": 18 } }`. Omit to return all documents.
    - `projection` (optional): Fields to include (`1`) or exclude (`0`), such as `{ "name": 1, "_id": 0 }`. Cannot mix inclusion and exclusion except for `_id`.
    - `sort` (optional): Sort specification, such as `{ "createdAt": -1 }` for descending. `1` = ascending, `-1` = descending.
    - `limit` (optional): Maximum number of documents to return (1–1000, default 100).

Aggregate
:   Run a MongoDB aggregation pipeline on a collection. Available to AI agents and workflow authors.
    - `collection` (required): Name of the MongoDB collection.
    - `database` (optional): Database name. If omitted, uses the connector default database.
    - `pipeline` (required): Aggregation pipeline as an array of stage objects, such as `[{ "$match": { "status": "active" } }, { "$group": { "_id": "$category", "total": { "$sum": 1 } } }]`. Must contain at least one stage.
    - `limit` (optional): Cap on documents returned after the pipeline completes (1–1000). Prefer adding a `$limit` stage to the pipeline instead.

List collections
:   List the collections in a MongoDB database. Useful for schema discovery before writing a query. Available to AI agents and workflow authors.
    - `database` (optional): Database name. If omitted, uses the connector default database.

Insert one
:   Insert a single document into a MongoDB collection. This action is available to workflow authors and direct API callers only — it is not exposed to AI agents.
    - `collection` (required): Name of the MongoDB collection.
    - `database` (optional): Database name. If omitted, uses the connector default database.
    - `document` (required): Document to insert. Do not include `_id` unless you want to set it explicitly. MongoDB generates an `ObjectId` for `_id` when it is omitted.

Update one
:   Update a single document in a MongoDB collection. This action is available to workflow authors and direct API callers only — it is not exposed to AI agents.
    - `collection` (required): Name of the MongoDB collection.
    - `database` (optional): Database name. If omitted, uses the connector default database.
    - `filter` (required): Filter to match the document to update, such as `{ "_id": "abc" }`.
    - `update` (required): Update operators or replacement document, such as `{ "$set": { "status": "inactive" } }`.
    - `upsert` (optional): If `true`, insert a new document when no document matches the filter. Defaults to `false`.

Delete one
:   Delete a single document from a MongoDB collection. This action is available to workflow authors and direct API callers only — it is not exposed to AI agents.
    - `collection` (required): Name of the MongoDB collection.
    - `database` (optional): Database name. If omitted, uses the connector default database.
    - `filter` (required): Filter to match the document to delete, such as `{ "_id": "abc" }`.

:::::{tip}
Use *List collections* to discover what collections exist in a database before writing a query. Then use *Find* for document lookup by filter, or *Aggregate* to group, count, or transform data across documents. Prefer adding a `$limit` stage directly in the aggregation pipeline when you want to cap results — this is more efficient than the `limit` parameter, which applies after the full pipeline runs.
:::::

## Security model [mongodb-action-security-model]

The connector splits write operations from read operations across two groups with different exposure:

- *Find*, *Aggregate*, and *List collections* are available to AI agents and workflow authors. These actions do not modify data.
- *Insert one*, *Update one*, and *Delete one* are available only to workflow authors and direct API callers. AI agents cannot invoke them. Use these actions when you deliberately want a workflow to modify documents.

For defense in depth, create a dedicated MongoDB user for the connector with only the privileges required for the intended use case. A read-only user paired with the agent-facing read actions keeps agents within query-only access even if workflow authors have write-capable credentials.

## Connector networking configuration [mongodb-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

The MongoDB connector uses the native MongoDB wire protocol (default port 27017). The target host must be reachable from the {{kib}} server and added to the Kibana `xpack.actions.allowedHosts` setting.

## Get credentials [mongodb-credentials]

The MongoDB connector authenticates using a username and password.

1. In your MongoDB deployment, create a dedicated user for {{kib}} with the minimum privileges required for your use case. For read-only access, grant the `read` role on the target databases. For write access from workflows, also grant `readWrite`.
2. Note the username and password.
3. In {{kib}}, create a MongoDB connector. Enter the connection URI (including the database name in the path if you want a default) and the credentials from step 1.

::::{note}
The MongoDB connector connects directly over the native wire protocol. Ensure the MongoDB server is accessible from the {{kib}} host and that any firewall rules allow connections on the configured port.
::::
