---
navigation_title: "Azure SQL"
type: reference
description: "Use the Azure SQL connector to query tables, search rows, explore schema, and run SQL against an Azure SQL Database."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Azure SQL connector [azure-sql-action-type]

Use the Azure SQL connector to query tables, search rows, and explore schema in an Azure SQL Database from chat conversations. The connector also provides an **Execute SQL** action for statements that change data.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

## Requirements [azure-sql-requirements]

The connector connects to Azure SQL over the native SQL Server protocol, Tabular Data Stream (TDS), on port 1433 by default, and always encrypts the connection. Your {{kib}} instance must be able to reach your Azure SQL server, and the server firewall must allow the outbound IP address of your {{kib}} instance.

To use the connector, you need:

- An Azure SQL Database
- A SQL login (a database user with a password) that can access the database you want to query
- The fully qualified server name, the database name, and the login credentials

This connector supports SQL authentication only. Microsoft Entra ID authentication is not supported. SQL authentication must be enabled on the server, which means **Support only Microsoft Entra authentication** must be cleared.

Certificate verification follows your {{kib}} `xpack.actions.ssl` settings and any matching `xpack.actions.customHostSettings` entry for the server. The SQL Server driver can't verify the certificate chain without also checking the hostname, so the `certificate` verification mode is treated as `full` for this connector.

## Get connection details [azure-sql-api-credentials]

To collect the details you need:

1. In the [Azure portal](https://portal.azure.com), go to your SQL database and copy the **Server name** from the **Overview** page (for example, `myserver.database.windows.net`).
2. Under the server's **Networking** settings, allow the outbound IP address of your {{kib}} instance.
3. Create a SQL user with the permissions you want {{kib}} to have (refer to [Database user permissions](#azure-sql-security)).
4. Note the database name and the user's credentials.

## Create connectors in {{kib}} [define-azure-sql-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [azure-sql-connector-configuration]

Azure SQL connectors have the following configuration properties:

Server
:   The fully qualified server name, for example `myserver.database.windows.net`. Do not include a protocol prefix.

Port
:   The port number of the server (default: 1433).

Database
:   The name of the database to query. Azure SQL Database cannot switch databases within a connection, so create one connector for each database.

Username
:   The SQL login to authenticate as.

Password
:   The password for the SQL login.

## Test connectors [azure-sql-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## Azure SQL connector actions [azure-sql-connector-actions]

The Azure SQL connector has the following actions:

Query
:   Run a read-only Transact-SQL (T-SQL) query against the database. Results are limited to `maxRows` rows and to the {{kib}} maximum response size (`xpack.actions.maxResponseContentLength`), and are marked as truncated when more rows exist.
    - **sql** (required): The `SELECT` or `WITH` query to run. Use `TOP` or `OFFSET`/`FETCH` to limit results, because `LIMIT` is not valid T-SQL. Do not include a trailing semicolon.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).

List Databases
:   List the databases visible to the authenticated login. When connected to a user database, this usually returns only that database and `master`.

List Tables
:   List the tables and views in the database, with their schema and type.
    - **schema** (optional): Only list objects in this schema, for example `dbo`.

Describe Table
:   Describe a table or view, including columns, data types, nullability, defaults, primary key and unique constraints, and foreign keys.
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
:   Run any T-SQL statement against the database. This action has no restrictions. You can run `INSERT`, `UPDATE`, `DELETE`, `DROP`, `EXEC`, and data definition language (DDL) statements. Use it only when you explicitly need a write or destructive operation. The statement always runs to completion, and only the first 1,000 output rows are returned. Not exposed to AI agents; becomes usable when workflow support is added. Prefer **Query** for read-only access.
    - **sql** (required): The statement to run.

## Database user permissions [azure-sql-security]

The permissions you grant to the SQL user determine what the connector can do. Configure them to match your use case.

### Read-only access (recommended)

For chat conversations, use a dedicated user with read access only:

```sql
-- Run in the target database
CREATE USER kibana_reader WITH PASSWORD = '<password>';
ALTER ROLE db_datareader ADD MEMBER kibana_reader;
```

The **Query** action enforces read-only access in the connector by accepting only `SELECT` and `WITH` statements. It also rejects multiple statements and common write forms such as `INSERT`, `UPDATE`, `DELETE`, `DROP`, `EXEC`, and `SELECT ... INTO`. The check doesn't cover every way to change data in T-SQL, so don't rely on it alone. Use **List Tables** and **Describe Table** for schema discovery.

::::{warning}
The check in the connector is not a security guarantee. Prompt injection and similar techniques can bypass it. The only reliable protection is granting the database user read-only permissions. Treat the check as defense in depth, not a substitute for least-privilege credentials.
::::

The **Execute SQL** action bypasses these restrictions and can run any statement the user is allowed to run. Do not grant write permissions unless your use case requires them.

### Broader access

If your use case requires write access, grant the appropriate permissions and scope them as narrowly as possible:

```sql
-- Example: allow reads and writes on one schema only
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::sales TO kibana_user;
```
