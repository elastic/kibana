---
navigation_title: "MongoDB"
type: reference
description: "Use the MongoDB connector to query documents in MongoDB collections using find, aggregate, count, and listCollections."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# MongoDB connector [mongodb-action-type]

The MongoDB connector provides read-only access to MongoDB collections using the native MongoDB driver. Use it to query documents, run aggregation pipelines, and discover collection structure from workflows and AI agents. It supports any MongoDB deployment reachable via a connection string: Atlas clusters (`mongodb+srv://`), self-hosted replica sets, and standalone instances.

## Create connectors in {{kib}} [define-mongodb-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [mongodb-connector-configuration]

MongoDB connectors have the following configuration properties:

Database
:   The name of the MongoDB database to query, such as `my_database`. All actions operate against this database by default.

Connection string
:   The full MongoDB connection string including credentials. Use `mongodb+srv://` for Atlas clusters or `mongodb://` for self-hosted deployments. Example: `mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true`. The connection string is stored as an encrypted secret.

## Test connectors [mongodb-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by pinging the MongoDB deployment.

The MongoDB connector has the following actions:

List collections
:   List all collections in the configured database. Returns collection names and types. Use this first to discover what data is available before calling find, aggregate, or count.
    - `nameFilter` (optional): Substring to filter collection names (case-sensitive). Omit to return all collections.

Find
:   Query documents in a MongoDB collection. Supports filter, projection, sort, limit, and skip. Returns an array of matching documents. Maximum 1000 documents per call.
    - `collection` (required): Name of the collection to query. Use *List collections* first to discover available names.
    - `filter` (optional): MongoDB query filter (MQL). Omit or pass `{}` to return all documents. Examples: `{"status": "active"}`, `{"age": {"$gt": 30}}`.
    - `projection` (optional): Fields to include (`1`) or exclude (`0`). Example: `{"name": 1, "email": 1, "_id": 0}`. Omit to return all fields.
    - `sort` (optional): Sort order. `1` = ascending, `-1` = descending. Example: `{"createdAt": -1}` returns newest first.
    - `limit` (optional): Maximum number of documents to return (1–1000). Defaults to 100.
    - `skip` (optional): Number of documents to skip before returning results. Use with `limit` for pagination.

Aggregate
:   Run a MongoDB aggregation pipeline on a collection. Supports all read-only pipeline stages (`$match`, `$group`, `$sort`, `$project`, `$lookup`, `$unwind`, `$limit`, `$skip`, `$count`, and others). Write stages (`$out`, `$merge`) and code-execution stages (`$function`, `$accumulator`) are not allowed. A `$limit` stage is appended automatically unless the pipeline already ends with one.
    - `collection` (required): Name of the collection to aggregate.
    - `pipeline` (required): MongoDB aggregation pipeline — an ordered array of stage objects. Example: `[{"$match": {"status": "active"}}, {"$group": {"_id": "$region", "count": {"$sum": 1}}}]`.
    - `limit` (optional): Maximum number of documents to return (1–1000). Defaults to 100.

Count
:   Count documents in a MongoDB collection matching an optional filter. Returns the total document count. Useful for understanding data volume before running a find or aggregate.
    - `collection` (required): Name of the collection to count documents in.
    - `filter` (optional): MongoDB query filter. Omit or pass `{}` to count all documents. Example: `{"status": "active"}`.

::::{tip}
Follow the discovery pattern before querying: *List collections* → *Find* with a small limit to inspect document shape → *Count* to understand data volume → *Aggregate* to group or transform data.
::::

## Connector networking configuration [mongodb-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings.

## Get connection credentials [mongodb-api-credentials]

The MongoDB connector authenticates using a connection string that encodes all credentials.

For **Atlas clusters**:

1. In [MongoDB Atlas](https://cloud.mongodb.com/), navigate to your project and go to **Database → Connect**.
2. Choose **Drivers** and copy the connection string. It starts with `mongodb+srv://`.
3. Replace `<username>` and `<password>` with a database user's credentials.
4. In {{kib}}, create a MongoDB connector, enter the database name and connection string.

For **self-hosted deployments**, use a `mongodb://` connection string with the host, port, and credentials for your replica set or standalone instance.

::::{note}
The connection string is stored encrypted and never exposed in Kibana UI or logs. All four connector actions are read-only — no write, update, or delete operations are supported.
::::
