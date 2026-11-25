---
navigation_title: "Oracle Database"
type: reference
description: "Use the Oracle Database connector to query tables, search rows, explore schema, and run read-only SQL queries against an Oracle Database."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Oracle Database connector [oracle-action-type]

Use the Oracle Database connector to query tables, search rows, and explore schema in an Oracle Database from chat conversations.

::::{note}
This connector is available in **Agent Builder** only.
::::

:::{include} _snippets/native-driver-memory-note.md
:::

## Requirements [oracle-requirements]

The connector connects to Oracle Database over the native Oracle Net (Transport Network Substrate, TNS) protocol, on port 1521 by default. It uses the `node-oracledb` driver in Thin mode, so you don't need to install Oracle Client libraries.

The connector works with Oracle Database 12.1 or later, including self-managed databases and managed services such as Amazon RDS for Oracle. Your {{kib}} instance must be able to reach the listener, and any firewall or security group must allow the outbound IP address of your {{kib}} instance.

To use the connector, you need:

- An Oracle Database with a listener that {{kib}} can reach
- A database user (a user name and password) that can access the schemas you want to query
- The listener host name, the port, the service name, and the user credentials

The connector identifies the database by its service name, such as the name of a pluggable database. It doesn't support connecting by system identifier (SID).

By default, the connection uses Transport Layer Security (TLS) over TCPS (TCP with TLS). Certificate verification follows your {{kib}} `xpack.actions.ssl` settings and any matching `xpack.actions.customHostSettings` entry for the listener:

- If you configure a custom certificate authority for the listener in `xpack.actions.customHostSettings`, it's the only authority trusted for this connector. Otherwise the standard public certificate authorities are trusted.
- The `full` verification mode checks the certificate chain and that the server host name matches the certificate. The `certificate` mode checks the chain only.
- The Oracle driver doesn't support the `none` verification mode. The connector verifies the certificate as in `full` mode instead.
- The connector doesn't support client certificates (mutual TLS).

If the listener doesn't support TCPS, set **TLS** to **Disabled** in the connector configuration.

You can't route the connector through an HTTP proxy. If `xpack.actions.proxyUrl` applies to the listener, the connector refuses to connect instead of bypassing the proxy. Add the host name to `xpack.actions.proxyBypassHosts` to allow a direct connection.

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
:   The host name or IP address of the Oracle listener, for example `oracle.example.com`. Don't include a protocol prefix.

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

While you create or edit the connector in {{kib}}, select **Test** in the connector flyout to check the connection.

## Oracle Database connector actions [oracle-connector-actions]

The Oracle Database connector has the following actions:

Query
:   Run a read-only SQL query against the database. The action returns at most `maxRows` rows, stops at the {{kib}} maximum response size (`xpack.actions.maxResponseContentLength`), and marks the result as truncated when more rows exist. Refer to [Query result formats](#oracle-query-results) for how it returns dates and large objects.
    - **sql** (required): The `SELECT` or `WITH` query to run. Use `FETCH FIRST n ROWS ONLY` to limit results, because `LIMIT` is not valid in Oracle SQL. Don't include a trailing semicolon.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).

List Schemas
:   List the schemas (database users) visible to the connected user, with their creation date. The list includes Oracle-maintained schemas such as `SYS` and `SYSTEM`.

List Tables
:   List the tables and views in a schema that the connected user can see, with their type.
    - **schema** (optional): The schema to list. Defaults to the schema of the connected user.

Describe Table
:   Describe a table or view, including columns, data types, nullability, defaults, primary key and unique constraints, and foreign keys.
    - **table** (required): The table or view name. The connector matches the name as written first, then in uppercase.
    - **schema** (optional): The schema containing the table. Defaults to the schema of the connected user.

Search Rows
:   Search rows in a table by matching a search term against one or more columns, using a case-insensitive partial match.
    - **table** (required): The table to search.
    - **searchTerm** (required): The text to search for.
    - **columns** (required): The columns to search in. Use **Describe Table** to find them.
    - **maxRows** (optional): Maximum number of rows to return (1 to 1,000, default: 100).
    - **schema** (optional): The schema containing the table. Defaults to the schema of the connected user.

### Query result formats [oracle-query-results]

The **Query** and **Search Rows** actions return values as follows:

- `DATE` and `TIMESTAMP` values are wall-clock strings without a time zone, such as `2026-01-02T03:04:05`.
- Timestamps with a time zone are UTC instants that end in `Z`.
- If the {{kib}} host's time zone observes daylight saving time, a `DATE` or `TIMESTAMP` value in the skipped hour of the spring clock change doesn't exist in that zone. The action returns it one hour later than stored.
- Text large object (LOB) values are cut at 10,000 characters.
- Binary LOB values are described, not returned.

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
-- Run as a privileged user
CREATE USER kibana_reader IDENTIFIED BY "<password>";
GRANT CREATE SESSION TO kibana_reader;
GRANT SELECT ON hr.employees TO kibana_reader;
GRANT SELECT ON hr.departments TO kibana_reader;
```

Grant `SELECT` on each table or view you want the connector to see. The schema discovery actions only list objects the user can access.

The **Query** action enforces read-only access in two ways:

- It accepts only `SELECT` and `WITH` statements. It rejects statements separated by a semicolon, `SELECT ... FOR UPDATE`, inline `WITH FUNCTION` or `WITH PROCEDURE` declarations, database links, and the `UTL_*` and `DBMS_*` packages.
- It runs each query in a read-only transaction, so Oracle rejects data changes made by the query itself. If a query reads a table right after a schema change to that table, the connector retries it.

Neither measure stops a function that the user is allowed to run from changing data, for example one that runs as an autonomous transaction.

::::{warning}
The checks in the connector aren't a security guarantee. Prompt injection and similar techniques can bypass them. The only reliable protection is granting the user read-only privileges. Treat the checks as defense in depth, not a substitute for least-privilege credentials.
::::

<!-- Restore with the Execute SQL action when workflow support is added.
The **Execute SQL** action bypasses these restrictions and can run any statement the user is allowed to run. Don't grant write privileges unless your use case requires them.

### Broader access

If your use case requires write access, grant the appropriate privileges and scope them as narrowly as possible:

```sql
-- Example: allow reads and writes on one table only
GRANT SELECT, INSERT, UPDATE, DELETE ON hr.employees TO kibana_user;
```
-->
