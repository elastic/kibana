---
navigation_title: "MongoDB"
type: reference
description: "Use the MongoDB connector to query and write to MongoDB collections using find, aggregate, count, listCollections, insertOne, updateOne, and deleteOne."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# MongoDB connector [mongodb-action-type]

The MongoDB connector provides access to MongoDB collections using the native MongoDB driver. Use it to query documents, run aggregation pipelines, discover collection structure, and insert, update, or delete documents from workflows. AI agents can only use the read-only actions (find, aggregate, count, listCollections) — write actions (insertOne, updateOne, deleteOne) are workflow-only and never exposed to agents. It supports any MongoDB deployment reachable through a connection URI: Atlas clusters (`mongodb+srv://`), self-hosted replica sets, and standalone instances.

## Create connectors in {{kib}} [define-mongodb-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [mongodb-connector-configuration]

MongoDB connectors have the following configuration properties:

Connection URI
:   The MongoDB connection URI, without credentials. Supports `mongodb://` and `mongodb+srv://` schemes. Include the database name in the path (for example, `mongodb://hostname:27017/mydb`) to use it as the default for actions that omit a `database` input. Credentials are authenticated against the `admin` database by default; append `?authSource=<db>` to the URI to override.

Username
:   The username for MongoDB Basic authentication.

Password
:   The password for MongoDB Basic authentication.

## Test connectors [mongodb-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by pinging the MongoDB deployment.

The MongoDB connector has the following actions:

List collections
:   List all collections in a database. Returns collection names and types. Use this first to discover what data is available before calling find, aggregate, or count.
    - `database` (optional): Database to list collections from. Defaults to the database in the connection URI path if omitted.
    - `nameFilter` (optional): Substring to filter collection names (case-sensitive). Omit to return all collections.

Find
:   Query documents in a MongoDB collection. Supports filter, projection, sort, limit, and skip. Returns an array of matching documents. Maximum 1000 documents per call. Code-execution operators (`$where`, `$expr` containing `$function`/`$accumulator`) are rejected in both the filter and the projection.
    - `collection` (required): Name of the collection to query. Use *List collections* first to discover available names.
    - `database` (optional): Database to query. Defaults to the database in the connection URI path if omitted.
    - `filter` (optional): MongoDB query filter (MQL). Omit or pass `{}` to return all documents. Examples: `{"status": "active"}`, `{"age": {"$gt": 30}}`.
    - `projection` (optional): Fields to include (`1`) or exclude (`0`). Example: `{"name": 1, "email": 1, "_id": 0}`. Omit to return all fields.
    - `sort` (optional): Sort order. `1` = ascending, `-1` = descending. Example: `{"createdAt": -1}` returns newest first.
    - `limit` (optional): Maximum number of documents to return (1–1000). Defaults to 100.
    - `skip` (optional): Number of documents to skip before returning results. Use with `limit` for pagination.

Aggregate
:   Run a MongoDB aggregation pipeline on a collection. Supports all read-only pipeline stages (`$match`, `$group`, `$sort`, `$project`, `$lookup`, `$unwind`, `$limit`, `$skip`, `$count`, and others). Write stages (`$out`, `$merge`) and code-execution operators (`$where`, `$function`, `$accumulator`) are rejected anywhere in the pipeline, including nested inside stage expressions (for example, `$project` or `$group`) and sub-pipelines (`$facet`, `$lookup`, `$unionWith`). A `$limit` stage is appended automatically unless the pipeline already ends with one.
    - `collection` (required): Name of the collection to aggregate.
    - `database` (optional): Database to query. Defaults to the database in the connection URI path if omitted.
    - `pipeline` (required): MongoDB aggregation pipeline — an ordered array of stage objects. Example: `[{"$match": {"status": "active"}}, {"$group": {"_id": "$region", "count": {"$sum": 1}}}]`.
    - `limit` (optional): Maximum number of documents to return (1–1000). Defaults to 100.

