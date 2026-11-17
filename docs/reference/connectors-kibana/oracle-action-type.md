---
navigation_title: "Oracle Database"
type: reference
description: "Use the Oracle Database connector to query, explore schema, and run SQL against an Oracle database."
applies_to:
  stack: preview 9.7
  serverless: preview
---

# Oracle Database connector [oracle-action-type]

The Oracle Database connector connects directly to an Oracle database so you can search, query, and explore schemas from chat conversations.

::::{note}
This connector is currently available in **Agent Builder** only. Workflow support is planned for a future release. Actions marked _(not yet available)_ are not exposed to agents. Until workflow support is added, you can only run them through the [Run a connector](https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-actions-connector-id-execute) API.
::::

:::{include} _snippets/native-driver-memory-note.md
:::

## Requirements [oracle-requirements]

The Oracle Database connector connects directly to the Oracle listener over Oracle Net (default port 1521). It doesn't need Oracle Client libraries. Your database must be network-accessible from your {{kib}} instance, and connections can't be routed through a forward proxy. TLS (TCPS) is required by default.

To use the Oracle Database connector, you need:

1. An Oracle Database, version 12.1 or later, with a listener reachable from your {{kib}} instance.
2. A database user with the `CREATE SESSION` privilege and access to the schemas you want to query.
3. The listener hostname and port, the service name, and the user credentials.

## Get connection details [oracle-api-credentials]

To configure the connector:

1. Identify the hostname or IP address and the port of the Oracle listener.
2. Find the service name the listener exposes, for example the pluggable database service. System identifiers (SIDs) aren't supported.
3. Create a database user with the appropriate permissions for your use case (see [Database user permissions](#oracle-security)).

## Create connectors in {{kib}} [define-oracle-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [oracle-connector-configuration]

Oracle Database connectors have the following configuration properties:

Host
:   The hostname or IP address of the Oracle listener (for example, `oracle.example.com`). Wrap an IPv6 address in square brackets. Don't include a protocol prefix, port, or path.

Port
:   The port of the Oracle listener (default: 1521).

Service name
:   The service name to connect to (for example, `ORCLPDB1`).

Username
:   The database user to authenticate as.

Password
:   The password for the database user.

TLS
:   Whether to connect over TCPS. **Required** (default) uses {{kib}} TLS settings. Use **Disabled** only for listeners that don't offer TCPS.

## Test connectors [oracle-action-configuration]

You can test connectors as you're creating or editing the connector in {{kib}}.

## Oracle Database connector actions [oracle-connector-actions]

The Oracle Database connector has the following actions:

Query
:   Run a read-only SQL query against the database. Oracle has no `LIMIT` clause; use `FETCH FIRST n ROWS ONLY` to bound the result.
    - **sql** (required): The `SELECT` or `WITH` query to run. Do not include a trailing semicolon.
    - **maxRows** (optional): Maximum number of rows to return (1-1000, default: 100). The result reports `truncated: true` when more rows exist.

List Schemas
:   List the schemas visible to the authenticated user, excluding Oracle-maintained schemas.

List Tables
:   List the tables and views in a schema.
    - **owner** (optional): The schema name. Uses the schema of the connected user if omitted.

Describe Table
:   Describe a table or view, including column names, data types, nullability, and primary key, unique, and foreign key constraints.
    - **table** (required): The table or view name, as returned by **List Tables**. Names are usually uppercase.
    - **owner** (optional): The schema name. Uses the schema of the connected user if omitted.

Search Rows
:   Search rows in a table by matching a search term against specified columns.
    - **table** (required): The table to search.
    - **searchTerm** (required): The text to search for.
    - **columns** (required): Array of column names to search in. Use **Describe Table** to discover available columns.
    - **maxRows** (optional): Maximum number of rows to return (1-1000, default: 100).
    - **owner** (optional): The schema name. Uses the schema of the connected user if omitted.

Execute SQL _(not yet available)_
:   Run any single SQL or PL/SQL statement and commit it. No restrictions: `INSERT`, `UPDATE`, `DELETE`, `DROP`, DDL, and PL/SQL blocks are all permitted. Use only when a write or destructive operation is explicitly required. Not exposed to AI agents; becomes usable when workflow support is added. Use **Query** for read-only access.
    - **sql** (required): The SQL or PL/SQL statement to execute.

## Database user permissions [oracle-security]

The permissions you grant to the database user determine what the connector can do. Configure them to match your intended use case.

### Read-only chat use case (recommended)

For chat conversations, where the goal is to query and explore data, use a dedicated user with only `CREATE SESSION` and `SELECT` access to the objects you want to expose. This provides the strongest protection against unintended modifications.

```sql
-- Create a read-only user and grant SELECT on specific tables
CREATE USER kibana_reader IDENTIFIED BY "<password>";
GRANT CREATE SESSION TO kibana_reader;
GRANT SELECT ON hr.employees TO kibana_reader;
GRANT SELECT ON hr.departments TO kibana_reader;
```

The **Query** action accepts only `SELECT` and `WITH` statements, blocks multi-statement input, `FOR UPDATE`, and calls to `DBMS_*` and `UTL_*` packages, and runs inside a read-only transaction, so the database rejects any data change the statement attempts.

::::{note}
The application-level read-only checks are not a security guarantee. Prompt injection and other techniques might craft inputs that bypass them, for example through a function that writes in an autonomous transaction. The only reliable protection is granting the database user read-only permissions. Application-level enforcement is a defense-in-depth measure, not a substitute for least-privilege credentials.
::::

Objects the user can see determine what **List Schemas**, **List Tables**, and **Describe Table** return, because they read the `ALL_*` data dictionary views.

### Broader access

If your use case requires write access, grant the appropriate privileges to the database user. Scope permissions as narrowly as possible. **Execute SQL** bypasses the read-only checks and can run any statement the user is allowed to.

```sql
-- Example: grant read/write access to one table
GRANT SELECT, INSERT, UPDATE, DELETE ON hr.employees TO kibana_user;
```
