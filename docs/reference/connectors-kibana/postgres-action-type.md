---
navigation_title: "PostgreSQL"
type: reference
description: "Use the PostgreSQL connector to query tables, search rows, explore schemas, and run SQL against a PostgreSQL database from Agent Builder."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# PostgreSQL connector [postgres-action-type]

The PostgreSQL connector connects directly to a PostgreSQL database so you can search, query, and explore its schema from chat conversations.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

:::{include} _snippets/native-driver-memory-note.md
:::

## Requirements [postgres-requirements]

The PostgreSQL connector connects directly to PostgreSQL over its native protocol (default port 5432). Your PostgreSQL server must be network-accessible from your Kibana instance. TLS is required by default.

To use the PostgreSQL connector, you need:

- A PostgreSQL server accessible from your Kibana instance.
- A PostgreSQL role that can log in and has access to the schemas and tables you want to query.
- The server hostname, port, database name, and credentials.

A connector connects to a single database. To query more than one database, create one connector for each.

Statements that run longer than the {{kib}} connector response timeout (`xpack.actions.responseTimeout`) are canceled by the server. This limit applies to every action, including **Execute SQL**.

::::{note}
The connector doesn't work with an HTTP proxy configured through `xpack.actions.proxyUrl`, because the PostgreSQL protocol can't be tunneled through one. Add the database host to `xpack.actions.proxyBypassHosts` to connect directly.
::::

## Get connection details [postgres-api-credentials]

To configure the connector:

1. Identify the hostname or IP address of your PostgreSQL server.
2. Create a PostgreSQL role with the permissions your use case needs (see [Database role permissions](#postgres-security)).
3. Make sure the server's `pg_hba.conf` allows the role to connect from your Kibana host.
4. Note the server port (default: 5432) and the database name.

## Create connectors in {{kib}} [define-postgres-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [postgres-connector-configuration]

PostgreSQL connectors have the following configuration properties:

Host
:   The hostname or IP address of the PostgreSQL server (for example, `postgres.example.com`, `192.168.1.1`, `localhost`). Don't include a protocol prefix.

Port
:   The port number of the PostgreSQL server (default: 5432).

Database
:   The name of the database to query.

Username
:   The PostgreSQL role to authenticate as.

Password
:   The password for the PostgreSQL role.

TLS
:   Whether to encrypt the connection. **Required** (default) uses Kibana TLS settings. **Disabled** is only for servers that don't support TLS.

## Test connectors [postgres-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## PostgreSQL connector actions [postgres-connector-actions]

The PostgreSQL connector has the following actions:

Query
:   Run a read-only SQL query against the database. The query runs in a read-only transaction.
    - **sql** (required): The `SELECT` or `WITH` query to run. Include a `LIMIT` clause to bound the result size. Don't include a trailing semicolon.

List Schemas
:   List the schemas in the database that the role can access. System schemas are excluded.

List Tables
:   List the tables, views, materialized views, and foreign tables in a schema. Child partitions are omitted. The partitioned parent table is listed instead.
    - **schema** (optional): The schema name. Defaults to `public`.

Describe Table
:   Describe a table, view, or materialized view, including each column's name, data type, nullability, default value, primary-key membership, and comment.
    - **table** (required): The table name. Names are case-sensitive.
    - **schema** (optional): The schema name. Defaults to `public`.

Search Rows
:   Search rows in a table by matching a search term against specified columns. Matching is case-insensitive and partial, and non-text columns are compared as text.
    - **table** (required): The table to search.
    - **searchTerm** (required): The text to search for.
    - **columns** (required): Array of column names to search in. Use **Describe Table** to discover available columns.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).
    - **schema** (optional): The schema name. Defaults to `public`.

Execute SQL _(not yet available)_
:   Run any SQL statement against the database. Permitted statements include `INSERT`, `UPDATE`, `DELETE`, `DROP`, and data definition language (DDL), and the SQL can contain several statements. Use it only when a write or destructive operation is explicitly required. Not exposed to AI agents. Prefer **Query** for read-only access.
    - **sql** (required): The SQL statement to execute.

## Database role permissions [postgres-security]

The permissions you grant to the PostgreSQL role determine what the connector can do. Configure them to match your intended use case.

### Read-only chat use case (recommended) [postgres-read-only]

For chat conversations, where the goal is to query and explore data, use a dedicated role with only `SELECT` access. This is the recommended configuration and provides the strongest protection against unintended modifications.

```sql
-- Create a read-only role and grant SELECT on the target schema
CREATE ROLE kibana_reader LOGIN PASSWORD 'your-password';
GRANT CONNECT ON DATABASE my_database TO kibana_reader;
GRANT USAGE ON SCHEMA public TO kibana_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kibana_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO kibana_reader;
```

The **Query** and **Search Rows** actions are read-only at two levels. The connector accepts only `SELECT` and `WITH` statements and blocks multi-statement input, and it runs each statement in a read-only transaction that PostgreSQL rolls back, so the server rejects writes even if a statement gets past the first check. Use **List Tables** and **Describe Table** for schema discovery.

::::{note}
The application-level read-only check is not a security guarantee. Prompt injection and other techniques might craft inputs that bypass it, and a read-only transaction doesn't stop functions that have side effects outside the transaction. The only reliable protection is granting the database role read-only permissions. Application-level enforcement is a defense-in-depth measure, not a substitute for least-privilege credentials.
::::

The **Execute SQL** action bypasses these restrictions and can run any statement, so don't grant write privileges unless your use case requires them.

You can further restrict the role to connections from your Kibana host's IP address in `pg_hba.conf`.

### Broader access [postgres-broader-access]

If your use case requires write access or access across multiple schemas, grant the appropriate privileges to the PostgreSQL role. Scope permissions as narrowly as possible for your use case.

```sql
-- Example: grant read/write access to a specific schema
GRANT USAGE ON SCHEMA public TO kibana_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kibana_user;
```