Count
:   Count documents in a MongoDB collection matching an optional filter. Returns the total document count. Use this to understand data volume before running a find or aggregate. Code-execution operators (`$where`, `$expr` containing `$function`/`$accumulator`) are rejected in the filter.
    - `collection` (required): Name of the collection to count documents in.
    - `database` (optional): Database to query. Defaults to the database in the connection URI path if omitted.
    - `filter` (optional): MongoDB query filter. Omit or pass `{}` to count all documents. Example: `{"status": "active"}`.

::::{tip}
Follow the discovery pattern before querying: *List collections* → *Find* with a small limit to inspect document shape → *Count* to understand data volume → *Aggregate* to group or transform data.
::::

The following actions are workflow-only — they are never exposed to AI agents:

Insert one
:   Insert a single document into a MongoDB collection. Use this to create a new record from a workflow, such as logging an event or saving a processed result. Returns the inserted document ID and whether the write was acknowledged.
    - `collection` (required): Name of the collection to insert into.
    - `database` (optional): Database to write to. Defaults to the database in the connection URI path if omitted.
    - `document` (required): Document to insert. Don't include `_id` unless you want to set it explicitly. Example: `{"name": "Alice", "status": "active"}`.

Update one
:   Update the first document matching a filter in a MongoDB collection. Use this to modify an existing record from a workflow, such as changing a status field or applying a partial update. Returns matched and modified counts, the upserted document ID (if any), and whether the write was acknowledged.
    - `collection` (required): Name of the collection to update.
    - `database` (optional): Database to write to. Defaults to the database in the connection URI path if omitted.
    - `filter` (required): Filter to match the document to update. Example: `{"_id": "abc"}`.
    - `update` (required): Update operators or replacement document. Example: `{"$set": {"status": "inactive"}}`.
    - `upsert` (optional): If `true`, insert a new document when no document matches the filter.

Delete one
:   Delete the first document matching a filter from a MongoDB collection. Use this to remove a single record from a workflow, such as cleaning up a processed item. Returns the number of documents deleted and whether the write was acknowledged.
    - `collection` (required): Name of the collection to delete from.
    - `database` (optional): Database to write to. Defaults to the database in the connection URI path if omitted.
    - `filter` (required): Filter to match the document to delete. Example: `{"_id": "abc"}`.

## Connector networking configuration [mongodb-connector-networking-configuration]

The MongoDB connector talks to MongoDB over its native wire protocol, not HTTP, so the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) that apply to HTTP-based connectors (such as `xpack.actions.allowedHosts`) do **not** apply here.

::::{warning}
**Known limitation:** this connector does not currently enforce a host allowlist on the configured connection URI. Any host reachable from the {{kib}} server can be targeted, regardless of `xpack.actions.allowedHosts` or other network-restriction settings. Restrict who can create or edit MongoDB connectors accordingly. This is a temporary gap for this technical preview connector and will be closed in a future release.
::::

## Get connection credentials [mongodb-api-credentials]

The MongoDB connector authenticates with a separate connection URI (host, port, and optional database path — no credentials) plus a username and password.

For **Atlas clusters**:

1. In [MongoDB Atlas](https://cloud.mongodb.com/), go to your project's **Database → Connect** page.
2. Select **Drivers** and copy the connection string. It starts with `mongodb+srv://`.
3. Remove `<username>:<password>@` from the string — credentials go in the separate Username and Password fields, not the URI.
4. In {{kib}}, create a MongoDB connector, and enter the connection URI, username, and password of a database user with the access your workflows and agents need.

For **self-hosted deployments**, use a `mongodb://` connection URI with the host and port (and optionally the database path) for your replica set or standalone instance, and provide credentials through the Username and Password fields.

::::{note}
The username and password are stored as encrypted secrets and never exposed in Kibana UI or logs. Agent-facing tool actions (find, aggregate, count, listCollections) are read-only; insertOne, updateOne, and deleteOne are workflow-only and are never exposed to agents.
::::
