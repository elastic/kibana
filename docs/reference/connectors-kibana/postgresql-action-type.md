---
navigation_title: "PostgreSQL"
type: reference
description: "Use the PostgreSQL connector to query tables, search rows, explore schema, and run SQL against a PostgreSQL database."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# PostgreSQL connector [postgresql-action-type]

Use the PostgreSQL connector to query tables, search rows, and explore schema in a PostgreSQL database from chat conversations. The connector also provides an **Execute SQL** action for statements that change data.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(API only)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

:::{include} _snippets/native-driver-memory-note.md
:::

## Requirements [postgresql-requirements]

The connector connects to PostgreSQL over the native PostgreSQL protocol, on port 5432 by default. Your {{kib}} instance must be able to reach your database server, and any firewall or security group must allow the outbound IP address of your {{kib}} instance.

To use the connector, you need:

- A PostgreSQL database
- A database role that can log in and access the database you want to query
- The server hostname, the database name, and the role's credentials

## Create connectors in {{kib}} [define-postgresql-ui]

You can create connectors in **{{stack-manage-app}}** → **{{connectors-ui}}**.

### Database user permissions [postgresql-security]

The permissions you grant to the database role determine what the connector can do. Configure them to match your use case.

#### Read-only access (recommended)

For chat conversations, use a dedicated role with read access only:

```sql
CREATE ROLE kibana_reader LOGIN PASSWORD '<password>';
GRANT CONNECT ON DATABASE mydb TO kibana_reader;
GRANT USAGE ON SCHEMA public TO kibana_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kibana_reader;
-- Optional: also cover tables created later
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO kibana_reader;
```

The read actions run inside a read-only transaction, so PostgreSQL itself refuses statements that change data. The transaction doesn't stop functions with side effects outside the transaction. For example, `pg_sleep` and advisory locks can tie up connections until the statement times out, `pg_terminate_backend` can end other sessions, and `dblink_exec` can run writes over a separate connection. Don't use a superuser role or a member of `pg_signal_backend`, and don't install the `dblink` extension in the database unless you need it. The **Query** action also accepts only `SELECT` and `WITH` statements and rejects multiple statements and common write forms before they reach the server. **List Tables** and **Get Schema** only show objects that the role has `SELECT` on.

::::{warning}
These checks are not a security guarantee. Prompt injection and similar techniques can try to work around them, and a function that the role is allowed to call can have side effects of its own. The only reliable protection is granting the database role read-only permissions. Treat the checks as defense in depth, not a substitute for least-privilege credentials.
::::

The **Execute SQL** action bypasses these restrictions and can run any statement the role is allowed to run. Do not grant write permissions unless your use case requires them.

#### Broader access

If your use case requires write access, grant the appropriate permissions and scope them as narrowly as possible:

```sql
-- Example: allow reads and writes on one schema only
GRANT USAGE ON SCHEMA sales TO kibana_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sales TO kibana_user;
```

### Connector configuration [postgresql-connector-configuration]

PostgreSQL connectors have the following configuration properties:

Host
:   The hostname or IP address of the PostgreSQL server. Do not include a protocol prefix, and do not use a file path (Unix sockets are not supported).

Port
:   The port number of the server (default: 5432).

Database
:   The name of the database to query. PostgreSQL cannot switch databases within a connection, so create one connector for each database.

TLS
:   Whether to encrypt the connection (default: **Required**). Refer to [TLS](#postgresql-tls).

Username
:   The database role to authenticate as.

Password
:   The password for the role.

### Networking configuration [postgresql-networking]

#### TLS [postgresql-tls]

TLS is **required** by default, and the server certificate is verified according to your {{kib}} `xpack.actions.ssl` settings and any matching `xpack.actions.customHostSettings` entry for the server. If your server uses a certificate that is not signed by a public certificate authority, add its CA certificate to a `xpack.actions.customHostSettings` entry for the host, using `ssl.certificateAuthoritiesFiles` or `ssl.certificateAuthoritiesData`. Set the entry's `url` to `https://<host>:<port>` with the connector's host and port, for example `https://db.example.com:5432`. The `https` scheme is only a placeholder for a TLS connection. If no entry matches the host and port, the global `xpack.actions.ssl` settings apply. Otherwise the connection fails with a certificate verification error.

Set **TLS** to **Disabled** only for servers that do not support TLS.

#### Proxy [postgresql-proxy]

The connector can't be routed through an HTTP proxy. If `xpack.actions.proxyUrl` applies to the server, the connector refuses to connect instead of bypassing the proxy. Add the server name to `xpack.actions.proxyBypassHosts` to allow a direct connection.

### Test connectors [postgresql-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## PostgreSQL connector actions [postgresql-connector-actions]

The PostgreSQL connector has the following actions. A statement that runs longer than the {{kib}} connector response timeout (`xpack.actions.responseTimeout`) is canceled.

Query
:   Run a read-only SQL query against the database. The query runs in a read-only transaction. Results are limited to `maxRows` rows and to the {{kib}} maximum response size (`xpack.actions.maxResponseContentLength`), and are marked as truncated when more rows exist.
    - **sql** (required): The `SELECT` or `WITH` query to run. A `LIMIT` clause is optional. Do not include a trailing semicolon. Bind placeholders such as `$1` are not supported, so write literal values into the query.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).

List Databases
:   List the databases on the server, with owner and encoding, and whether the authenticated role can connect to each. Template databases are not listed.

List Tables
:   List the tables, views, materialized views, and foreign tables on which the role has `SELECT`, including through column-level grants, with their schema and type. A partitioned table is listed once, without its partitions. System schemas are excluded.
    - **schema** (optional): Only list objects in this schema, for example `public`.

Describe Table
:   Describe a table or view, including columns (with data types, nullability, defaults, and comments), constraints (primary key, unique, foreign key, check, and exclusion), and indexes.
    - **table** (required): The table or view name. Names are case-sensitive.
    - **schema** (optional): The schema containing the table (default: `public`).

Get Schema
:   Get every table and view in a schema together with their columns, in a single call. Columns that the role can't read are left out. For very large schemas the result is marked as truncated and the last table is left out. Use it to understand an unfamiliar database or to plan joins.
    - **schema** (optional): The schema to describe (default: `public`).

Search Rows
:   Search rows in a table by matching a search term against one or more columns, using a case-insensitive partial match. Non-text columns are compared on their text representation. The role needs `SELECT` on every column of the table.
    - **table** (required): The table to search. Names are case-sensitive.
    - **searchTerm** (required): The text to search for.
    - **columns** (required): The columns to search in. Use **Describe Table** to find them.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).
    - **schema** (optional): The schema containing the table (default: `public`).

Execute SQL _(API only)_
:   Run any SQL against the database. This action has no restrictions. You can run `INSERT`, `UPDATE`, `DELETE`, `DROP`, and data definition language (DDL) statements, and you can send several statements at once. `COPY` to or from the client (`STDIN` or `STDOUT`) is not supported. They run in a single transaction, so if one fails, none of them apply. Use it only when you explicitly need a write or destructive operation. One result is returned per statement, with at most the first 1,000 rows of each and within the {{kib}} maximum response size (`xpack.actions.maxResponseContentLength`). A result is marked as truncated when rows were left out. Agents can't use this action. Prefer **Query** for read-only access.
    - **sql** (required): The statement or statements to run.
