---
navigation_title: "Microsoft SQL Server"
type: reference
description: "Use the Microsoft SQL Server connector to query tables, search rows, explore schema, and run SQL against a SQL Server database."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Microsoft SQL Server connector [microsoft-sql-server-action-type]

Use the Microsoft SQL Server connector to query tables, search rows, and explore schema in a SQL Server database from chat conversations. The connector also provides an **Execute SQL** action for statements that change data.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

:::{include} _snippets/native-driver-memory-note.md
:::

## Requirements [microsoft-sql-server-requirements]

The connector connects to SQL Server over the native Tabular Data Stream (TDS) protocol, on port 1433 by default. It works with self-managed SQL Server and with managed services that expose SQL Server, such as Amazon RDS for SQL Server. Your {{kib}} instance must be able to reach the server, and any firewall or security group must allow the outbound IP address of your {{kib}} instance. To connect to Azure SQL Database, use the [Azure SQL connector](/reference/connectors-kibana/azure-sql-action-type.md) instead.

To use the connector, you need:

- A SQL Server instance
- A SQL Server login (a user name and password) that can access the database you want to query
- The server host name, the port, the database name, and the login credentials

This connector supports SQL Server authentication only. Windows (Kerberos) authentication and Microsoft Entra ID authentication are not supported, and named instances are not supported. Connect to a named instance by using its port.

By default, the connection is encrypted. Certificate verification follows your {{kib}} `xpack.actions.ssl` settings and any matching `xpack.actions.customHostSettings` entry for the server. The SQL Server driver can't verify the certificate chain without also checking the hostname, so the `certificate` verification mode is treated as `full` for this connector. If the server doesn't support encryption, set **TLS** (Transport Layer Security) to **Disabled** in the connector configuration.

The connector can't be routed through an HTTP proxy. If `xpack.actions.proxyUrl` applies to the server, the connector refuses to connect instead of bypassing the proxy. Add the server name to `xpack.actions.proxyBypassHosts` to allow a direct connection.

## Get connection details [microsoft-sql-server-api-credentials]

To collect the details you need:

1. Confirm the server accepts SQL Server authentication (mixed mode) and listens on a TCP port that {{kib}} can reach.
2. Create a SQL Server login and database user with the permissions you want {{kib}} to have (refer to [Database user permissions](#microsoft-sql-server-security)).
3. Note the server host name, the port, the database name, and the login credentials.

## Create connectors in {{kib}} [define-microsoft-sql-server-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [microsoft-sql-server-connector-configuration]

Microsoft SQL Server connectors have the following configuration properties:

Server
:   The host name or IP address of the SQL Server instance, for example `sql.example.com`. Do not include a protocol prefix.

Port
:   The TCP port of the server (default: 1433).

Database
:   The database the connection opens in. Queries can read other databases that the login can access by using three-part names, such as `Analytics.dbo.Orders`.

TLS
:   Whether to encrypt the connection. **Required** is the default. Select **Disabled** only for servers that don't support encryption.

Username
:   The SQL Server login to authenticate as.

Password
:   The password for the login.

## Test connectors [microsoft-sql-server-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## Microsoft SQL Server connector actions [microsoft-sql-server-connector-actions]

The Microsoft SQL Server connector has the following actions:

Query
:   Run a read-only Transact-SQL (T-SQL) query against the database. Results are limited to `maxRows` rows and to the {{kib}} maximum response size (`xpack.actions.maxResponseContentLength`), and are marked as truncated when more rows exist.
    - **sql** (required): The `SELECT` or `WITH` query to run. Use `TOP` or `OFFSET`/`FETCH` to limit results, because `LIMIT` is not valid T-SQL. Do not include a trailing semicolon.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).

List Databases
:   List the databases on the server that the login can see, with their state, compatibility level, and creation date.

List Tables
:   List the tables and views in a database, with their schema and type.
    - **database** (optional): The database to list. Defaults to the database the connector is configured for.
    - **schema** (optional): Only list objects in this schema, for example `dbo`.

Describe Table
:   Describe a table or view in the connected database, including columns, data types, nullability, defaults, primary key and unique constraints, and foreign keys.
    - **table** (required): The table or view name.
    - **schema** (optional): The schema containing the table (default: `dbo`).

Search Rows
:   Search rows in a table by matching a search term against one or more character columns, using a case-insensitive partial match.
    - **table** (required): The table to search.
    - **searchTerm** (required): The text to search for.
    - **columns** (required): The character columns to search in. Use **Describe Table** to find them.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).
    - **schema** (optional): The schema containing the table (default: `dbo`).

Execute SQL _(not yet available)_
:   Run any T-SQL statement against the database. This action has no restrictions. You can run `INSERT`, `UPDATE`, `DELETE`, `DROP`, `EXEC`, and data definition language (DDL) statements. Use it only when you explicitly need a write or destructive operation. Reaching the output cap does not cancel the statement, but the request timeout still applies. If a call times out, don't assume that no changes were made. Only the first 1,000 output rows are returned. Not exposed to AI agents; becomes usable when workflow support is added. Prefer **Query** for read-only access.
    - **sql** (required): The statement to run.

## Database user permissions [microsoft-sql-server-security]

The permissions you grant to the SQL Server login determine what the connector can do. Configure them to match your use case.

### Read-only access (recommended)

For chat conversations, use a dedicated login with read access only:

```sql
-- Run on the server
CREATE LOGIN kibana_reader WITH PASSWORD = '<password>';

-- Run in the target database
CREATE USER kibana_reader FOR LOGIN kibana_reader;
ALTER ROLE db_datareader ADD MEMBER kibana_reader;
```

To query other databases with three-part names, create a user for the login in each of those databases as well.

The **Query** action enforces read-only access in the connector by accepting only `SELECT` and `WITH` statements. It also rejects statements separated by a semicolon, and common write and session-changing forms such as `INSERT`, `UPDATE`, `DELETE`, `DROP`, `EXEC`, `SELECT ... INTO`, `BEGIN`, `SET`, and `USE`. T-SQL doesn't require a semicolon between statements, so the check can't catch every second statement. The check doesn't cover every way to change data in T-SQL, so don't rely on it alone. Use **List Tables** and **Describe Table** for schema discovery.

::::{warning}
The check in the connector is not a security guarantee. Prompt injection and similar techniques can bypass it. The only reliable protection is granting the login read-only permissions. Treat the check as defense in depth, not a substitute for least-privilege credentials.
::::

The **Execute SQL** action bypasses these restrictions and can run any statement the login is allowed to run. Do not grant write permissions unless your use case requires them.

### Broader access

If your use case requires write access, grant the appropriate permissions and scope them as narrowly as possible:

```sql
-- Example: allow reads and writes on one schema only
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::sales TO kibana_user;
```
