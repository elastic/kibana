---
navigation_title: "Oracle Database"
type: reference
description: "Use the Oracle Database connector to query tables, search rows, explore schema, and run SQL against an Oracle Database."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Oracle Database connector [oracle-action-type]

Use the Oracle Database connector to query tables, search rows, and explore schema in an Oracle Database from chat conversations.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release.
::::

:::{include} _snippets/native-driver-memory-note.md
:::

## Requirements [oracle-requirements]

The connector connects to Oracle Database over the native Oracle Net (TNS) protocol, on port 1521 by default, using the `node-oracledb` driver in Thin mode. You don't need to install Oracle Client libraries. It works with Oracle Database 12.1 or later, including self-managed databases and managed services such as Amazon RDS for Oracle. Your {{kib}} instance must be able to reach the listener, and any firewall or security group must allow the outbound IP address of your {{kib}} instance.

To use the connector, you need:

- An Oracle Database with a listener that {{kib}} can reach
- A database user (a user name and password) that can access the schemas you want to query
- The listener host name, the port, the service name, and the user credentials

The database is identified by its service name, such as the name of a pluggable database. Connecting by SID is not supported.

By default, the connection uses TLS over TCPS. Certificate verification follows your {{kib}} `xpack.actions.ssl` settings and any matching `xpack.actions.customHostSettings` entry for the listener:

- If you configure a custom certificate authority for the listener in `xpack.actions.customHostSettings`, it's the only authority trusted for this connector. Otherwise the standard public certificate authorities are trusted.
- The `full` verification mode checks the certificate chain and that the server host name matches the certificate. The `certificate` mode checks the chain only.
- The `none` verification mode is not supported by the Oracle driver. The connector verifies the certificate as in `full` mode instead.
- Client certificates (mutual TLS) are not supported.

If the listener doesn't support TCPS, set **TLS** (Transport Layer Security) to **Disabled** in the connector configuration.

The connector can't be routed through an HTTP proxy. If `xpack.actions.proxyUrl` applies to the listener, the connector refuses to connect instead of bypassing the proxy. Add the host name to `xpack.actions.proxyBypassHosts` to allow a direct connection.

## Get connection details [oracle-api-credentials]

To collect the details you'll need to configure the connection:

1. Confirm the database has a listener on a TCP port that {{kib}} can reach, and note the service name it registers (for example, from `SELECT SYS_CONTEXT('USERENV', 'SERVICE_NAME') FROM DUAL`).
2. Create a database user with the permissions you want {{kib}} to have (refer to [Database user permissions](#oracle-security)).
3. Note the host name, the port, the service name, and the user credentials.

## Create connectors in {{kib}} [define-oracle-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [oracle-connector-configuration]

Oracle Database connectors have the following configuration properties:

Host
:   The host name or IP address of the Oracle listener, for example `oracle.example.com`. Do not include a protocol prefix.

Port
:   The port of the listener (default: 1521).

Service name
:   The service name to connect to, for example `ORCLPDB1`.

TLS
:   Whether to connect over TCPS. **Required** is the default. Select **Disabled** only for listeners that don't support TCPS.

Username
:   The database user to authenticate as.

Password
:   The password for the user.

### Test connectors [oracle-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## Oracle Database connector actions [oracle-connector-actions]

The Oracle Database connector has the following actions:

Query
:   Run a read-only SQL query against the database. Results are limited to `maxRows` rows and to the {{kib}} maximum response size (`xpack.actions.maxResponseContentLength`), and are marked as truncated when more rows exist. `DATE` and `TIMESTAMP` values are returned as wall-clock strings without a time zone, such as `2026-01-02T03:04:05`. Timestamps with a time zone are returned as UTC instants that end in `Z`. Text LOB values are cut at 10,000 characters, and binary LOB values are described rather than returned.
    - **sql** (required): The `SELECT` or `WITH` query to run. Use `FETCH FIRST n ROWS ONLY` to limit results, because `LIMIT` is not valid in Oracle SQL. Do not include a trailing semicolon.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).

List Schemas
:   List the schemas (database users) visible to the connected user, with their creation date. The list includes Oracle-maintained schemas such as `SYS` and `SYSTEM`.

List Tables
:   List the tables and views in a schema that the connected user can see, with their type.
    - **schema** (optional): The schema to list. Defaults to the schema of the connected user.

Describe Table
:   Describe a table or view, including columns, data types, nullability, defaults, primary key and unique constraints, and foreign keys.
    - **table** (required): The table or view name. Matched as written first, then in upper case.
    - **schema** (optional): The schema containing the table. Defaults to the schema of the connected user.

Search Rows
:   Search rows in a table by matching a search term against one or more columns, using a case-insensitive partial match.
    - **table** (required): The table to search.
    - **searchTerm** (required): The text to search for.
    - **columns** (required): The columns to search in. Use **Describe Table** to find them.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).
    - **schema** (optional): The schema containing the table. Defaults to the schema of the connected user.

<!-- Restore when workflow support is added.
Execute SQL _(not yet available)_
:   Run any SQL or PL/SQL statement against the database and commit it on success. This action has no restrictions. You can run `INSERT`, `UPDATE`, `DELETE`, `DROP`, PL/SQL blocks, and data definition language (DDL) statements. Use it only when you explicitly need a write or destructive operation. If a call times out, don't assume that no changes were made. Only the first 1,000 output rows are returned. Not exposed to AI agents; becomes usable when workflow support is added. Prefer **Query** for read-only access.
    - **sql** (required): The statement to run.
-->

## Database user permissions [oracle-security]

The privileges you grant to the database user determine what the connector can do. Configure them to match your use case.

### Read-only access (recommended)

For chat conversations, use a dedicated user with read access only:

```sql
-- Run as a DBA
CREATE USER kibana_reader IDENTIFIED BY "<password>";
GRANT CREATE SESSION TO kibana_reader;
GRANT SELECT ON hr.employees TO kibana_reader;
GRANT SELECT ON hr.departments TO kibana_reader;
```

Grant `SELECT` on each table or view you want the connector to see. The schema discovery actions only list objects the user can access.

The **Query** action enforces read-only access in two ways. The connector accepts only `SELECT` and `WITH` statements, and rejects statements separated by a semicolon, `SELECT ... FOR UPDATE`, inline `WITH FUNCTION` or `WITH PROCEDURE` declarations, database links, and the `UTL_*` and `DBMS_*` packages. The connector also runs each query in a read-only transaction, so Oracle rejects data changes made by the query itself. A query that reads a table within a second or two of a schema change to it is retried automatically. Neither measure stops a function that the user is allowed to run from changing data, for example one that runs as an autonomous transaction, so don't rely on them alone. Use **List Tables** and **Describe Table** for schema discovery.

::::{warning}
The checks in the connector are not a security guarantee. Prompt injection and similar techniques can bypass them. The only reliable protection is granting the user read-only privileges. Treat the checks as defense in depth, not a substitute for least-privilege credentials.
::::

<!-- Restore with the Execute SQL action when workflow support is added.
The **Execute SQL** action bypasses these restrictions and can run any statement the user is allowed to run. Do not grant write privileges unless your use case requires them.

### Broader access

If your use case requires write access, grant the appropriate privileges and scope them as narrowly as possible:

```sql
-- Example: allow reads and writes on one table only
GRANT SELECT, INSERT, UPDATE, DELETE ON hr.employees TO kibana_user;
```
-->
